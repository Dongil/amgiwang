"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient, supabaseMutate } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/query-keys";
import type { VocabCard, VocabMeaning, VocabRelated } from "@/types/database";

export function useVocabCards(deckId: string) {
  return useQuery({
    queryKey: queryKeys.vocabCards.list(deckId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("vocab_cards")
        .select("*")
        .eq("deck_id", deckId)
        .order("position");

      if (error) throw error;
      return data as VocabCard[];
    },
    enabled: !!deckId,
  });
}

export function useCreateVocabCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (card: {
      deck_id: string;
      word: string;
      meaning: string;
      meanings: VocabMeaning[];
      phonetic?: string;
      example_sentence?: string;
      example_translation?: string;
      derivatives?: VocabRelated[];
      antonyms?: VocabRelated[];
      root?: string;
      prefix?: string;
      suffix?: string;
      etymology_note?: string;
      mnemonic?: string;
      tips?: string;
      difficulty_level?: number;
      tags?: string[];
      position?: number;
    }) => {
      const { data, error } = await supabaseMutate<VocabCard>("vocab_cards", "POST", card as unknown as Record<string, unknown>, { returnData: true });
      if (error) throw new Error(error);
      return data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vocabCards.list(data.deck_id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
    },
  });
}

export function useCreateVocabCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cards: {
      deck_id: string;
      word: string;
      meaning: string;
      [key: string]: unknown;
    }[]) => {
      const { data, error } = await supabaseMutate<VocabCard[]>("vocab_cards", "POST", cards as unknown as Record<string, unknown>[], { returnData: true });
      if (error) throw new Error(error);
      return data ?? [];
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.vocabCards.list((data as VocabCard[])[0].deck_id),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
      }
    },
  });
}

export function useUpdateVocabCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cardId,
      deckId,
      data,
    }: {
      cardId: string;
      deckId: string;
      data: Record<string, unknown>;
    }) => {
      const { error } = await supabaseMutate("vocab_cards", "PATCH", data, {
        filter: `id=eq.${cardId}`,
      });
      if (error) throw new Error(error);
      return deckId;
    },
    onSuccess: (deckId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vocabCards.list(deckId),
      });
    },
  });
}

export function useDeleteVocabCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cardId, deckId }: { cardId: string; deckId: string }) => {
      const { error } = await supabaseMutate("vocab_cards", "DELETE", undefined, { filter: `id=eq.${cardId}` });
      if (error) throw new Error(error);
      return deckId;
    },
    onSuccess: (deckId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vocabCards.list(deckId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
    },
  });
}
