"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, Loader2 } from "lucide-react";
import { useQuiz } from "@/hooks/use-quiz";
import type { QuizQuestion as QuizQuestionType } from "@/hooks/use-quiz";
import { QuizQuestion } from "./quiz-question";
import { QuizResult } from "./quiz-result";
import { supabaseMutate } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import type { VocabCard, Card as CardType, QuizType } from "@/types/database";

interface QuizSessionProps {
  deckId: string;
  deckType: "english_vocab" | "general";
  cards: (VocabCard | CardType)[];
}

type RangeFilter = "all" | "wrong" | string; // string = Day tag like "Day1"

const VOCAB_QUIZ_TYPES: { type: QuizType; label: string; description: string }[] = [
  { type: "eng_to_kor", label: "영→한", description: "단어를 보고 뜻 선택" },
  { type: "kor_to_eng", label: "한→영", description: "뜻을 보고 단어 입력" },
  { type: "fill_blank", label: "빈칸 채우기", description: "예문의 빈칸 채우기" },
  { type: "listening", label: "듣기", description: "발음을 듣고 뜻 선택" },
];

const GENERAL_QUIZ_TYPES: { type: QuizType; label: string; description: string }[] = [
  { type: "multiple_choice", label: "객관식", description: "4지선다 문제" },
  { type: "ox", label: "O/X", description: "맞다/틀리다 판별" },
];

const QUESTION_COUNTS = [5, 10, 15, 20];

