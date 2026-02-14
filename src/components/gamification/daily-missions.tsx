"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query-keys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, CheckCircle2 } from "lucide-react";
import type { DailyMission } from "@/types/database";

const MISSION_LABELS: Record<string, string> = {
  review_cards: "카드 복습",
  quiz_count: "퀴즈 도전",
  study_time: "학습 시간",
  new_cards: "새 카드 학습",
  perfect_quiz: "퀴즈 만점",
};

export function DailyMissions() {
  const user = useAuthStore((s) => s.user);

  const { data: missions } = useQuery({
    queryKey: queryKeys.dailyMissions.today(user?.id ?? ""),
    queryFn: async () => {
      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("daily_missions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("mission_date", today)
        .order("created_at");
      return (data ?? []) as DailyMission[];
    },
    enabled: !!user,
  });

  if (!missions || missions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Target className="h-4 w-4" />
          오늘의 미션
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {missions.map((mission) => {
          const percent = Math.min(
            100,
            Math.round((mission.current_value / mission.target_value) * 100)
          );
          return (
            <div key={mission.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  {mission.is_completed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : null}
                  <span className={mission.is_completed ? "text-muted-foreground line-through" : ""}>
                    {MISSION_LABELS[mission.mission_type] ?? mission.mission_type}{" "}
                    ({mission.current_value}/{mission.target_value})
                  </span>
                </span>
                {mission.is_completed && (
                  <span className="text-xs text-green-600">+{mission.xp_reward}XP</span>
                )}
              </div>
              <Progress value={percent} className="h-1.5" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
