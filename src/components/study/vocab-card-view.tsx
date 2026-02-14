import { Volume2 } from "lucide-react";
import type { VocabCard } from "@/types/database";

export function VocabCardView({
  card,
  isFlipped,
  onSpeak,
}: {
  card: VocabCard;
  isFlipped: boolean;
  onSpeak: (text: string, lang?: string) => void;
}) {
  if (!isFlipped) {
    return (
      <div className="text-center">
        <p className="text-3xl font-bold">{card.word}</p>
        {card.phonetic && (
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">{card.phonetic}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSpeak(card.word);
              }}
              className="text-primary hover:text-primary/80"
            >
              <Volume2 className="h-4 w-4" />
            </button>
          </div>
        )}
        {card.part_of_speech && (
          <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs">
            {card.part_of_speech}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 text-left">
      <div className="text-center">
        <p className="text-2xl font-bold">{card.word}</p>
        <p className="text-lg font-medium text-primary">{card.meaning}</p>
        {card.meaning_sub && (
          <p className="text-sm text-muted-foreground">{card.meaning_sub}</p>
        )}
      </div>

      {card.example_sentence && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="italic">{card.example_sentence}</p>
          {card.example_translation && (
            <p className="mt-1 text-muted-foreground">{card.example_translation}</p>
          )}
        </div>
      )}

      {card.mnemonic && (
        <p className="text-sm">
          <span className="font-medium">연상법: </span>
          {card.mnemonic}
        </p>
      )}

      {(card.synonyms.length > 0 || card.antonyms.length > 0) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {card.synonyms.length > 0 && (
            <span className="text-muted-foreground">
              동의어: {card.synonyms.join(", ")}
            </span>
          )}
          {card.antonyms.length > 0 && (
            <span className="text-muted-foreground">
              반의어: {card.antonyms.join(", ")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
