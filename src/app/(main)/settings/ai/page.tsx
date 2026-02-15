"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { supabaseMutate } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check, Loader2, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import type { AIProvider } from "@/types/database";

const PROVIDERS: { id: AIProvider; name: string; description: string }[] = [
  { id: "gemini", name: "Gemini", description: "Google AI, 무료 티어 넉넉" },
  { id: "openai", name: "OpenAI", description: "GPT-4o-mini, 가성비" },
  { id: "claude", name: "Claude", description: "심층 분석에 강점" },
];

export default function AISettingsPage() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [provider, setProvider] = useState<AIProvider>(profile?.ai_provider ?? "gemini");
  const [apiKey, setApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<"valid" | "invalid" | null>(null);

  async function handleValidate() {
    const keyToTest = apiKey.trim() || profile?.ai_api_key_encrypted;
    if (!keyToTest) {
      toast.error("API 키를 입력해주세요.");
      return;
    }
    setIsValidating(true);
    setValidationResult(null);
    try {
      const res = await fetch("/api/ai/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: apiKey.trim() || profile?.ai_api_key_encrypted }),
      });
      const data = await res.json();
      if (data.valid) {
        setValidationResult("valid");
        toast.success("API 키가 유효합니다!");
      } else {
        setValidationResult("invalid");
        toast.error(data.error || "API 키가 유효하지 않습니다.");
      }
    } catch {
      setValidationResult("invalid");
      toast.error("검증 중 오류가 발생했습니다.");
    } finally {
      setIsValidating(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      const updateData: Record<string, unknown> = { ai_provider: provider };
      if (apiKey.trim()) {
        updateData.ai_api_key_encrypted = apiKey.trim();
      }
      const { error } = await supabaseMutate("profiles", "PATCH", updateData, {
        filter: `id=eq.${user.id}`,
      });
      if (error) throw new Error(error);
      if (profile) {
        setProfile({
          ...profile,
          ai_provider: provider,
          ...(apiKey.trim() && { ai_api_key_encrypted: apiKey.trim() }),
        });
      }
      toast.success("AI 설정이 저장되었습니다!");
    } catch (err) {
      toast.error(`저장 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-lg font-bold">AI 설정</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-3">
          <Label>AI 프로바이더</Label>
          <div className="grid grid-cols-3 gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setProvider(p.id);
                  setValidationResult(null);
                }}
                className={`rounded-lg border-2 p-3 text-center transition-colors ${
                  provider === p.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <p className="text-sm font-medium">{p.name}</p>
                {provider === p.id && (
                  <Check className="mx-auto mt-1 h-3 w-3 text-primary" />
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {PROVIDERS.find((p) => p.id === provider)?.description}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiKey">API 키</Label>
          <div className="flex gap-2">
            <Input
              id="apiKey"
              type="password"
              placeholder={profile?.ai_api_key_encrypted ? "●●●●●●●● (설정됨)" : "API 키를 입력하세요"}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setValidationResult(null);
              }}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleValidate}
              disabled={isValidating}
              className="shrink-0"
            >
              {isValidating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : validationResult === "valid" ? (
                <ShieldCheck className="h-4 w-4 text-green-500" />
              ) : validationResult === "invalid" ? (
                <ShieldX className="h-4 w-4 text-red-500" />
              ) : (
                "검증"
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            API 키는 암호화되어 안전하게 저장됩니다.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AI 기능 안내</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>- 카드 자동 생성 (PDF/텍스트)</p>
            <p>- 퀴즈 문제 생성</p>
            <p>- 어원 분석 & 니모닉</p>
            <p>- 오답 분석</p>
            <p>- AI 심층 질문</p>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isSaving}>
          {isSaving ? "저장 중..." : "저장"}
        </Button>
      </form>
    </div>
  );
}
