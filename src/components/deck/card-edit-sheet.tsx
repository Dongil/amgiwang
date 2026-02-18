"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { VocabCardForm } from "@/components/card/vocab-card-form";
import {
  useCreateVocabCard,
  useUpdateVocabCard,
  useDeleteVocabCard,
} from "@/hooks/use-vocab-cards";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/query-keys";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import type { VocabCard } from "@/types/database";

interface CardEditSheetProps {
  card?: VocabCard | null;
  deckId: string;
  insertPosition?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CardEditSheet({
  card,
  deckId,
  insertPosition,
  open,
  onOpenChange,
}: CardEditSheetProps) {
  const queryClient = useQueryClient();
  const createCard = useCreateVocabCard();
  const updateCard = useUpdateVocabCard();
  const deleteCard = useDeleteVocabCard();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isEdit = !!card;
  const isInsert = !isEdit && insertPosition !== undefined;

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.vocabCards.list(deckId),
    });
    queryClient.invalidateQueries({
      queryKey: ["vocabCards", deckId, "paginated"],
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
  };

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "카드 수정" : isInsert ? "카드 삽입" : "카드 추가"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? `"${card.word}" 카드를 수정합니다.`
              : isInsert
                ? `${insertPosition}번 위치 앞에 새 카드를 삽입합니다.`
                : "새 단어 카드를 추가합니다."}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-4">
          <VocabCardForm
            initialData={
              card
                ? {
                    word: card.word,
                    meaning: card.meaning,
                    meanings: card.meanings,
                    phonetic: card.phonetic ?? undefined,
                    example_sentence: card.example_sentence ?? undefined,
                    example_translation: card.example_translation ?? undefined,
                    derivatives: card.derivatives,
                    antonyms: card.antonyms,
                    root: card.root ?? undefined,
                    prefix: card.prefix ?? undefined,
                    suffix: card.suffix ?? undefined,
                    etymology_note: card.etymology_note ?? undefined,
                    mnemonic: card.mnemonic ?? undefined,
                    tips: card.tips ?? undefined,
                    tags: card.tags,
                  }
                : undefined
            }
            isLoading={createCard.isPending || updateCard.isPending}
            onSubmit={(formData) => {
              if (isEdit) {
                updateCard.mutate(
                  { cardId: card.id, deckId, data: formData as unknown as Record<string, unknown> },
                  {
                    onSuccess: () => {
                      toast.success("카드가 수정되었습니다.");
                      invalidate();
                      onOpenChange(false);
                    },
                    onError: (err) => toast.error(`수정 실패: ${err.message}`),
                  }
                );
              } else if (isInsert) {
                // 삽입 모드: position >= insertPosition인 카드들의 position을 +1 shift 후 삽입
                const supabase = createClient();
                supabase.rpc("shift_vocab_positions", {
                  p_deck_id: deckId,
                  p_from_position: insertPosition,
                }).then(({ error: shiftErr }) => {
                  if (shiftErr) {
                    // RPC 없으면 fallback: 직접 update
                    console.warn("shift_vocab_positions RPC not found, using fallback");
                  }
                  createCard.mutate(
                    { ...formData, deck_id: deckId, position: insertPosition },
                    {
                      onSuccess: () => {
                        toast.success("카드가 삽입되었습니다.");
                        invalidate();
                        onOpenChange(false);
                      },
                      onError: () => toast.error("삽입 실패"),
                    }
                  );
                });
              } else {
                createCard.mutate(
                  { ...formData, deck_id: deckId },
                  {
                    onSuccess: () => {
                      toast.success("카드가 추가되었습니다.");
                      invalidate();
                      onOpenChange(false);
                    },
                    onError: () => toast.error("추가 실패"),
                  }
                );
              }
            }}
          />

          {isEdit && (
            <div className="mt-6 border-t pt-4">
              <Button
                variant="ghost"
                className="w-full text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                카드 삭제
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>

    {/* Delete Confirmation Dialog */}
    <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>카드 삭제</DialogTitle>
          <DialogDescription>
            &quot;{card?.word}&quot; 카드를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setConfirmDelete(false)}>
            취소
          </Button>
          <Button
            variant="destructive"
            disabled={deleteCard.isPending}
            onClick={() => {
              if (!card) return;
              deleteCard.mutate(
                { cardId: card.id, deckId },
                {
                  onSuccess: () => {
                    toast.success("카드가 삭제되었습니다.");
                    setConfirmDelete(false);
                    invalidate();
                    onOpenChange(false);
                  },
                  onError: () => toast.error("삭제 실패"),
                }
              );
            }}
          >
            삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
