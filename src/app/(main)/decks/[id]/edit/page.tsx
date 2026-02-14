"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient, supabaseMutate } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Deck } from "@/types/database";

const SUBJECTS = ["영어", "국어", "수학", "과학", "사회", "한국사", "기타"];
const COLORS = ["#6366f1", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7"];

export default function EditDeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: deckId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: deck, isLoading } = useQuery({
    queryKey: [...queryKeys.decks.detail(deckId), "edit"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("decks")
        .select("*")
        .eq("id", deckId)
        .single();
      if (error) throw error;
      return data as Deck;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">덱을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <EditForm
      deck={deck}
      onSaved={() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.decks.detail(deckId) });
        router.push(`/decks/${deckId}`);
      }}
      onDeleted={() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
        router.push("/decks");
      }}
    />
  );
}

function EditForm({
  deck,
  onSaved,
  onDeleted,
}: {
  deck: Deck;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState(deck.title);
  const [subject, setSubject] = useState(deck.subject);
  const [description, setDescription] = useState(deck.description ?? "");
  const [color, setColor] = useState(deck.color);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabaseMutate("decks", "PATCH", {
        title,
        subject,
        description: description || null,
        color,
      }, { filter: `id=eq.${deck.id}` });
      if (error) throw new Error(error);
      toast.success("덱이 수정되었습니다!");
      onSaved();
    } catch (err) {
      toast.error(`수정 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("정말 이 덱을 삭제하시겠습니까? 모든 카드와 학습 기록이 삭제됩니다.")) return;
    setIsDeleting(true);
    try {
      const { error } = await supabaseMutate("decks", "DELETE", undefined, { filter: `id=eq.${deck.id}` });
      if (error) throw new Error(error);
      toast.success("덱이 삭제되었습니다.");
      onDeleted();
    } catch (err) {
      toast.error(`삭제 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/decks/${deck.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-lg font-bold">덱 편집</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">덱 이름</Label>
          <Input
            id="title"
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
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">설명 (선택)</Label>
          <Textarea
            id="description"
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
                className={`h-8 w-8 rounded-full transition-transform ${
                  color === c ? "scale-110 ring-2 ring-offset-2 ring-primary" : ""
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <p>덱 타입: {deck.deck_type === "english_vocab" ? "영어단어" : "일반과목"}</p>
          <p>카드 수: {deck.card_count}장</p>
        </div>

        <Button type="submit" className="w-full" disabled={isSaving}>
          {isSaving ? "저장 중..." : "저장"}
        </Button>
      </form>

      <div className="mt-8 border-t pt-4">
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {isDeleting ? "삭제 중..." : "덱 삭제"}
        </Button>
      </div>
    </div>
  );
}
