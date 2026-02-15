"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { VocabMeaning, VocabRelated } from "@/types/database";

interface GeneratedVocabCard {
  word: string;
  phonetic?: string | null;
  meanings: VocabMeaning[];
  example_sentence?: string | null;
  example_translation?: string | null;
  derivatives?: VocabRelated[];
  antonyms?: VocabRelated[];
  tips?: string | null;
  difficulty_level?: number;
  tags?: string[];
  _selected?: boolean;
}

interface GeneratedCard {
  front_text: string;
  back_text: string;
  tags?: string[];
  _selected?: boolean;
}

interface TextCardGeneratorProps {
  deckId: string;
  deckType: string;
  subject: string;
  onComplete: (count: number) => void;
}

export function TextCardGenerator({
  deckId,
  deckType,
  subject,
  onComplete,
}: TextCardGeneratorProps) {
  const isVocab = deckType === "english_vocab";
  const [text, setText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [cards, setCards] = useState<(GeneratedVocabCard | GeneratedCard)[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleGenerate() {
    if (!text.trim()) {
      toast.error("텍스트를 입력해주세요.");
      return;
    }

    setIsGenerating(true);
    try {
      const endpoint = isVocab ? "/api/ai/generate-vocab" : "/api/ai/generate-cards";
      const body = isVocab
        ? { text: text.trim(), mode: "text" }
        : { text: text.trim(), subject };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "생성 실패");
      }

      const data = await res.json();
      const generated = (data.cards || []).map(
        (c: GeneratedVocabCard | GeneratedCard) => ({
          ...c,
          _selected: true,
        })
      );
      setCards(generated);
      toast.success(`${generated.length}개 카드 생성!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "카드 생성 실패");
    } finally {
      setIsGenerating(false);
    }
  }

  function toggleCard(index: number) {
    setCards((prev) =>
      prev.map((c, i) =>
        i === index ? { ...c, _selected: !c._selected } : c
      )
    );
  }

  async function handleSave() {
    const selected = cards.filter((c) => c._selected);
    if (selected.length === 0) return;

    setSaving(true);
    try {
      const { supabaseMutate } = await import("@/lib/supabase/client");

      if (isVocab) {
        const vocabCards = selected.map((c, i) => {
          const vc = c as GeneratedVocabCard;
          return {
            deck_id: deckId,
            word: vc.word,
            meaning: vc.meanings?.[0]?.meaning || "",
            meanings: vc.meanings || [],
            phonetic: vc.phonetic || null,
            example_sentence: vc.example_sentence || null,
            example_translation: vc.example_translation || null,
            derivatives: vc.derivatives || [],
            antonyms: vc.antonyms || [],
            tips: vc.tips || null,
            difficulty_level: vc.difficulty_level || 2,
            tags: vc.tags || [],
            position: i,
          };
        });

        const { error } = await supabaseMutate(
          "vocab_cards",
          "POST",
          vocabCards as unknown as Record<string, unknown>[]
        );
        if (error) throw new Error(error);
      } else {
        const generalCards = selected.map((c, i) => {
          const gc = c as GeneratedCard;
          return {
            deck_id: deckId,
            front_text: gc.front_text,
            back_text: gc.back_text,
            tags: gc.tags || [],
            position: i,
          };
        });

        const { error } = await supabaseMutate(
          "cards",
          "POST",
          generalCards as unknown as Record<string, unknown>[]
        );
        if (error) throw new Error(error);
      }

      toast.success(`${selected.length}개 카드가 저장되었습니다!`);
      onComplete(selected.length);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = cards.filter((c) => c._selected).length;

  return (
    <div className="space-y-4">
      {cards.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">텍스트로 카드 생성</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder={
                isVocab
                  ? "단어를 입력하세요 (줄바꿈으로 구분)\n예: apple\nbanana\ncherry"
                  : "학습 내용을 입력하세요...\nAI가 자동으로 카드를 생성합니다."
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
            />
            <Button
              onClick={handleGenerate}
              disabled={!text.trim() || isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  AI 생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI 카드 생성
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {cards.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm">
              <Badge variant="secondary">{selectedCount}/{cards.length}</Badge> 카드 선택됨
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCards([])}>
                다시 생성
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || selectedCount === 0}
              >
                {saving ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : null}
                저장
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {cards.map((card, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                  card._selected ? "" : "opacity-40"
                }`}
              >
                <button onClick={() => toggleCard(i)} className="mt-0.5 shrink-0">
                  {card._selected ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-400" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  {isVocab ? (
                    <>
                      <p className="font-medium">
                        {(card as GeneratedVocabCard).word}
                        {(card as GeneratedVocabCard).phonetic && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            {(card as GeneratedVocabCard).phonetic}
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground">
                        {(card as GeneratedVocabCard).meanings
                          ?.map((m) => `${m.pos ? `(${m.pos}) ` : ""}${m.meaning}`)
                          .join(" / ")}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">{(card as GeneratedCard).front_text}</p>
                      <p className="text-muted-foreground">
                        {(card as GeneratedCard).back_text}
                      </p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
