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

export function createAIClient(provider: AIProvider, apiKey: string): AIClient {
  switch (provider) {
    case "gemini":
      return createGeminiClient(apiKey);
    case "openai":
      return createOpenAIClient(apiKey);
    case "claude":
      return createClaudeClient(apiKey);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

function createGeminiClient(apiKey: string): AIClient {
  return {
    async generate({ messages, temperature = 0.7, maxTokens = 4096, jsonMode }) {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          ...(jsonMode && { responseMimeType: "application/json" }),
        },
      });

      // Gemini doesn't have system role in same way; prepend system as first user context
      const systemMsg = messages.find((m) => m.role === "system");
      const chatMessages = messages.filter((m) => m.role !== "system");

      const parts: { role: string; parts: { text: string }[] }[] = [];
      for (const msg of chatMessages) {
        parts.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }

      const chat = model.startChat({
        history: parts.slice(0, -1),
        ...(systemMsg && { systemInstruction: systemMsg.content }),
      });

      const lastMsg = chatMessages[chatMessages.length - 1];
      const result = await chat.sendMessage(lastMsg.content);
      return result.response.text();
    },
  };
}

function createOpenAIClient(apiKey: string): AIClient {
  return {
    async generate({ messages, temperature = 0.7, maxTokens = 4096, jsonMode }) {
      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({ apiKey });

      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature,
        max_tokens: maxTokens,
        ...(jsonMode && { response_format: { type: "json_object" } }),
      });

      return response.choices[0]?.message?.content ?? "";
    },
  };
}

function createClaudeClient(apiKey: string): AIClient {
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
        model: "claude-sonnet-4-20250514",
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
