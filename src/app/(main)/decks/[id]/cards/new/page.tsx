"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient, supabaseMutate } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query-keys";
import { GeneralCardForm } from "@/components/card/general-card-form";
import { VocabCardForm } from "@/components/card/vocab-card-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { Deck, VocabMeaning, VocabRelated } from "@/types/database";

export default function NewCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: deckId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [isSaving, setIsSaving] = useState(false);
  const [cardCount, setCardCount] = useState(0);

  const { data: deck, isLoading } = useQuery({
    queryKey: [...queryKeys.decks.detail(deckId), "meta"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("decks")
        .select("id, deck_type, title, card_count")
        .eq("id", deckId)
        .single();
      if (error) throw error;
      setCardCount(data.card_count);
      return data as Pick<Deck, "id" | "deck_type" | "title" | "card_count">;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">덱을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const isVocab = deck.deck_type === "english_vocab";

  async function handleGeneralSubmit(card: { front_text: string; back_text: string; tags: string[] }) {
    setIsSaving(true);
    try {
      const { error } = await supabaseMutate("cards", "POST", {
        deck_id: deckId,
        front_text: card.front_text,
        back_text: card.back_text,
        tags: card.tags,
        position: cardCount + 1,
      });
      if (error) throw new Error(error);
      setCardCount((c) => c + 1);
      toast.success("카드가 추가되었습니다!");
      queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
    } catch (err) {
      toast.error(`카드 추가 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleVocabSubmit(card: {
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
    tags?: string[];
  }) {
    setIsSaving(true);
    try {
      const { error } = await supabaseMutate("vocab_cards", "POST", {
        deck_id: deckId,
        word: card.word,
        meaning: card.meaning,
        meanings: card.meanings,
        phonetic: card.phonetic || null,
        example_sentence: card.example_sentence || null,
        example_translation: card.example_translation || null,
        derivatives: card.derivatives || [],
        antonyms: card.antonyms || [],
        root: card.root || null,
        prefix: card.prefix || null,
        suffix: card.suffix || null,
        etymology_note: card.etymology_note || null,
        mnemonic: card.mnemonic || null,
        tips: card.tips || null,
        tags: card.tags || [],
        position: cardCount + 1,
      });
      if (error) throw new Error(error);
      setCardCount((c) => c + 1);
      toast.success("단어가 추가되었습니다!");
      queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
    } catch (err) {
      toast.error(`단어 추가 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="뒤로 가기">
          <Link href={`/decks/${deckId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-bold">
            {isVocab ? "단어 추가" : "카드 추가"}
          </h1>
          <p className="text-xs text-muted-foreground">{deck.title}</p>
        </div>
      </div>

      {isVocab ? (
        <VocabCardForm onSubmit={handleVocabSubmit} isLoading={isSaving} />
      ) : (
        <GeneralCardForm onSubmit={handleGeneralSubmit} isLoading={isSaving} />
      )}

      <div className="mt-4 text-center">
        <Button
          variant="outline"
          onClick={() => router.push(`/decks/${deckId}`)}
        >
          완료 ({cardCount}장)
        </Button>
      </div>
    </div>
  );
}
