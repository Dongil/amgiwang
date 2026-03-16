"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
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

type DayStatus = "pending" | "processing" | "success" | "error";

interface DayResult {
  status: DayStatus;
  cards: (GeneratedVocabCard | GeneratedCard)[];
  error?: string;
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

  // Day별 선택 및 결과 상태
  const [selectedDays, setSelectedDays] = useState<Set<number>>(
    new Set(dayGroups.slice(0, 5).map((d) => d.dayNumber))
  );
  const [dayResults, setDayResults] = useState<Map<number, DayResult>>(
    new Map()
  );
  const [processing, setProcessing] = useState(false);
  const [currentDay, setCurrentDay] = useState<number | null>(null);
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

  // 추출 안 된/실패 Day만 선택
  function selectUnprocessed() {
    const unprocessed = dayGroups
      .filter((d) => {
        const result = dayResults.get(d.dayNumber);
        return !result || result.status === "error";
      })
      .map((d) => d.dayNumber);
    setSelectedDays(new Set(unprocessed));
  }

  // Day 상태 아이콘
  function getDayStatusIcon(dayNum: number) {
    const result = dayResults.get(dayNum);
    if (!result) return null;
    if (result.status === "processing")
      return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
    if (result.status === "success")
      return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    if (result.status === "error")
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    return null;
  }

  // AI 카드 생성 (선택된 Day 중 미처리/에러만)
  const handleGenerate = useCallback(async () => {
    const daysToProcess = dayGroups.filter((d) => {
      if (!selectedDays.has(d.dayNumber)) return false;
      const result = dayResults.get(d.dayNumber);
      // 미처리 또는 에러인 Day만
      return !result || result.status === "error" || result.status === "pending";
    });

    if (daysToProcess.length === 0) {
      toast.error("처리할 Day가 없습니다. (이미 추출 완료된 Day는 건너뜁니다)");
      return;
    }

    setProcessing(true);
    let processedCount = 0;

    for (const day of daysToProcess) {
      setCurrentDay(day.dayNumber);
      setDayResults((prev) => {
        const next = new Map(prev);
        next.set(day.dayNumber, { status: "processing", cards: [] });
        return next;
      });

      try {
        const endpoint = isVocab
          ? "/api/ai/generate-vocab"
          : "/api/ai/generate-cards";
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

        setDayResults((prev) => {
          const next = new Map(prev);
          next.set(day.dayNumber, { status: "success", cards });
          return next;
        });

        processedCount++;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "생성 실패";
        setDayResults((prev) => {
          const next = new Map(prev);
          next.set(day.dayNumber, {
            status: "error",
            cards: [],
            error: errorMsg,
          });
          return next;
        });
        toast.error(`Day ${day.dayNumber}: ${errorMsg}`);
      }
    }

    setProcessing(false);
    setCurrentDay(null);

    if (processedCount > 0) {
      toast.success(`${processedCount}개 Day 처리 완료!`);
    }
  }, [dayGroups, selectedDays, dayResults, isVocab]);

