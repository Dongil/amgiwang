import { NextResponse } from "next/server";
import { createAIClient } from "@/lib/ai/provider";
import type { AIProvider } from "@/types/database";

export async function POST(request: Request) {
  try {
    const { provider, apiKey, model } = (await request.json()) as {
      provider: AIProvider;
      apiKey: string;
      model?: string;
    };

    if (!provider || !apiKey) {
      return NextResponse.json({ error: "프로바이더와 API 키가 필요합니다." }, { status: 400 });
    }

    const client = createAIClient(provider, apiKey, model);
    const result = await client.generate({
      messages: [{ role: "user", content: "Say 'OK' in one word." }],
      maxTokens: 10,
    });

    if (result) {
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json({ valid: false, error: "응답이 비어있습니다." });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // 키는 유효하지만 잔액/결제 문제인 경우
    if (message.includes("credit balance") || message.includes("billing") || message.includes("quota")) {
      return NextResponse.json({ valid: true, warning: "키는 유효하지만 잔액이 부족합니다. 결제 설정을 확인하세요." });
    }

    // 인증 실패 (잘못된 키)
    if (message.includes("401") || message.includes("authentication") || message.includes("invalid") || message.includes("Incorrect API")) {
      return NextResponse.json({ valid: false, error: "API 키가 유효하지 않습니다." }, { status: 400 });
    }

    return NextResponse.json(
      { valid: false, error: message },
      { status: 400 }
    );
  }
}
