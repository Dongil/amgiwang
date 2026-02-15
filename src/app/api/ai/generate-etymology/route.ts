import { NextResponse } from "next/server";
import { getAIClient } from "@/lib/ai/get-ai-client";
import { etymologyPrompt } from "@/lib/ai/prompts";

export async function POST(request: Request) {
  try {
    const { word } = (await request.json()) as { word: string };

    if (!word?.trim()) {
      return NextResponse.json({ error: "단어가 필요합니다." }, { status: 400 });
    }

    const aiResult = await getAIClient();
    if ("error" in aiResult) {
      return NextResponse.json({ error: aiResult.error }, { status: 401 });
    }

    const messages = etymologyPrompt(word);

    const result = await aiResult.client.generate({
      messages,
      temperature: 0.3,
      maxTokens: 1024,
      jsonMode: true,
    });

    const parsed = JSON.parse(result);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("generate-etymology error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "어원 분석 실패" },
      { status: 500 }
    );
  }
}
