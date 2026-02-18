import { NextResponse } from "next/server";
import { getAIClient } from "@/lib/ai/get-ai-client";
import { vocabFromTextPrompt, vocabFromPdfPrompt } from "@/lib/ai/prompts";
import { safeJsonParse } from "@/lib/ai/json-repair";

/** PDF 텍스트를 단어번호 패턴(0001 ★) 기준으로 청크 분할 */
function splitTextIntoChunks(text: string, maxWordsPerChunk: number = 10): string[] {
  // 단어번호+별 패턴으로 각 단어 블록 시작점 찾기
  const wordPattern = /(?=\d{4}\s*★)/g;
  const matches = [...text.matchAll(wordPattern)];

  if (matches.length === 0) {
    // 패턴이 없으면 전체를 하나의 청크로
    return [text];
  }

  // DAY 헤더 (첫 번째 단어 앞 텍스트)
  const header = text.substring(0, matches[0].index || 0);

  const chunks: string[] = [];
  for (let i = 0; i < matches.length; i += maxWordsPerChunk) {
    const start = matches[i].index!;
    const end = i + maxWordsPerChunk < matches.length
      ? matches[i + maxWordsPerChunk].index!
      : text.length;
    // 각 청크에 DAY 헤더 포함
    chunks.push(header + text.substring(start, end));
  }

  return chunks;
}

export async function POST(request: Request) {
  try {
    const { text, dayLabel, mode = "text" } = (await request.json()) as {
      text: string;
      dayLabel?: string;
      mode?: "text" | "pdf";
    };

    if (!text?.trim()) {
      return NextResponse.json({ error: "텍스트가 필요합니다." }, { status: 400 });
    }

    const aiResult = await getAIClient();
    if ("error" in aiResult) {
      return NextResponse.json({ error: aiResult.error }, { status: 401 });
    }

    // PDF 모드: 청크 분할 후 배치 처리
    if (mode === "pdf" && dayLabel) {
      const chunks = splitTextIntoChunks(text, 10);
      const allCards: unknown[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunkLabel = chunks.length > 1
          ? `${dayLabel} (${i + 1}/${chunks.length})`
          : dayLabel;

        const messages = vocabFromPdfPrompt(chunks[i], dayLabel);
        const result = await aiResult.client.generate({
          messages,
          temperature: 0.3,
          maxTokens: 8192,
          jsonMode: true,
        });

        if (!result?.trim()) continue;

        try {
          const parsed = safeJsonParse(result) as { cards?: unknown[] };
          if (parsed.cards?.length) {
            allCards.push(...parsed.cards);
          }
        } catch (parseErr) {
          console.error(`generate-vocab chunk ${chunkLabel} parse error:`, parseErr);
          // 청크 하나 실패해도 계속 진행
        }
      }

      return NextResponse.json({ cards: allCards });
    }

    // 텍스트 모드: 단일 호출
    const messages = vocabFromTextPrompt(text);
    const result = await aiResult.client.generate({
      messages,
      temperature: 0.3,
      maxTokens: 8192,
      jsonMode: true,
    });

    if (!result?.trim()) {
      return NextResponse.json(
        { error: "AI 응답이 비어있습니다. 다시 시도해주세요." },
        { status: 502 }
      );
    }

    const parsed = safeJsonParse(result);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("generate-vocab error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "단어 생성 실패" },
      { status: 500 }
    );
  }
}
