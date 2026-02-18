import type { AIProvider } from "@/types/database";

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIGenerateOptions {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface AIClient {
  generate(options: AIGenerateOptions): Promise<string>;
}

export const PROVIDER_MODELS: Record<AIProvider, { id: string; name: string }[]> = {
  gemini: [
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (무료, 빠름)" },
    { id: "gemini-2.5-flash-preview-05-20", name: "Gemini 2.5 Flash (고성능)" },
    { id: "gemini-2.5-pro-preview-05-06", name: "Gemini 2.5 Pro (최고 성능)" },
  ],
  openai: [
    { id: "gpt-4o-mini", name: "GPT-4o Mini (가성비)" },
    { id: "gpt-4o", name: "GPT-4o (고성능)" },
    { id: "o3-mini", name: "o3-mini (추론)" },
  ],
  claude: [
    { id: "claude-haiku-4-5-20251001", name: "Haiku 4.5 (빠름, 저렴)" },
    { id: "claude-sonnet-4-5-20250929", name: "Sonnet 4.5 (균형)" },
    { id: "claude-opus-4-6", name: "Opus 4.6 (최고 성능)" },
  ],
};

export function getDefaultModel(provider: AIProvider): string {
  return PROVIDER_MODELS[provider][0].id;
}

export function createAIClient(provider: AIProvider, apiKey: string, model?: string): AIClient {
  const resolvedModel = model || getDefaultModel(provider);

  switch (provider) {
    case "gemini":
      return createGeminiClient(apiKey, resolvedModel);
    case "openai":
      return createOpenAIClient(apiKey, resolvedModel);
    case "claude":
      return createClaudeClient(apiKey, resolvedModel);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

function createGeminiClient(apiKey: string, model: string): AIClient {
  return {
    async generate({ messages, temperature = 0.7, maxTokens = 4096, jsonMode }) {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);

      const systemMsg = messages.find((m) => m.role === "system");
      const chatMessages = messages.filter((m) => m.role !== "system");

      // systemInstruction은 모델 생성 시 설정 (startChat이 아닌 여기서)
      const genModel = genAI.getGenerativeModel({
        model,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          ...(jsonMode && { responseMimeType: "application/json" }),
        },
        ...(systemMsg && {
          systemInstruction: { role: "system", parts: [{ text: systemMsg.content }] },
        }),
      });

      const parts: { role: string; parts: { text: string }[] }[] = [];
      for (const msg of chatMessages) {
        parts.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }

      const chat = genModel.startChat({
        history: parts.slice(0, -1),
      });

      const lastMsg = chatMessages[chatMessages.length - 1];
      const result = await chat.sendMessage(lastMsg.content);
      return result.response.text();
    },
  };
}

function createOpenAIClient(apiKey: string, model: string): AIClient {
  return {
    async generate({ messages, temperature = 0.7, maxTokens = 4096, jsonMode }) {
      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({ apiKey });

      const response = await client.chat.completions.create({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature,
        max_tokens: maxTokens,
        ...(jsonMode && { response_format: { type: "json_object" } }),
      });

      return response.choices[0]?.message?.content ?? "";
    },
  };
}

function createClaudeClient(apiKey: string, model: string): AIClient {
  return {
    async generate({ messages, temperature = 0.7, maxTokens = 4096 }) {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey });

      const systemMsg = messages.find((m) => m.role === "system");
      const chatMessages = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        ...(systemMsg && { system: systemMsg.content }),
        messages: chatMessages,
      });

      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock?.text ?? "";
    },
  };
}
