import { NextResponse } from "next/server";
import { getAIClient } from "@/lib/ai/get-ai-client";
import { quizChoicesPrompt } from "@/lib/ai/prompts";

export async function POST(request: Request) {
  try {
    const { correctAnswer, context, quizType, otherWords } = (await request.json()) as {
      correctAnswer: string;
      context: string;
      quizType: string;
      otherWords?: string[];
    };

    if (!correctAnswer || !context) {
      return NextResponse.json({ error: "정답과 문맥이 필요합니다." }, { status: 400 });
    }

    const aiResult = await getAIClient();
    if ("error" in aiResult) {
      return NextResponse.json({ error: aiResult.error }, { status: 401 });
    }

    const messages = quizChoicesPrompt(correctAnswer, context, quizType, otherWords);

    const result = await aiResult.client.generate({
      messages,
      temperature: 0.7,
      maxTokens: 512,
      jsonMode: true,
    });

    const parsed = JSON.parse(result);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("generate-quiz error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "퀴즈 생성 실패" },
      { status: 500 }
    );
  }
}
