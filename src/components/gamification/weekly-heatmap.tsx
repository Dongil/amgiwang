"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

export function WeeklyHeatmap() {
  const user = useAuthStore((s) => s.user);

  const { data: weekData } = useQuery({
    queryKey: ["weekly-heatmap", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const now = new Date();
      const monday = new Date(now);
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      monday.setDate(now.getDate() - diff);
      monday.setHours(0, 0, 0, 0);

      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        weekDates.push(d.toISOString().split("T")[0]);
      }

      const { data } = await supabase
        .from("study_records")
        .select("reviewed_at")
        .eq("user_id", user!.id)
        .gte("reviewed_at", weekDates[0])
        .lte("reviewed_at", weekDates[6] + "T23:59:59");

      const countByDate: Record<string, number> = {};
      (data ?? []).forEach((r: { reviewed_at: string }) => {
        const date = r.reviewed_at.split("T")[0];
        countByDate[date] = (countByDate[date] ?? 0) + 1;
      });

      return weekDates.map((date, i) => ({
        date,
        label: DAY_LABELS[i],
        count: countByDate[date] ?? 0,
        isFuture: date > now.toISOString().split("T")[0],
      }));
    },
    enabled: !!user,
  });

  if (!weekData) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4" />
          이번 주 학습
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between gap-1">
          {weekData.map((day) => (
            <div key={day.date} className="flex flex-col items-center gap-1">
              <div
                className={`h-8 w-8 rounded-md ${
                  day.isFuture
                    ? "bg-muted/30"
                    : day.count === 0
                      ? "bg-muted"
                      : day.count < 10
                        ? "bg-green-200 dark:bg-green-900"
                        : day.count < 30
                          ? "bg-green-400 dark:bg-green-700"
                          : "bg-green-600 dark:bg-green-500"
                }`}
              />
              <span className="text-[10px] text-muted-foreground">{day.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
