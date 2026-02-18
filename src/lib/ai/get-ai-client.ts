import { createClient } from "@/lib/supabase/server";
import { createAIClient, type AIClient } from "./provider";
import type { AIProvider, AISettings } from "@/types/database";

/** 인증된 유저의 AI 설정을 조회하고 AIClient를 생성 */
export async function getAIClient(): Promise<{
  client: AIClient;
  error?: never;
} | {
  client?: never;
  error: string;
}> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "인증이 필요합니다." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("ai_provider, ai_settings")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "프로필을 찾을 수 없습니다." };
  }

  const provider = profile.ai_provider as AIProvider;
  const settings = (profile.ai_settings || {}) as AISettings;
  const providerConfig = settings[provider];

  if (!providerConfig?.apiKey) {
    return { error: `${provider} API 키가 설정되지 않았습니다. 설정 > AI 설정에서 API 키를 등록해주세요.` };
  }

  try {
    const client = createAIClient(provider, providerConfig.apiKey, providerConfig.model);
    return { client };
  } catch (err) {
    return { error: `AI 클라이언트 생성 실패: ${err instanceof Error ? err.message : String(err)}` };
  }
}
