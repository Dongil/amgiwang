import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const deckId = formData.get("deckId") as string | null;

    if (!file || !deckId) {
      return NextResponse.json({ error: "파일과 덱 ID가 필요합니다." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "PDF 파일만 지원합니다." }, { status: 400 });
    }

    // PDF 텍스트 추출 (pdfjs-dist)
    const arrayBuffer = await file.arrayBuffer();
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const totalPages = pdf.numPages;

    const pages: { pageNum: number; text: string }[] = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item: unknown) => {
          const textItem = item as { str?: string };
          return textItem.str ?? "";
        })
        .join(" ");
      pages.push({ pageNum: i, text });
    }

    // 페이지 분류
    const classified = classifyPages(pages);

    // Supabase Storage에 업로드
    const fileName = `${user.id}/${deckId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(fileName, file);

    let fileUrl = "";
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from("pdfs").getPublicUrl(fileName);
      fileUrl = urlData.publicUrl;
    }

    // pdf_uploads 레코드 생성
    const { error: insertError } = await supabase.from("pdf_uploads").insert({
      user_id: user.id,
      deck_id: deckId,
      file_name: file.name,
      file_url: fileUrl,
      file_size: file.size,
      page_count: totalPages,
      status: "completed",
    });

    if (insertError) {
      console.error("pdf_uploads insert error:", insertError);
    }

    return NextResponse.json({
      totalPages,
      pages: classified,
      fileUrl,
    });
  } catch (err) {
    console.error("pdf parse error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PDF 파싱 실패" },
      { status: 500 }
    );
  }
}

interface ClassifiedPage {
  pageNum: number;
  text: string;
  type: "toc" | "vocab" | "quiz" | "plan" | "other";
  dayNumber?: number;
}

function classifyPages(
  pages: { pageNum: number; text: string }[]
): ClassifiedPage[] {
  return pages.map(({ pageNum, text }) => {
    // 목차 감지: DAY와 페이지번호가 반복
    const tocPattern = /DAY\s*\d+\s*\[?\d+-\d+\]?/gi;
    const tocMatches = text.match(tocPattern);
    if (tocMatches && tocMatches.length >= 3) {
      return { pageNum, text, type: "toc" as const };
    }

    // 단어 페이지 감지: 4자리 단어번호 + 별 패턴
    const vocabPattern = /\d{4}\s*★/g;
    const vocabMatches = text.match(vocabPattern);
    if (vocabMatches && vocabMatches.length >= 2) {
      // Day 번호 추출
      const dayMatch = text.match(/DAY\s*(\d+)/i);
      const dayNumber = dayMatch ? parseInt(dayMatch[1]) : undefined;
      return { pageNum, text, type: "vocab" as const, dayNumber };
    }

    // 학습 플랜 감지
    if (/회독|학습\s*플랜/i.test(text)) {
      return { pageNum, text, type: "plan" as const };
    }

    // Daily Quiz 감지
    if (/알맞은\s*(유의어|뜻)|밑줄\s*친\s*단어|Daily\s*Quiz/i.test(text)) {
      return { pageNum, text, type: "quiz" as const };
    }

    return { pageNum, text, type: "other" as const };
  });
}
