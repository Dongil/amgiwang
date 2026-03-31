import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseWordMasterText } from "@/lib/wordmaster/parser";

// PDF 텍스트는 클라이언트에서 pdfjs로 추출 후 전송
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const text = (body as { text?: string }).text;

    if (!text || text.length < 100) {
      return NextResponse.json(
        { error: "PDF 텍스트가 필요합니다" },
        { status: 400 }
      );
    }

    const result = parseWordMasterText(text);

    return NextResponse.json({
      totalDays: result.totalDays,
      totalWords: result.totalWords,
      sample: result.entries.filter((e) => e.dayNumber <= 2),
      errors: result.errors.slice(0, 20),
      entries: result.entries,
    });
  } catch (e) {
    console.error("[wordmaster/parse]", e);
    return NextResponse.json(
      { error: `파싱 실패: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}
