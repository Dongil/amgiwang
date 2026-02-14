"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient, supabaseMutate } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query-keys";
import type { Deck, DeckType } from "@/types/database";

export function useDecks(type?: DeckType) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: queryKeys.decks.list(type),
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from("decks")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });

      if (type) {
        query = query.eq("deck_type", type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Deck[];
    },
    enabled: !!user,
  });
}

export function useDeck(deckId: string) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: queryKeys.decks.detail(deckId),
    queryFn: async () => {
      const supabase = createClient();
      const [deckRes, planRes] = await Promise.all([
        supabase.from("decks").select("*").eq("id", deckId).single(),
        supabase
          .from("study_plans")
          .select("*, daily_progress(*)")
          .eq("deck_id", deckId)
          .eq("user_id", user!.id)
          .maybeSingle(),
      ]);

      if (deckRes.error) throw deckRes.error;
      return {
        deck: deckRes.data as Deck,
        plan: planRes.data,
      };
    },
    enabled: !!user && !!deckId,
  });
}

export function useDeleteDeck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deckId: string) => {
      const { error } = await supabaseMutate("decks", "DELETE", undefined, { filter: `id=eq.${deckId}` });
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
    },
  });
}
