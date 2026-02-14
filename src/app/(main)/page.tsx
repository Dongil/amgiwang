import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LevelProgressBar } from "@/components/gamification/level-progress-bar";
import { StreakBadge } from "@/components/gamification/streak-badge";
import { DailyMissions } from "@/components/gamification/daily-missions";
import { WeeklyHeatmap } from "@/components/gamification/weekly-heatmap";
import { DailyStudyCard } from "@/components/study/daily-study-card";
import { ReviewCard } from "@/components/study/review-card";

export default function Dashboard() {
  return (
    <div className="space-y-4 p-4">
      <Suspense fallback={<Skeleton className="h-16 w-full" />}>
        <LevelProgressBar />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-12 w-full" />}>
        <StreakBadge />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <DailyStudyCard />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-20 w-full" />}>
        <ReviewCard />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <DailyMissions />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-20 w-full" />}>
        <WeeklyHeatmap />
      </Suspense>
    </div>
  );
}
