import { NextResponse } from "next/server";
import { createAIClient } from "@/lib/ai/provider";
import type { AIProvider } from "@/types/database";

export async function POST(request: Request) {
  try {
    const { provider, apiKey } = (await request.json()) as {
      provider: AIProvider;
      apiKey: string;
    };

    if (!provider || !apiKey) {
      return NextResponse.json({ error: "프로바이더와 API 키가 필요합니다." }, { status: 400 });
    }

    const client = createAIClient(provider, apiKey);
    const result = await client.generate({
      messages: [{ role: "user", content: "Say 'OK' in one word." }],
      maxTokens: 10,
    });

    if (result) {
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json({ valid: false, error: "응답이 비어있습니다." });
  } catch (err) {
    return NextResponse.json(
      { valid: false, error: err instanceof Error ? err.message : "API 키 검증 실패" },
      { status: 400 }
    );
  }
}
