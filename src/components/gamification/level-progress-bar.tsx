"use client";

import { useAuthStore } from "@/stores/auth-store";
import { Progress } from "@/components/ui/progress";

function xpForLevel(level: number): number {
  return (100 * level * (level + 1)) / 2;
}

export function LevelProgressBar() {
  const profile = useAuthStore((s) => s.profile);

  if (!profile) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">로그인이 필요합니다</p>
      </div>
    );
  }

  const currentLevelXp = xpForLevel(profile.level - 1);
  const nextLevelXp = xpForLevel(profile.level);
  const progress = nextLevelXp > currentLevelXp
    ? ((profile.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100
    : 0;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold">
          안녕, {profile.display_name}!
        </p>
        <span className="text-sm font-medium text-primary">
          Lv.{profile.level}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Progress value={progress} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground">
          {profile.xp} XP
        </span>
      </div>
    </div>
  );
}