  function toggleCard(dayNumber: number, index: number) {
    setDayResults((prev) => {
      const next = new Map(prev);
      const result = next.get(dayNumber);
      if (!result) return prev;
      const cards = [...result.cards];
      cards[index] = { ...cards[index], _selected: !cards[index]._selected };
      next.set(dayNumber, { ...result, cards });
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    let totalSaved = 0;

    try {
      for (const [dayNumber, result] of dayResults) {
        if (result.status !== "success") continue;
        const selected = result.cards.filter((c) => c._selected);
        if (selected.length === 0) continue;

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

  // 통계 계산
  const successDays = [...dayResults.values()].filter(
    (r) => r.status === "success"
  ).length;
  const errorDays = [...dayResults.values()].filter(
    (r) => r.status === "error"
  ).length;
  const totalGenerated = [...dayResults.values()].reduce(
    (sum, r) => sum + (r.status === "success" ? r.cards.length : 0),
    0
  );
  const totalSelected = [...dayResults.values()].reduce(
    (sum, r) =>
      sum +
      (r.status === "success"
        ? r.cards.filter((c) => c._selected).length
        : 0),
    0
  );

  // 진행률
  const processedCount = [...dayResults.values()].filter(
    (r) => r.status === "success" || r.status === "error"
  ).length;

  return (
    <div className="space-y-4">
      {/* Day 선택 그리드 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Day 선택</CardTitle>
            <div className="flex gap-1">
              {errorDays > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectUnprocessed}
                  className="text-xs"
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  실패 Day만
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                {selectedDays.size === dayGroups.length
                  ? "전체 해제"
                  : "전체 선택"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {dayGroups.map((day) => {
              const result = dayResults.get(day.dayNumber);
              const statusIcon = getDayStatusIcon(day.dayNumber);
              return (
                <button
                  key={day.dayNumber}
                  onClick={() => toggleDay(day.dayNumber)}
                  disabled={processing}
                  className={`relative rounded-lg border-2 p-2 text-center text-xs transition-colors ${
                    selectedDays.has(day.dayNumber)
                      ? "border-primary bg-primary/5 font-medium"
                      : "border-border text-muted-foreground"
                  } ${
                    result?.status === "success"
                      ? "bg-green-50 dark:bg-green-950/20"
                      : result?.status === "error"
                        ? "bg-red-50 dark:bg-red-950/20"
                        : ""
                  }`}
                >
                  <span className="flex items-center justify-center gap-1">
                    {statusIcon}
                    Day {day.dayNumber}
                  </span>
                  {result?.status === "success" && (
                    <span className="text-[10px] text-green-600">
                      {result.cards.length}개
                    </span>
                  )}
                  {result?.status === "error" && (
                    <span className="text-[10px] text-red-500">실패</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 상태 요약 & 액션 버튼 */}
          <div className="mt-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">
                {selectedDays.size}개 Day 선택됨
                {processedCount > 0 && (
                  <span className="ml-2">
                    (완료 {successDays}
                    {errorDays > 0 && (
                      <span className="text-red-500">
                        {" "}
                        / 실패 {errorDays}
                      </span>
                    )}
                    )
                  </span>
                )}
              </p>
              {totalGenerated > 0 && (
                <p className="text-xs font-medium text-green-600">
                  총 {totalGenerated}개 카드 생성됨
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleGenerate}
                disabled={selectedDays.size === 0 || processing}
                size="sm"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    Day {currentDay} 처리 중…
                  </>
                ) : errorDays > 0 ? (
                  <>
                    <RefreshCw className="mr-1 h-3.5 w-3.5" />
                    재추출
                  </>
                ) : (
                  "AI 카드 생성"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 처리 진행률 */}
      {processing && (
        <Progress
          value={
            (([...dayResults.values()].filter(
              (r) => r.status === "success" || r.status === "error"
            ).length) /
              [...selectedDays].filter((d) => {
                const r = dayResults.get(d);
                return !r || r.status !== "success";
              }).length) *
            100
          }
          className="h-1.5"
        />
      )}

      {/* 생성된 카드 미리보기 */}
      {totalGenerated > 0 && !processing && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {totalSelected}/{totalGenerated}개 카드 선택됨
            </p>
            <Button
              onClick={handleSave}
              disabled={saving || totalSelected === 0}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중…
                </>
              ) : (
                `${totalSelected}개 카드 저장`
              )}
            </Button>
          </div>

          {[...dayResults.entries()]
            .filter(([, r]) => r.status === "success" && r.cards.length > 0)
            .sort(([a], [b]) => a - b)
            .map(([dayNumber, result]) => (
              <Card key={dayNumber}>
                <CardHeader
                  className="cursor-pointer py-3"
                  onClick={() =>
                    setExpandedDay(
                      expandedDay === dayNumber ? null : dayNumber
                    )
                  }
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Day {dayNumber}
                      <Badge variant="secondary">
                        {result.cards.filter((c) => c._selected).length}/
                        {result.cards.length}
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
                    {result.cards.map((card, i) => (
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

          {/* 에러 Day 목록 */}
          {errorDays > 0 && (
            <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
              <CardContent className="p-4">
                <p className="mb-2 text-sm font-medium text-red-600">
                  {errorDays}개 Day 추출 실패
                </p>
                {[...dayResults.entries()]
                  .filter(([, r]) => r.status === "error")
                  .map(([dayNum, r]) => (
                    <p
                      key={dayNum}
                      className="text-xs text-red-500"
                    >
                      Day {dayNum}: {r.error}
                    </p>
                  ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    selectUnprocessed();
                    setTimeout(handleGenerate, 100);
                  }}
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  실패 Day 재시도
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
