"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient, supabaseMutate } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query-keys";
import { calculateSM2, SM2_DEFAULTS } from "@/lib/sm2";
import type { StudyRecord, CardType } from "@/types/database";

export function useReviewCards() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: queryKeys.studyRecords.review(user?.id ?? ""),
    queryFn: async () => {
      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("study_records")
        .select("*")
        .eq("user_id", user!.id)
        .lte("next_review_date", today);

      if (error) throw error;
      return data as StudyRecord[];
    },
    enabled: !!user,
  });
}

export function useRecordStudy() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cardId,
      cardType,
      quality,
    }: {
      cardId: string;
      cardType: CardType;
      quality: number;
    }) => {
      // 기존 레코드 조회 (SELECT는 Supabase client 사용)
      const supabase = createClient();
      const { data: existing } = await supabase
        .from("study_records")
        .select("*")
        .eq("user_id", user!.id)
        .eq("card_id", cardId)
        .eq("card_type", cardType)
        .maybeSingle();

      const prev = existing ?? {
        ease_factor: SM2_DEFAULTS.easeFactor,
        interval: SM2_DEFAULTS.interval,
        repetitions: SM2_DEFAULTS.repetitions,
      };

      const result = calculateSM2({
        quality,
        easeFactor: prev.ease_factor,
        interval: prev.interval,
        repetitions: prev.repetitions,
      });

      // UPSERT는 supabaseMutate 사용 (POST + on_conflict)
      const { error } = await supabaseMutate("study_records", "POST", {
        user_id: user!.id,
        card_id: cardId,
        card_type: cardType,
        quality,
        ease_factor: result.easeFactor,
        interval: result.interval,
        repetitions: result.repetitions,
        next_review_date: result.nextReviewDate.toISOString().split("T")[0],
        reviewed_at: new Date().toISOString(),
      }, { returnData: false, onConflict: "user_id,card_id,card_type" });

      if (error) throw new Error(error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.studyRecords.review(user!.id),
      });
    },
  });
}
