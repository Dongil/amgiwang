import { NextResponse } from "next/server";
import { getAIClient } from "@/lib/ai/get-ai-client";
import { vocabFromTextPrompt, vocabFromPdfPrompt } from "@/lib/ai/prompts";

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

    const messages =
      mode === "pdf" && dayLabel
        ? vocabFromPdfPrompt(text, dayLabel)
        : vocabFromTextPrompt(text);

    const result = await aiResult.client.generate({
      messages,
      temperature: 0.3,
      maxTokens: 8192,
      jsonMode: true,
    });

    const parsed = JSON.parse(result);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("generate-vocab error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "단어 생성 실패" },
      { status: 500 }
    );
  }
}
