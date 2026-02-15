import { NextResponse } from "next/server";
import { getAIClient } from "@/lib/ai/get-ai-client";
import { mnemonicPrompt } from "@/lib/ai/prompts";

export async function POST(request: Request) {
  try {
    const { word, meaning } = (await request.json()) as {
      word: string;
      meaning: string;
    };

    if (!word?.trim() || !meaning?.trim()) {
      return NextResponse.json({ error: "단어와 뜻이 필요합니다." }, { status: 400 });
    }

    const aiResult = await getAIClient();
    if ("error" in aiResult) {
      return NextResponse.json({ error: aiResult.error }, { status: 401 });
    }

    const messages = mnemonicPrompt(word, meaning);

    const result = await aiResult.client.generate({
      messages,
      temperature: 0.8,
      maxTokens: 512,
      jsonMode: true,
    });

    const parsed = JSON.parse(result);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("generate-mnemonic error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "니모닉 생성 실패" },
      { status: 500 }
    );
  }
}
