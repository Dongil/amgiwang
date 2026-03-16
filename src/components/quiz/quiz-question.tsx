"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Volume2 } from "lucide-react";
import type { QuizQuestion as QuizQuestionType } from "@/hooks/use-quiz";

interface QuizQuestionProps {
  question: QuizQuestionType;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string) => boolean | undefined;
}

export function QuizQuestion({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
}: QuizQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when question changes
  useEffect(() => {
    setSelectedAnswer(null);
    setTypedAnswer("");
    setShowResult(false);
    setIsCorrect(false);
    setElapsed(0);
    if (!question.choices) {
      inputRef.current?.focus();
    }
  }, [question.id, question.choices]);

  // Elapsed timer
  useEffect(() => {
    if (showResult) return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [question.id, showResult]);

  // TTS for listening quiz
  useEffect(() => {
    if (question.type === "listening") {
      speak(question.question);
    }
  }, [question.id, question.type, question.question]);

  function speak(text: string) {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  }

  function handleChoiceSelect(choice: string) {
    if (showResult) return;
    setSelectedAnswer(choice);
    const correct = onAnswer(choice);
    setIsCorrect(correct ?? false);
    setShowResult(true);
    setTimeout(() => {
      // auto-advance handled by parent
    }, 1000);
  }

  function handleTypedSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (showResult || !typedAnswer.trim()) return;
    setSelectedAnswer(typedAnswer.trim());
    const correct = onAnswer(typedAnswer.trim());
    setIsCorrect(correct ?? false);
    setShowResult(true);
  }

  const quizTypeLabel: Record<string, string> = {
    eng_to_kor: "영→한",
    kor_to_eng: "한→영",
    fill_blank: "빈칸 채우기",
    listening: "듣기",
    multiple_choice: "객관식",
    ox: "O/X",
  };

  return (
    <div className="space-y-4">
      {/* 진행바 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <Badge variant="outline">{quizTypeLabel[question.type] || question.type}</Badge>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {Math.floor(elapsed / 60) > 0 && `${Math.floor(elapsed / 60)}:`}
            {String(elapsed % 60).padStart(Math.floor(elapsed / 60) > 0 ? 2 : 1, "0")}초
          </span>
          <span>
            {questionNumber}/{totalQuestions}
          </span>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
        />
      </div>

      {/* 문제 */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            {question.type === "listening" ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">들리는 단어의 뜻을 고르세요</p>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => speak(question.question)}
                  className="h-16 w-16 rounded-full"
                >
                  <Volume2 className="h-8 w-8" />
                </Button>
              </div>
            ) : (
              <>
                <p className="text-xl font-bold">{question.question}</p>
                {question.hint && (
                  <p className="mt-1 text-sm text-muted-foreground">{question.hint}</p>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 답변 영역 */}
      {question.choices ? (
        <div className="grid grid-cols-1 gap-3">
          {question.choices.map((choice, i) => {
            let borderClass = "border-border";
            let bgClass = "";
            if (showResult) {
              if (choice === question.correctAnswer) {
                borderClass = "border-primary";
                bgClass = "bg-primary/10";
              } else if (choice === selectedAnswer) {
                borderClass = "border-destructive";
                bgClass = "bg-destructive/10";
              }
            } else if (choice === selectedAnswer) {
              borderClass = "border-primary";
              bgClass = "bg-primary/5";
            }

            return (
              <button
                key={i}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors ${borderClass} ${bgClass}`}
                onClick={() => handleChoiceSelect(choice)}
                disabled={showResult}
              >
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {i + 1}
                </span>
                <span className="text-sm">{choice}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <form onSubmit={handleTypedSubmit} className="space-y-3">
          <Input
            ref={inputRef}
            placeholder="답을 입력하세요…"
            value={typedAnswer}
            onChange={(e) => setTypedAnswer(e.target.value)}
            disabled={showResult}
            autoFocus
          />
          {!showResult && (
            <Button type="submit" className="w-full" disabled={!typedAnswer.trim()}>
              확인
            </Button>
          )}
          {showResult && (
            <div
              className={`rounded-lg p-3 text-center text-sm ${
                isCorrect
                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                  : "bg-red-500/10 text-red-700 dark:text-red-400"
              }`}
            >
              {isCorrect ? (
                "정답!"
              ) : (
                <>
                  오답! 정답: <span className="font-bold">{question.correctAnswer}</span>
                </>
              )}
            </div>
          )}
        </form>
      )}

      {/* 결과 표시 (객관식) */}
      {showResult && question.choices && (
        <div
          className={`rounded-lg p-3 text-center text-sm ${
            isCorrect
              ? "bg-green-500/10 text-green-700 dark:text-green-400"
              : "bg-red-500/10 text-red-700 dark:text-red-400"
          }`}
        >
          {isCorrect ? "정답!" : "오답!"}
        </div>
      )}
    </div>
  );
}
