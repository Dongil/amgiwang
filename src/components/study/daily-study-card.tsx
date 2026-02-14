"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query-keys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen } from "lucide-react";
import type { StudyPlan, Deck } from "@/types/database";

interface ActivePlan extends StudyPlan {
  decks: Pick<Deck, "id" | "title" | "deck_type"> | null;
}

export function DailyStudyCard() {
  const user = useAuthStore((s) => s.user);

  const { data: plans } = useQuery({
    queryKey: ["activePlans", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("study_plans")
        .select("*, decks(id, title, deck_type)")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(3);
      return (data ?? []) as ActivePlan[];
    },
    enabled: !!user,
  });

  if (!plans?.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" />
            오늘의 학습
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            아직 학습 계획이 없어요. 덱을 만들어 시작해보세요!
          </p>
          <Button asChild className="mt-3 w-full" size="sm">
            <Link href="/decks/new">새 덱 만들기</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4" />
          오늘의 학습
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {plans.map((plan) => {
          const progressRate =
            plan.total_days > 0
              ? Math.round((plan.current_day / plan.total_days) * 100)
              : 0;
          return (
            <div key={plan.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {plan.decks?.deck_type === "english_vocab" ? "🔤" : "📖"}{" "}
                  {plan.decks?.title}
                </p>
                <span className="text-xs text-muted-foreground">
                  Day {plan.current_day}/{plan.total_days}
                </span>
              </div>
              <Progress value={progressRate} className="mt-2 h-1.5" />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {progressRate}% 완료
                </span>
                <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                  <Link href={`/decks/${plan.deck_id}/study`}>학습 시작</Link>
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
