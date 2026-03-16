"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Brain, Target, TrendingUp } from "lucide-react";
import { StudyChart } from "@/components/stats/study-chart";
import { WeakCards } from "@/components/stats/weak-cards";

export default function StatsPage() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ["stats", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const userId = user!.id;

      // 병렬 데이터 조회
      const [decksRes, recordsRes, quizRes] = await Promise.all([
        supabase
          .from("decks")
          .select("id, title, deck_type, card_count, mastered_count")
          .eq("user_id", userId),
        supabase
          .from("study_records")
          .select("id, card_type, quality, reviewed_at")
          .eq("user_id", userId)
          .order("reviewed_at", { ascending: false })
          .limit(500),
        supabase
          .from("quiz_results")
          .select("id, deck_id, score, total_questions, time_spent_sec, created_at, answers")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      return {
        decks: decksRes.data ?? [],
        records: recordsRes.data ?? [],
        quizResults: quizRes.data ?? [],
      };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const decks = data?.decks ?? [];
  const records = data?.records ?? [];
  const quizResults = data?.quizResults ?? [];

  // 총 카드 / 마스터 카드
  const totalCards = decks.reduce((s, d) => s + (d.card_count || 0), 0);
  const totalMastered = decks.reduce((s, d) => s + (d.mastered_count || 0), 0);
  const masteryRate = totalCards > 0 ? Math.round((totalMastered / totalCards) * 100) : 0;

  // 일별 학습량 (최근 7일)
  const dailyStudy = (() => {
    const days = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      days.set(key, 0);
    }
    for (const r of records) {
      const d = new Date(r.reviewed_at);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (days.has(key)) {
        days.set(key, (days.get(key) || 0) + 1);
      }
    }
    return Array.from(days.entries()).map(([date, count]) => ({ date, count }));
  })();

  // 암기율 추이 (최근 14일, study_records의 quality >= 3 = 정답)
  const masteryTrend = (() => {
    const days = new Map<string, { correct: number; total: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      days.set(key, { correct: 0, total: 0 });
    }
    for (const r of records) {
      const d = new Date(r.reviewed_at);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      const entry = days.get(key);
      if (entry) {
        entry.total += 1;
        if (r.quality >= 3) entry.correct += 1;
      }
    }
    return Array.from(days.entries())
      .filter(([, v]) => v.total > 0)
      .map(([date, v]) => ({
        date,
        count: Math.round((v.correct / v.total) * 100),
      }));
  })();

  // 퀴즈 점수 추이
  const quizScores = quizResults
    .slice(0, 10)
    .reverse()
    .map((q, i) => ({
      date: `#${i + 1}`,
      count: Math.round((q.score / q.total_questions) * 100),
    }));

  // 취약 카드 분석
  const weakCards = (() => {
    const cardErrors = new Map<string, { incorrect: number; total: number; word?: string }>();
    for (const quiz of quizResults) {
      const answers = quiz.answers as Record<string, { correct: boolean }> | null;
      if (!answers) continue;
      for (const [cardId, result] of Object.entries(answers)) {
        const existing = cardErrors.get(cardId) || { incorrect: 0, total: 0 };
        existing.total += 1;
        if (!result.correct) existing.incorrect += 1;
        cardErrors.set(cardId, existing);
      }
    }
    return Array.from(cardErrors.entries())
      .filter(([, v]) => v.incorrect > 0)
      .sort((a, b) => b[1].incorrect / b[1].total - a[1].incorrect / a[1].total)
      .slice(0, 10)
      .map(([cardId, v]) => ({
        cardId,
        frontText: cardId.slice(0, 8) + "…",
        incorrectCount: v.incorrect,
        totalAttempts: v.total,
      }));
  })();

  // 덱별 진도
  const deckProgress = decks.map((d) => ({
    title: d.title,
    total: d.card_count || 0,
    mastered: d.mastered_count || 0,
    rate: d.card_count > 0 ? Math.round(((d.mastered_count || 0) / d.card_count) * 100) : 0,
  }));

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">학습 통계</h1>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
              <BookOpen className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCards}</p>
              <p className="text-xs text-muted-foreground">전체 카드</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <Target className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{masteryRate}%</p>
              <p className="text-xs text-muted-foreground">암기율</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{records.length}</p>
              <p className="text-xs text-muted-foreground">총 학습 횟수</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
              <Brain className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{quizResults.length}</p>
              <p className="text-xs text-muted-foreground">퀴즈 완료</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 일별 학습량 차트 */}
      <StudyChart
        data={dailyStudy}
        title="최근 7일 학습량"
        type="bar"
        color="hsl(var(--primary))"
      />

      {/* 암기율 추이 */}
      {masteryTrend.length > 0 && (
        <StudyChart
          data={masteryTrend}
          title="암기율 추이 (%)"
          type="line"
          color="hsl(262, 83%, 58%)"
        />
      )}

      {/* 퀴즈 점수 추이 */}
      {quizScores.length > 0 && (
        <StudyChart
          data={quizScores}
          title="퀴즈 정답률 추이 (%)"
          type="line"
          color="hsl(142, 76%, 36%)"
        />
      )}

      {/* 덱별 진도 */}
      {deckProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">덱별 진도</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deckProgress.map((deck, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{deck.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {deck.mastered}/{deck.total} ({deck.rate}%)
                  </span>
                </div>
                <Progress value={deck.rate} className="mt-1 h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 취약 카드 */}
      <WeakCards cards={weakCards} />
    </div>
  );
}
