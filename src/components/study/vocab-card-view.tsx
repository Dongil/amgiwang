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
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 text-left">
      {/* 1. 영단어 + 발음기호 */}
      <div className="text-center">
        <p className="text-2xl font-bold">{card.word}</p>
        {card.phonetic && (
          <p className="text-sm text-muted-foreground">{card.phonetic}</p>
        )}
      </div>

      {/* 2. 뜻 목록 (품사별 + 동의어) */}
      {card.meanings && card.meanings.length > 0 && (
        <div className="space-y-2">
          {card.meanings.map((m, i) => (
            <div key={i}>
              <div className="flex items-baseline gap-2">
                {m.pos && (
                  <span className="inline-block rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                    {m.pos}
                  </span>
                )}
                <span className="font-medium">{m.meaning}</span>
              </div>
              {m.synonyms.length > 0 && (
                <p className="ml-6 text-xs text-muted-foreground">
                  = {m.synonyms.join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 3. 파생어 */}
      {card.derivatives && card.derivatives.length > 0 && (
        <div className="text-sm">
          <span className="font-medium">파생어: </span>
          {card.derivatives.map((d, i) => (
            <span key={i}>
              {i > 0 && ", "}
              {d.word}
              {d.meaning && (
                <span className="text-muted-foreground"> ({d.meaning})</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* 4. 반의어 */}
      {card.antonyms && card.antonyms.length > 0 && (
        <div className="text-sm">
          <span className="font-medium">반의어: </span>
          {card.antonyms.map((a, i) => (
            <span key={i}>
              {i > 0 && ", "}
              {a.word}
              {a.meaning && (
                <span className="text-muted-foreground"> ({a.meaning})</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* 5. 예문 + 해석 */}
      {card.example_sentence && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="italic">{card.example_sentence}</p>
          {card.example_translation && (
            <p className="mt-1 text-muted-foreground">{card.example_translation}</p>
          )}
        </div>
      )}

      {/* 6. 연상법 */}
      {card.mnemonic && (
        <p className="text-sm">
          <span className="font-medium">연상법: </span>
          {card.mnemonic}
        </p>
      )}

      {/* 7. Tips */}
      {card.tips && (
        <div className="whitespace-pre-line rounded-lg bg-amber-50 p-2 text-sm dark:bg-amber-950/30">
          <span className="font-medium">Tips: </span>
          {card.tips}
        </div>
      )}
    </div>
  );
}
