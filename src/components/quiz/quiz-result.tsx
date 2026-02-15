"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, RotateCcw, ArrowLeft, Check, X } from "lucide-react";
import type { QuizAnswer, QuizQuestion } from "@/hooks/use-quiz";

interface QuizResultProps {
  score: number;
  totalQuestions: number;
  timeSpent: number;
  answers: QuizAnswer[];
  questions: QuizQuestion[];
  deckId: string;
  onRetry: () => void;
}

export function QuizResult({
  score,
  totalQuestions,
  timeSpent,
  answers,
  questions,
  deckId,
  onRetry,
}: QuizResultProps) {
  const percentage = Math.round((score / totalQuestions) * 100);
  const minutes = Math.floor(timeSpent / 60);
  const seconds = timeSpent % 60;

  let grade: { label: string; color: string };
  if (percentage >= 90) grade = { label: "우수", color: "text-green-500" };
  else if (percentage >= 70) grade = { label: "양호", color: "text-blue-500" };
  else if (percentage >= 50) grade = { label: "보통", color: "text-yellow-500" };
  else grade = { label: "노력 필요", color: "text-red-500" };

  return (
    <div className="space-y-4">
      {/* 점수 요약 */}
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Trophy className={`h-8 w-8 ${grade.color}`} />
          </div>
          <div className="text-center">
            <p className={`text-3xl font-bold ${grade.color}`}>
              {score}/{totalQuestions}
            </p>
            <p className="text-sm text-muted-foreground">
              정답률 {percentage}% · {grade.label}
            </p>
          </div>
          <Progress value={percentage} className="w-full" />
          <p className="text-xs text-muted-foreground">
            소요 시간: {minutes > 0 ? `${minutes}분 ` : ""}
            {seconds}초
          </p>
        </CardContent>
      </Card>

      {/* 오답 목록 */}
      {answers.some((a) => !a.isCorrect) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">오답 노트</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {answers.map((answer, i) => {
              const question = questions.find((q) => q.id === answer.questionId);
              if (!question) return null;

              return (
                <div
                  key={i}
                  className={`flex items-start gap-2 rounded-lg border p-2 text-sm ${
                    answer.isCorrect ? "opacity-50" : ""
                  }`}
                >
                  {answer.isCorrect ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  ) : (
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{question.question}</p>
                    {!answer.isCorrect && (
                      <div className="mt-1 space-y-0.5">
                        <p className="text-red-500">
                          내 답: {answer.userAnswer}
                        </p>
                        <p className="text-green-600">
                          정답: {question.correctAnswer}
                        </p>
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {Math.round(answer.timeSpent)}s
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* 액션 버튼 */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={onRetry}>
          <RotateCcw className="mr-2 h-4 w-4" />
          다시 풀기
        </Button>
        <Button asChild>
          <Link href={`/decks/${deckId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            덱으로 이동
          </Link>
        </Button>
      </div>
    </div>
  );
}
