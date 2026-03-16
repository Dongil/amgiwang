"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseMutate } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { DeckType } from "@/types/database";
import Link from "next/link";

const SUBJECTS = ["영어", "국어", "수학", "과학", "사회", "한국사", "기타"];
const COLORS = ["#6366f1", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7"];

export default function NewDeckPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deckType, setDeckType] = useState<DeckType>("english_vocab");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("영어");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      const { data, error } = await supabaseMutate<{ id: string }>("decks", "POST", {
        user_id: user.id,
        deck_type: deckType,
        title,
        subject,
        description: description || null,
        color,
      }, { returnData: true });

      if (error) throw new Error(error);

      queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
      toast.success("덱이 생성되었습니다!");
      router.push(`/decks/${data!.id}`);
    } catch (err) {
      toast.error(`덱 생성 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-5">
      <div className="mb-5 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="뒤로 가기">
          <Link href="/decks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold tracking-tight">새 덱 만들기</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 덱 타입 선택 */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setDeckType("english_vocab");
              setSubject("영어");
            }}
            className={`rounded-lg border-2 p-4 text-center transition-colors ${
              deckType === "english_vocab"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <span className="text-2xl">🔤</span>
            <p className="mt-1 text-sm font-medium">영어단어장</p>
          </button>
          <button
            type="button"
            onClick={() => {
              setDeckType("general");
              setSubject("국어");
            }}
            className={`rounded-lg border-2 p-4 text-center transition-colors ${
              deckType === "general"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <span className="text-2xl">📖</span>
            <p className="mt-1 text-sm font-medium">일반과목</p>
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">덱 이름</Label>
            <Input
              id="title"
              placeholder={
                deckType === "english_vocab"
                  ? "예: 수능 필수 영단어"
                  : "예: 한국사 근현대사"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">과목</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">설명 (선택)</Label>
            <Textarea
              id="description"
              placeholder="덱에 대한 설명을 입력하세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>색상</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`색상 ${c}`}
                  className={`h-8 w-8 rounded-full transition-transform ${
                    color === c ? "scale-110 ring-2 ring-offset-2 ring-primary" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "생성 중…" : "덱 만들기"}
        </Button>
      </form>
    </div>
  );
}
