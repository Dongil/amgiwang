"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query-keys";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export function ReviewCard() {
  const user = useAuthStore((s) => s.user);

  const { data: reviewCount } = useQuery({
    queryKey: queryKeys.studyRecords.review(user?.id ?? ""),
    queryFn: async () => {
      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("study_records")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .lte("next_review_date", today);
      return count ?? 0;
    },
    enabled: !!user,
  });

  if (!reviewCount) return null;

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">
            복습할 카드 {reviewCount}장
          </span>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/decks">복습 시작</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
