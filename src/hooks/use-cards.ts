"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient, supabaseMutate } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/query-keys";
import type { Card } from "@/types/database";

export function useCards(deckId: string) {
  return useQuery({
    queryKey: queryKeys.cards.list(deckId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("deck_id", deckId)
        .order("position");

      if (error) throw error;
      return data as Card[];
    },
    enabled: !!deckId,
  });
}

export function useCreateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (card: {
      deck_id: string;
      front_text: string;
      back_text: string;
      tags?: string[];
      position?: number;
    }) => {
      const { data, error } = await supabaseMutate<Card>("cards", "POST", card, { returnData: true });
      if (error) throw new Error(error);
      return data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.cards.list(data.deck_id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
    },
  });
}

export function useCreateCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cards: {
      deck_id: string;
      front_text: string;
      back_text: string;
      tags?: string[];
      position?: number;
    }[]) => {
      const { data, error } = await supabaseMutate<Card[]>("cards", "POST", cards as unknown as Record<string, unknown>[], { returnData: true });
      if (error) throw new Error(error);
      return data ?? [];
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.list((data as Card[])[0].deck_id),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
      }
    },
  });
}

export function useUpdateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cardId,
      deckId,
      data,
    }: {
      cardId: string;
      deckId: string;
      data: { front_text?: string; back_text?: string; tags?: string[] };
    }) => {
      const { error } = await supabaseMutate("cards", "PATCH", data as Record<string, unknown>, {
        filter: `id=eq.${cardId}`,
      });
      if (error) throw new Error(error);
      return deckId;
    },
    onSuccess: (deckId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.cards.list(deckId),
      });
    },
  });
}

export function useDeleteCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cardId, deckId }: { cardId: string; deckId: string }) => {
      const { error } = await supabaseMutate("cards", "DELETE", undefined, { filter: `id=eq.${cardId}` });
      if (error) throw new Error(error);
      return deckId;
    },
    onSuccess: (deckId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.cards.list(deckId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
    },
  });
}
