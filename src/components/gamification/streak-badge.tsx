"use client";

import { useAuthStore } from "@/stores/auth-store";
import { Flame } from "lucide-react";

export function StreakBadge() {
  const profile = useAuthStore((s) => s.profile);
  const streakCount = profile?.streak_count ?? 0;

  if (streakCount === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-orange-50 p-3 dark:bg-orange-950/20">
      <Flame className="h-5 w-5 text-orange-500" />
      <span className="text-sm font-medium">
        {streakCount}일 연속 학습 중!
      </span>
    </div>
  );
}
