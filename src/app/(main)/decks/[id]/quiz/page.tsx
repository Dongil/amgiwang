"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Brain } from "lucide-react";
import { QuizSession } from "@/components/quiz/quiz-session";
import type { Deck, VocabCard, Card as CardType } from "@/types/database";

export default function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: deckId } = use(params);
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.decks.detail(deckId), "quiz-data"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: deck, error: deckError } = await supabase
        .from("decks")
        .select("id, title, deck_type, card_count")
        .eq("id", deckId)
        .single();
      if (deckError) throw deckError;

      const typedDeck = deck as Pick<Deck, "id" | "title" | "deck_type" | "card_count">;
      const table = typedDeck.deck_type === "english_vocab" ? "vocab_cards" : "cards";

      const { data: cards, error: cardsError } = await supabase
        .from(table)
        .select("*")
        .eq("deck_id", deckId)
        .order("position");
      if (cardsError) throw cardsError;

      return {
        deck: typedDeck,
        cards: typedDeck.deck_type === "english_vocab"
          ? (cards as VocabCard[])
          : (cards as CardType[]),
      };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const deck = data?.deck;
  const cards = data?.cards ?? [];
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

      {cards.length < 4 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Brain className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium">카드가 부족합니다</p>
              <p className="mt-1 text-sm text-muted-foreground">
                퀴즈를 시작하려면 최소 4장의 카드가 필요합니다.
                <br />
                현재 {cards.length}장
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/decks/${deckId}/cards/new`}>카드 추가하기</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <QuizSession
          deckId={deckId}
          deckType={isVocab ? "english_vocab" : "general"}
          cards={cards}
        />
      )}
    </div>
  );
}
