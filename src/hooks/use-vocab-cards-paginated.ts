"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/query-keys";
import type { VocabCard } from "@/types/database";

const PAGE_SIZE = 50;

interface PaginatedOpts {
  page: number;
  day: string | null;
  search: string;
}

export function useVocabCardsPaginated(deckId: string, opts: PaginatedOpts) {
  return useQuery({
    queryKey: queryKeys.vocabCards.paginated(deckId, opts),
    queryFn: async () => {
      const supabase = createClient();
      const from = opts.page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("vocab_cards")
        .select("*", {
          count: "exact",
        })
        .eq("deck_id", deckId)
        .order("position");

      if (opts.day) {
        query = query.contains("tags", [opts.day]);
      }

      if (opts.search) {
        query = query.ilike("word", `%${opts.search}%`);
      }

      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      return {
        cards: data as VocabCard[],
        totalCount: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
      };
    },
    enabled: !!deckId,
    placeholderData: (prev) => prev,
  });
}

export { PAGE_SIZE };
