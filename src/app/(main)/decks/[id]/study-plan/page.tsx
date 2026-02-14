"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient, supabaseMutate } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { Deck, StudyPlan } from "@/types/database";

export default function StudyPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: deckId } = use(params);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.studyPlans.byDeck(deckId),
    queryFn: async () => {
      const supabase = createClient();
      const [deckRes, planRes] = await Promise.all([
        supabase.from("decks").select("*").eq("id", deckId).single(),
        supabase
          .from("study_plans")
          .select("*, daily_progress(*)")
          .eq("deck_id", deckId)
          .eq("user_id", user!.id)
          .maybeSingle(),
      ]);
      if (deckRes.error) throw deckRes.error;
      return {
        deck: deckRes.data as Deck,
        plan: planRes.data as StudyPlan | null,
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

  if (!data?.deck) return null;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/decks/${deckId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-bold">학습 계획</h1>
          <p className="text-xs text-muted-foreground">{data.deck.title}</p>
        </div>
      </div>

      {data.plan ? (
        <PlanStatus plan={data.plan} />
      ) : (
        <CreatePlanForm
          deckId={deckId}
          totalCards={data.deck.card_count}
          userId={user!.id}
          onCreated={() => {
            queryClient.invalidateQueries({
              queryKey: queryKeys.studyPlans.byDeck(deckId),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.decks.detail(deckId),
            });
          }}
        />
      )}
    </div>
  );
}

function PlanStatus({ plan }: { plan: StudyPlan }) {
  const progressPercent =
    plan.total_days > 0
      ? Math.round(((plan.current_day - 1) / plan.total_days) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">현재 진행 상황</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>
              Day {plan.current_day} / {plan.total_days}
            </span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-muted-foreground">일일 분량</p>
              <p className="text-lg font-bold">{plan.daily_amount}장</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-muted-foreground">전체 카드</p>
              <p className="text-lg font-bold">{plan.total_cards}장</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-muted-foreground">시작일</p>
              <p className="font-medium">{plan.start_date}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-muted-foreground">목표일</p>
              <p className="font-medium">{plan.end_date}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CreatePlanForm({
  deckId,
  totalCards,
  userId,
  onCreated,
}: {
  deckId: string;
  totalCards: number;
  userId: string;
  onCreated: () => void;
}) {
  const [dailyAmount, setDailyAmount] = useState(
    Math.min(30, totalCards || 30)
  );

  const totalDays = Math.max(1, Math.ceil(totalCards / dailyAmount));
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + totalDays);

  const createPlan = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabaseMutate("study_plans", "POST", {
        user_id: userId,
        deck_id: deckId,
        total_cards: totalCards,
        daily_amount: dailyAmount,
        start_date: today,
        end_date: endDate.toISOString().split("T")[0],
        total_days: totalDays,
      });
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      toast.success("학습 계획이 생성되었습니다!");
      onCreated();
    },
    onError: () => {
      toast.error("학습 계획 생성에 실패했습니다.");
    },
  });

  if (totalCards === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            먼저 카드를 추가해주세요.
          </p>
          <Button asChild variant="outline" className="mt-3">
            <Link href={`/decks/${deckId}/cards/new`}>카드 추가하기</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">학습 계획 만들기</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          전체 {totalCards}장의 카드를 매일 얼마나 학습할지 설정하세요.
        </p>

        <div className="space-y-2">
          <Label htmlFor="daily">일일 학습량</Label>
          <Input
            id="daily"
            type="number"
            min={1}
            max={totalCards}
            value={dailyAmount}
            onChange={(e) =>
              setDailyAmount(
                Math.max(1, Math.min(totalCards, Number(e.target.value)))
              )
            }
          />
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p>
            하루 <strong>{dailyAmount}장</strong> × <strong>{totalDays}일</strong>
          </p>
          <p className="text-muted-foreground">
            예상 완료일: {endDate.toLocaleDateString("ko-KR")}
          </p>
        </div>

        <Button
          className="w-full"
          onClick={() => createPlan.mutate()}
          disabled={createPlan.isPending}
        >
          {createPlan.isPending ? "생성 중..." : "학습 계획 시작"}
        </Button>
      </CardContent>
    </Card>
  );
}
