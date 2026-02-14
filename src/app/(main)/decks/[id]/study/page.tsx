"use client";

import { use, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient, supabaseMutate } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { useStudyStore } from "@/stores/study-store";
import { useRecordStudy } from "@/hooks/use-study-records";
import { queryKeys } from "@/lib/query-keys";
import { QUALITY_MAP, type QualityLabel } from "@/lib/sm2";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { GeneralCardView } from "@/components/study/general-card-view";
import { VocabCardView } from "@/components/study/vocab-card-view";
import { useTts } from "@/hooks/use-tts";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { Deck, Card as CardType, VocabCard, CardType as CardTypeEnum, StudyPlan } from "@/types/database";

export default function StudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: deckId } = use(params);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const {
    currentCards,
    currentIndex,
    isFlipped,
    setDeck,
    setCards,
    flipCard,
    nextCard,
    reset,
  } = useStudyStore();

  const recordStudy = useRecordStudy();
  const completedCardIds = useRef<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.decks.detail(deckId), "study"],
    queryFn: async () => {
      const supabase = createClient();
      const deckRes = await supabase
        .from("decks")
        .select("*")
        .eq("id", deckId)
        .single();
      if (deckRes.error) throw deckRes.error;
      const deck = deckRes.data as Deck;

      const table = deck.deck_type === "english_vocab" ? "vocab_cards" : "cards";
      const [cardsRes, planRes] = await Promise.all([
        supabase
          .from(table)
          .select("*")
          .eq("deck_id", deckId)
          .order("position"),
        supabase
          .from("study_plans")
          .select("*")
          .eq("deck_id", deckId)
          .eq("user_id", user!.id)
          .eq("status", "active")
          .maybeSingle(),
      ]);

      return {
        deck,
        cards: (cardsRes.data ?? []) as (CardType | VocabCard)[],
        plan: planRes.data as StudyPlan | null,
      };
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (data) {
      setDeck(data.deck);
      setCards(data.cards);
    }
    return () => reset();
  }, [data, setDeck, setCards, reset]);

  const handleGrade = useCallback(
    (label: QualityLabel) => {
      const card = currentCards[currentIndex];
      if (!card || !data) return;

      const cardType: CardTypeEnum =
        data.deck.deck_type === "english_vocab" ? "english_vocab" : "general";

      recordStudy.mutate(
        { cardId: card.id, cardType, quality: QUALITY_MAP[label] },
        {
          onSuccess: () => {
            completedCardIds.current.add(card.id);

            // daily_progress 업데이트 (비동기, 실패 무시)
            if (data.plan && user) {
              const completed = Array.from(completedCardIds.current);
              const allCardIds = currentCards.map((c) => c.id);
              const rate = completed.length / allCardIds.length;
              supabaseMutate("daily_progress", "POST", {
                study_plan_id: data.plan.id,
                user_id: user.id,
                day_number: data.plan.current_day,
                target_card_ids: allCardIds,
                completed_card_ids: completed,
                progress_rate: Math.round(rate * 100) / 100,
                is_completed: completed.length >= allCardIds.length,
                studied_at: new Date().toISOString().split("T")[0],
              }, { onConflict: "study_plan_id,day_number" });
            }

            if (currentIndex < currentCards.length - 1) {
              nextCard();
            } else {
              // 모든 카드 완료 → study plan current_day 진행
              if (data.plan && user) {
                supabaseMutate("study_plans", "PATCH", {
                  current_day: data.plan.current_day + 1,
                }, { filter: `id=eq.${data.plan.id}` });
              }
              toast.success("학습 완료!");
              router.push(`/decks/${deckId}`);
            }
          },
        }
      );
    },
    [currentCards, currentIndex, data, recordStudy, nextCard, router, deckId, user]
  );

  const { speak: speakWord } = useTts();

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!data || currentCards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <p className="text-muted-foreground">학습할 카드가 없습니다.</p>
        <Button asChild variant="outline">
          <Link href={`/decks/${deckId}`}>돌아가기</Link>
        </Button>
      </div>
    );
  }

  const card = currentCards[currentIndex];
  const isVocab = data.deck.deck_type === "english_vocab";
  const progressPercent = ((currentIndex + 1) / currentCards.length) * 100;

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col p-4">
      {/* 헤더 */}
      <div className="mb-4 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/decks/${deckId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <p className="text-sm font-medium">{data.deck.title}</p>
          <p className="text-xs text-muted-foreground">
            {currentIndex + 1} / {currentCards.length}
          </p>
        </div>
      </div>

      <Progress value={progressPercent} className="mb-4 h-1.5" />

      {/* 카드 */}
      <div className="flex-1">
        <button
          type="button"
          onClick={flipCard}
          className="w-full text-left"
        >
          <Card className="min-h-[300px] cursor-pointer transition-all active:scale-[0.98]">
            <CardContent className="flex min-h-[300px] flex-col items-center justify-center p-6">
              {isVocab ? (
                <VocabCardView
                  card={card as VocabCard}
                  isFlipped={isFlipped}
                  onSpeak={speakWord}
                />
              ) : (
                <GeneralCardView
                  card={card as CardType}
                  isFlipped={isFlipped}
                />
              )}

              {!isFlipped && (
                <p className="mt-4 text-xs text-muted-foreground">
                  탭하여 뒤집기
                </p>
              )}
            </CardContent>
          </Card>
        </button>
      </div>

      {/* SM-2 평가 버튼 */}
      {isFlipped && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleGrade("again")}
            disabled={recordStudy.isPending}
          >
            모름
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGrade("hard")}
            disabled={recordStudy.isPending}
            className="border-orange-300 text-orange-600"
          >
            어려움
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGrade("good")}
            disabled={recordStudy.isPending}
            className="border-blue-300 text-blue-600"
          >
            좋음
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => handleGrade("easy")}
            disabled={recordStudy.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            완벽
          </Button>
        </div>
      )}
    </div>
  );
}

