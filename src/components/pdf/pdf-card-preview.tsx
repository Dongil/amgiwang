"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, X, Loader2, ChevronDown, ChevronUp } from "lucide-react";
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

interface DayGroup {
  dayNumber: number;
  pageNums: number[];
  text: string;
}

interface PdfCardPreviewProps {
  deckId: string;
  deckType: string;
  dayGroups: DayGroup[];
  onComplete: (count: number) => void;
}

export function PdfCardPreview({
  deckId,
  deckType,
  dayGroups,
  onComplete,
}: PdfCardPreviewProps) {
  const isVocab = deckType === "english_vocab";
  const [selectedDays, setSelectedDays] = useState<Set<number>>(
    new Set(dayGroups.slice(0, 5).map((d) => d.dayNumber))
  );
  const [processing, setProcessing] = useState(false);
  const [currentDay, setCurrentDay] = useState<number | null>(null);
  const [processedDays, setProcessedDays] = useState(0);
  const [generatedCards, setGeneratedCards] = useState<
    Map<number, (GeneratedVocabCard | GeneratedCard)[]>
  >(new Map());
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleDay(day: number) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedDays.size === dayGroups.length) {
      setSelectedDays(new Set());
    } else {
      setSelectedDays(new Set(dayGroups.map((d) => d.dayNumber)));
    }
  }

  async function handleGenerate() {
    if (selectedDays.size === 0) {
      toast.error("처리할 Day를 선택해주세요.");
      return;
    }

    setProcessing(true);
    setProcessedDays(0);
    const results = new Map<number, (GeneratedVocabCard | GeneratedCard)[]>();
    const daysToProcess = dayGroups.filter((d) => selectedDays.has(d.dayNumber));

    for (let i = 0; i < daysToProcess.length; i++) {
      const day = daysToProcess[i];
      setCurrentDay(day.dayNumber);

      try {
        const endpoint = isVocab ? "/api/ai/generate-vocab" : "/api/ai/generate-cards";
        const body = isVocab
          ? { text: day.text, dayLabel: `Day${day.dayNumber}`, mode: "pdf" }
          : { text: day.text, subject: "일반" };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `Day ${day.dayNumber} 처리 실패`);
        }

        const data = await res.json();
        const cards = (data.cards || []).map(
          (c: GeneratedVocabCard | GeneratedCard) => ({
            ...c,
            _selected: true,
          })
        );
        results.set(day.dayNumber, cards);
      } catch (err) {
        toast.error(
          `Day ${day.dayNumber}: ${err instanceof Error ? err.message : "생성 실패"}`
        );
        results.set(day.dayNumber, []);
      }

      setProcessedDays(i + 1);
    }

    setGeneratedCards(results);
    setProcessing(false);
    setCurrentDay(null);

    const totalCards = Array.from(results.values()).reduce(
      (sum, cards) => sum + cards.filter((c) => c._selected).length,
      0
    );
    toast.success(`${totalCards}개 카드 생성 완료!`);
  }

  function toggleCard(dayNumber: number, index: number) {
    setGeneratedCards((prev) => {
      const next = new Map(prev);
      const cards = [...(next.get(dayNumber) || [])];
      cards[index] = { ...cards[index], _selected: !cards[index]._selected };
      next.set(dayNumber, cards);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    let totalSaved = 0;

    try {
      for (const [dayNumber, cards] of generatedCards) {
        const selected = cards.filter((c) => c._selected);
        if (selected.length === 0) continue;

        const endpoint = isVocab ? "/api/ai/generate-vocab" : "/api/ai/generate-cards";

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
              tags: vc.tags || [`Day${dayNumber}`],
              position: totalSaved + i,
            };
          });

          const { supabaseMutate } = await import("@/lib/supabase/client");
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
              tags: gc.tags || [`Day${dayNumber}`],
              position: totalSaved + i,
            };
          });

          const { supabaseMutate } = await import("@/lib/supabase/client");
          const { error } = await supabaseMutate(
            "cards",
            "POST",
            generalCards as unknown as Record<string, unknown>[]
          );
          if (error) throw new Error(error);
        }

        totalSaved += selected.length;
      }

      toast.success(`${totalSaved}개 카드가 저장되었습니다!`);
      onComplete(totalSaved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  const totalGenerated = Array.from(generatedCards.values()).reduce(
    (sum, cards) => sum + cards.length,
    0
  );
  const totalSelected = Array.from(generatedCards.values()).reduce(
    (sum, cards) => sum + cards.filter((c) => c._selected).length,
    0
  );

  return (
    <div className="space-y-4">
      {/* Day 선택 */}
      {generatedCards.size === 0 && !processing && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Day 선택</CardTitle>
              <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                {selectedDays.size === dayGroups.length ? "전체 해제" : "전체 선택"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {dayGroups.map((day) => (
                <button
                  key={day.dayNumber}
                  onClick={() => toggleDay(day.dayNumber)}
                  className={`rounded-lg border-2 p-2 text-center text-xs transition-colors ${
                    selectedDays.has(day.dayNumber)
                      ? "border-primary bg-primary/5 font-medium"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  Day {day.dayNumber}
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {selectedDays.size}개 Day 선택됨
              </p>
              <Button
                onClick={handleGenerate}
                disabled={selectedDays.size === 0}
                size="sm"
              >
                AI 카드 생성
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 처리 진행률 */}
      {processing && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Day {currentDay} 처리 중...
                </p>
                <p className="text-xs text-muted-foreground">
                  {processedDays}/{selectedDays.size} Day 완료
                </p>
              </div>
            </div>
            <Progress
              value={(processedDays / selectedDays.size) * 100}
              className="mt-3"
            />
          </CardContent>
        </Card>
      )}

      {/* 생성된 카드 미리보기 */}
      {generatedCards.size > 0 && !processing && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {totalSelected}/{totalGenerated}개 카드 선택됨
            </p>
            <Button onClick={handleSave} disabled={saving || totalSelected === 0}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                `${totalSelected}개 카드 저장`
              )}
            </Button>
          </div>

          {Array.from(generatedCards.entries()).map(([dayNumber, cards]) => (
            <Card key={dayNumber}>
              <CardHeader
                className="cursor-pointer"
                onClick={() =>
                  setExpandedDay(expandedDay === dayNumber ? null : dayNumber)
                }
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    Day {dayNumber}
                    <Badge variant="secondary" className="ml-2">
                      {cards.filter((c) => c._selected).length}/{cards.length}
                    </Badge>
                  </CardTitle>
                  {expandedDay === dayNumber ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </CardHeader>
              {expandedDay === dayNumber && (
                <CardContent className="space-y-2">
                  {cards.map((card, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2 rounded-lg border p-2 text-sm ${
                        card._selected ? "" : "opacity-40"
                      }`}
                    >
                      <button
                        onClick={() => toggleCard(dayNumber, i)}
                        className="mt-0.5 shrink-0"
                      >
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
                            <p className="text-xs text-muted-foreground">
                              {(card as GeneratedVocabCard).meanings
                                ?.map(
                                  (m) =>
                                    `${m.pos ? `(${m.pos}) ` : ""}${m.meaning}`
                                )
                                .join(" / ")}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium">
                              {(card as GeneratedCard).front_text}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(card as GeneratedCard).back_text}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
