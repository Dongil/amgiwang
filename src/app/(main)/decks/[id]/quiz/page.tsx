"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Brain } from "lucide-react";
import type { Deck } from "@/types/database";

export default function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: deckId } = use(params);

  const { data: deck, isLoading } = useQuery({
    queryKey: [...queryKeys.decks.detail(deckId), "quiz"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("decks")
        .select("id, title, deck_type, card_count")
        .eq("id", deckId)
        .single();
      if (error) throw error;
      return data as Pick<Deck, "id" | "title" | "deck_type" | "card_count">;
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

  const isVocab = deck?.deck_type === "english_vocab";

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/decks/${deckId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-bold">퀴즈</h1>
          <p className="text-xs text-muted-foreground">{deck?.title}</p>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Brain className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">퀴즈 모드</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isVocab
                ? "영→한, 한→영, 예문 빈칸 등 다양한 퀴즈로 단어를 테스트합니다."
                : "객관식, O/X, 빈칸 채우기 등으로 학습 내용을 확인합니다."}
            </p>
          </div>

          {(deck?.card_count ?? 0) < 4 ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                퀴즈를 시작하려면 최소 4장의 카드가 필요합니다.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-2">
                <Link href={`/decks/${deckId}/cards/new`}>카드 추가하기</Link>
              </Button>
            </div>
          ) : (
            <div className="w-full space-y-2">
              <p className="text-center text-xs text-muted-foreground">
                AI 설정 후 퀴즈를 생성할 수 있습니다.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/settings/ai">AI 설정하기</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 text-center">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/decks/${deckId}/study`}>학습 모드로 이동</Link>
        </Button>
      </div>
    </div>
  );
}