export function QuizSession({ deckId, deckType, cards }: QuizSessionProps) {
  const user = useAuthStore((s) => s.user);
  const isVocab = deckType === "english_vocab";
  const availableTypes = isVocab ? VOCAB_QUIZ_TYPES : GENERAL_QUIZ_TYPES;

  const [selectedTypes, setSelectedTypes] = useState<Set<QuizType>>(
    new Set([availableTypes[0].type])
  );
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>("all");
  const [questionCount, setQuestionCount] = useState(
    Math.min(10, cards.length)
  );
  const [isStarted, setIsStarted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [useAIChoices, setUseAIChoices] = useState(false);
  const [aiEnhancing, setAiEnhancing] = useState(false);

  // Extract unique Day tags from cards
  const dayTags = useMemo(() => {
    const tags = new Set<string>();
    for (const card of cards) {
      const cardTags = "tags" in card ? (card.tags as string[]) : [];
      for (const tag of cardTags) {
        if (/^Day\s?\d+$/i.test(tag)) {
          tags.add(tag);
        }
      }
    }
    return Array.from(tags).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""));
      const numB = parseInt(b.replace(/\D/g, ""));
      return numA - numB;
    });
  }, [cards]);

  // Filter cards by range
  const filteredCards = useMemo(() => {
    if (rangeFilter === "all") return cards;
    if (rangeFilter === "wrong") return cards; // TODO: filter by past wrong answers when quiz_results tracking is richer
    // Day tag filter
    return cards.filter((card) => {
      const cardTags = "tags" in card ? (card.tags as string[]) : [];
      return cardTags.some((t) => t.toLowerCase() === rangeFilter.toLowerCase());
    });
  }, [cards, rangeFilter]);

  const {
    questions,
    currentIndex,
    currentQuestion,
    answers,
    isFinished,
    score,
    totalQuestions,
    totalTimeSpent,
    generateQuestions,
    submitAnswer,
    replaceQuestions,
  } = useQuiz({
    cards: filteredCards,
    deckType,
    quizTypes: Array.from(selectedTypes),
    questionCount: Math.min(questionCount, filteredCards.length),
  });

  function toggleType(type: QuizType) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  async function enhanceChoicesWithAI(qs: QuizQuestionType[]) {
    const choiceQuestions = qs.filter(
      (q) => q.choices && q.choices.length > 0 && q.type !== "ox"
    );
    if (choiceQuestions.length === 0) return qs;

    try {
      const enhanced = await Promise.all(
        choiceQuestions.map(async (q) => {
          try {
            const res = await fetch("/api/ai/generate-quiz", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                correctAnswer: q.correctAnswer,
                context: q.question,
                quizType: q.type,
              }),
            });
            if (!res.ok) return null;
            const data = await res.json();
            if (data.choices && Array.isArray(data.choices)) {
              const allChoices = [q.correctAnswer, ...data.choices.slice(0, 3)];
              // shuffle
              for (let i = allChoices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allChoices[i], allChoices[j]] = [allChoices[j], allChoices[i]];
              }
              return { ...q, choices: allChoices };
            }
            return null;
          } catch {
            return null;
          }
        })
      );

      const enhancedMap = new Map<string, QuizQuestionType>();
      enhanced.forEach((q, i) => {
        if (q) enhancedMap.set(choiceQuestions[i].id, q);
      });

      return qs.map((q) => enhancedMap.get(q.id) || q);
    } catch {
      return qs;
    }
  }

  async function handleStart() {
    const generated = generateQuestions();
    setIsStarted(true);

    if (useAIChoices && generated && generated.length > 0) {
      setAiEnhancing(true);
      const enhanced = await enhanceChoicesWithAI(generated);
      replaceQuestions(enhanced);
      setAiEnhancing(false);
    }
  }

  const handleAnswer = useCallback(
    (answer: string) => {
      const result = submitAnswer(answer);
      return result;
    },
    [submitAnswer]
  );

  async function handleRetry() {
    setIsStarted(false);
  }

  // 결과 저장
  async function saveResult() {
    if (!user || saving) return;
    setSaving(true);
    try {
      await supabaseMutate("quiz_results", "POST", {
        user_id: user.id,
        deck_id: deckId,
        quiz_type: Array.from(selectedTypes)[0],
        score,
        total_questions: totalQuestions,
        time_spent_sec: totalTimeSpent,
        answers: answers.reduce(
          (acc, a) => ({ ...acc, [a.cardId]: { correct: a.isCorrect, time: a.timeSpent } }),
          {}
        ),
      });
    } catch {
      // silent fail - quiz results are optional
    } finally {
      setSaving(false);
    }
  }

  // Auto-save when quiz finishes
  if (isFinished && !saving && user) {
    saveResult();
  }

  // Setup screen
  if (!isStarted) {
    return (
      <div className="space-y-4">
        {/* 출제 범위 */}
        {dayTags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">출제 범위</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={rangeFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRangeFilter("all")}
                >
                  전체
                </Button>
                {dayTags.map((tag) => (
                  <Button
                    key={tag}
                    variant={rangeFilter === tag ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRangeFilter(tag)}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {rangeFilter === "all"
                  ? `전체 ${cards.length}장`
                  : `${filteredCards.length}장 선택됨`}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 퀴즈 유형 선택 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">퀴즈 유형</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {availableTypes.map(({ type, label, description }) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`rounded-lg border-2 p-3 text-left transition-colors ${
                    selectedTypes.has(type)
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 문제 수 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">문제 수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {QUESTION_COUNTS.filter((c) => c <= filteredCards.length).map((count) => (
                <Button
                  key={count}
                  variant={questionCount === count ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuestionCount(count)}
                >
                  {count}문제
                </Button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {filteredCards.length}장의 카드에서 출제
            </p>
          </CardContent>
        </Card>

        {/* AI 보기 생성 */}
        <button
          onClick={() => setUseAIChoices((v) => !v)}
          className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors ${
            useAIChoices ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <Sparkles className={`h-5 w-5 ${useAIChoices ? "text-primary" : "text-muted-foreground"}`} />
          <div>
            <p className="text-sm font-medium">AI 보기 생성</p>
            <p className="text-xs text-muted-foreground">
              AI가 더 정교한 오답 보기를 만들어줍니다
            </p>
          </div>
        </button>

        {/* 시작 버튼 */}
        <Button
          onClick={handleStart}
          className="w-full"
          size="lg"
          disabled={filteredCards.length < 4}
        >
          <Brain className="mr-2 h-5 w-5" />
          {filteredCards.length < 4
            ? `카드 부족 (최소 4장, 현재 ${filteredCards.length}장)`
            : "퀴즈 시작"}
        </Button>
      </div>
    );
  }

  // Quiz in progress
  if (!isFinished && currentQuestion) {
    return (
      <div className="space-y-2">
        {aiEnhancing && (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-primary/5 p-2 text-xs text-primary">
            <Loader2 className="h-3 w-3 animate-spin" />
            AI 보기 생성 중…
          </div>
        )}
        <QuizQuestion
          question={currentQuestion}
          questionNumber={currentIndex + 1}
          totalQuestions={totalQuestions}
          onAnswer={handleAnswer}
        />
      </div>
    );
  }

  // Quiz finished
  if (isFinished) {
    return (
      <QuizResult
        score={score}
        totalQuestions={totalQuestions}
        timeSpent={totalTimeSpent}
        answers={answers}
        questions={questions}
        deckId={deckId}
        onRetry={handleRetry}
      />
    );
  }

  return null;
}
