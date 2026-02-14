"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function StatsPage() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">학습 통계</h1>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-sm text-muted-foreground">
            학습 데이터가 쌓이면 통계를 볼 수 있어요.
          </p>
          <p className="text-xs text-muted-foreground">
            카드를 학습하고 퀴즈를 풀어보세요!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
