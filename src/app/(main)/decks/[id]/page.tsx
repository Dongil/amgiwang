"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CardListTable } from "@/components/deck/card-list-table";
import dynamic from "next/dynamic";
const ShareDialog = dynamic(() => import("@/components/deck/share-dialog").then((m) => m.ShareDialog), {
  ssr: false,
});
import { ArrowLeft, Plus, Play, FileText, Settings2, Share2 } from "lucide-react";
import type { Deck, Card as CardType, VocabCard } from "@/types/database";

export default function DeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: deckId } = use(params);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [shareOpen, setShareOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.decks.detail(deckId),
    queryFn: async () => {
      const supabase = createClient();
      // 병렬 페칭 (Vercel Best Practice: async-parallel)
      const [deckRes, planRes] = await Promise.all([
        supabase.from("decks").select("*").eq("id", deckId).single(),
        supabase
          .from("study_plans")
          .select("*, daily_progress(*)")
          .eq("deck_id", deckId)
          .eq("user_id", user!.id)
          .maybeSingle(),
      ]);

      const deck = deckRes.data as Deck;

      // deck_type에 따라 카드 테이블 분기
      const cardsRes = await supabase
        .from(deck.deck_type === "english_vocab" ? "vocab_cards" : "cards")
        .select("id, position")
        .eq("deck_id", deckId)
        .order("position");

      return {
        deck,
        cards: cardsRes.data ?? [],
        plan: planRes.data,
      };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="space-y-5 p-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!data?.deck) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">덱을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const { deck, cards, plan } = data;
  const masteredRate =
    deck.card_count > 0
      ? Math.round((deck.mastered_count / deck.card_count) * 100)
      : 0;

  return (
    <div className="space-y-5 p-5">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="뒤로 가기">
          <Link href="/decks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">
            {deck.deck_type === "english_vocab" ? "🔤" : "📖"} {deck.title}
          </h1>
          <p className="text-xs text-muted-foreground">
            {deck.subject} · {deck.card_count}
            {deck.deck_type === "english_vocab" ? "단어" : "카드"}
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label="공유 설정" onClick={() => setShareOpen(true)}>
          <Share2 className="h-4 w-4" />
        </Button>
        <Button asChild variant="ghost" size="icon" aria-label="덱 설정">
          <Link href={`/decks/${deckId}/edit`}>
            <Settings2 className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {deck.share_mode !== "none" && (
        <Badge variant="secondary" className="text-xs">
          {deck.share_mode === "public" ? "전체 공유" : "비공개 공유"}
        </Badge>
      )}

      <ShareDialog
        deckId={deckId}
        currentMode={deck.share_mode ?? "none"}
        open={shareOpen}
        onOpenChange={setShareOpen}
        onSaved={() => queryClient.invalidateQueries({ queryKey: queryKeys.decks.detail(deckId) })}
      />

      {/* 진도 */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between text-sm">
            <span>암기율</span>
            <span className="font-medium">{masteredRate}%</span>
          </div>
          <Progress value={masteredRate} className="mt-2 h-2" />
        </CardContent>
      </Card>

      {/* 액션 버튼들 */}
      <div className="grid grid-cols-2 gap-3">
        <Button asChild className="h-12">
          <Link href={`/decks/${deckId}/study`}>
            <Play className="mr-2 h-4 w-4" />
            학습 시작
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-12">
          <Link href={`/decks/${deckId}/quiz`}>
            퀴즈
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-12">
          <Link href={`/decks/${deckId}/cards/new`}>
            <Plus className="mr-2 h-4 w-4" />
            카드 추가
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-12">
          <Link href={`/decks/${deckId}/upload-pdf`}>
            <FileText className="mr-2 h-4 w-4" />
            PDF 업로드
          </Link>
        </Button>
      </div>

      {/* 학습 계획 */}
      <Card>
        <CardContent className="p-5">
          {plan ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">학습 계획</p>
                <p className="text-xs text-muted-foreground">
                  Day {plan.current_day}/{plan.total_days} · 일일 {plan.daily_amount}장
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/decks/${deckId}/study-plan`}>관리</Link>
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                학습 계획을 세우면 매일 진도를 관리할 수 있어요.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-2">
                <Link href={`/decks/${deckId}/study-plan`}>학습 계획 만들기</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* 카드 리스트 */}
      {deck.deck_type === "english_vocab" && (
        <CardListTable deckId={deckId} />
      )}
    </div>
  );
}
