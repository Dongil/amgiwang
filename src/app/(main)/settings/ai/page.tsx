"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { supabaseMutate } from "@/lib/supabase/client";
import { PROVIDER_MODELS, getDefaultModel } from "@/lib/ai/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check, Loader2, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import type { AIProvider, AISettings } from "@/types/database";

const PROVIDERS: { id: AIProvider; name: string; color: string }[] = [
  { id: "gemini", name: "Gemini", color: "text-blue-500" },
  { id: "openai", name: "OpenAI", color: "text-green-500" },
  { id: "claude", name: "Claude", color: "text-orange-500" },
];

export default function AISettingsPage() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);

  const savedSettings: AISettings = profile?.ai_settings ?? {};

  const [defaultProvider, setDefaultProvider] = useState<AIProvider>(
    profile?.ai_provider ?? "gemini"
  );

  // 프로바이더별 입력 상태
  const [keys, setKeys] = useState<Record<AIProvider, string>>({
    gemini: "",
    openai: "",
    claude: "",
  });
  const [models, setModels] = useState<Record<AIProvider, string>>({
    gemini: savedSettings.gemini?.model || getDefaultModel("gemini"),
    openai: savedSettings.openai?.model || getDefaultModel("openai"),
    claude: savedSettings.claude?.model || getDefaultModel("claude"),
  });

  const [isSaving, setIsSaving] = useState(false);
  const [validating, setValidating] = useState<AIProvider | null>(null);
  const [validationResults, setValidationResults] = useState<
    Record<string, "valid" | "invalid">
  >({});

  function hasKey(p: AIProvider): boolean {
    return !!keys[p].trim() || !!savedSettings[p]?.apiKey;
  }

  async function handleValidate(p: AIProvider) {
    const keyToTest = keys[p].trim() || savedSettings[p]?.apiKey;
    if (!keyToTest) {
      toast.error("API 키를 입력해주세요.");
      return;
    }
    setValidating(p);
    setValidationResults((prev) => {
      const next = { ...prev };
      delete next[p];
      return next;
    });

    try {
      const res = await fetch("/api/ai/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: p, apiKey: keyToTest, model: models[p] }),
      });
      const data = await res.json();
      if (data.valid) {
        setValidationResults((prev) => ({ ...prev, [p]: "valid" }));
        if (data.warning) {
          toast.warning(`${p}: ${data.warning}`);
        } else {
          toast.success(`${p} API 키가 유효합니다!`);
        }
      } else {
        setValidationResults((prev) => ({ ...prev, [p]: "invalid" }));
        toast.error(data.error || "API 키가 유효하지 않습니다.");
      }
    } catch {
      setValidationResults((prev) => ({ ...prev, [p]: "invalid" }));
      toast.error("검증 중 오류가 발생했습니다.");
    } finally {
      setValidating(null);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      // 기존 설정에 새 입력값 머지
      const newSettings: AISettings = { ...savedSettings };
      for (const p of PROVIDERS) {
        const pid = p.id;
        const newKey = keys[pid].trim();
        if (newKey || newSettings[pid]) {
          newSettings[pid] = {
            apiKey: newKey || savedSettings[pid]?.apiKey || "",
            model: models[pid],
          };
        }
      }

      const { error } = await supabaseMutate("profiles", "PATCH", {
        ai_provider: defaultProvider,
        ai_settings: newSettings,
      }, {
        filter: `id=eq.${user.id}`,
      });
      if (error) throw new Error(error);

      if (profile) {
        setProfile({
          ...profile,
          ai_provider: defaultProvider,
          ai_settings: newSettings,
        });
      }
      // 입력 필드 초기화 (저장 완료)
      setKeys({ gemini: "", openai: "", claude: "" });
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

      <form onSubmit={handleSave} className="space-y-5">
        {/* 기본 프로바이더 선택 */}
        <div className="space-y-2">
          <Label>기본 AI 프로바이더</Label>
          <div className="grid grid-cols-3 gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDefaultProvider(p.id)}
                className={`rounded-lg border-2 p-2.5 text-center transition-colors ${
                  defaultProvider === p.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <p className="text-sm font-medium">{p.name}</p>
                {defaultProvider === p.id && (
                  <Check className="mx-auto mt-0.5 h-3 w-3 text-primary" />
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            PDF 카드 생성, 퀴즈 등에서 기본으로 사용할 AI
          </p>
        </div>

        {/* 프로바이더별 설정 */}
        {PROVIDERS.map((p) => {
          const hasSavedKey = !!savedSettings[p.id]?.apiKey;
          const vResult = validationResults[p.id];
          return (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <span className={p.color}>{p.name}</span>
                  {hasSavedKey && (
                    <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] font-normal text-green-600">
                      키 등록됨
                    </span>
                  )}
                  {defaultProvider === p.id && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-normal text-primary">
                      기본
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* API 키 */}
                <div className="space-y-1">
                  <Label className="text-xs">API 키</Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder={hasSavedKey ? "●●●●●●●● (변경하려면 새 키 입력)" : "API 키를 입력하세요"}
                      value={keys[p.id]}
                      onChange={(e) => {
                        setKeys((prev) => ({ ...prev, [p.id]: e.target.value }));
                        setValidationResults((prev) => {
                          const next = { ...prev };
                          delete next[p.id];
                          return next;
                        });
                      }}
                      className="flex-1 text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleValidate(p.id)}
                      disabled={validating === p.id || !hasKey(p.id)}
                      className="shrink-0"
                    >
                      {validating === p.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : vResult === "valid" ? (
                        <ShieldCheck className="h-4 w-4 text-green-500" />
                      ) : vResult === "invalid" ? (
                        <ShieldX className="h-4 w-4 text-red-500" />
                      ) : (
                        "검증"
                      )}
                    </Button>
                  </div>
                </div>

                {/* 모델 선택 */}
                <div className="space-y-1">
                  <Label className="text-xs">모델</Label>
                  <Select
                    value={models[p.id]}
                    onValueChange={(v) =>
                      setModels((prev) => ({ ...prev, [p.id]: v }))
                    }
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_MODELS[p.id].map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <Button type="submit" className="w-full" disabled={isSaving}>
          {isSaving ? "저장 중..." : "저장"}
        </Button>
      </form>
    </div>
  );
}
