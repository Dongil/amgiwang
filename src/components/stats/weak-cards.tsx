"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface WeakCard {
  cardId: string;
  word?: string;
  frontText?: string;
  incorrectCount: number;
  totalAttempts: number;
}

interface WeakCardsProps {
  cards: WeakCard[];
}

export function WeakCards({ cards }: WeakCardsProps) {
  if (cards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">취약 카드 TOP 10</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[120px] items-center justify-center">
          <p className="text-sm text-muted-foreground">
            퀴즈 데이터가 쌓이면 취약 카드를 분석합니다
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1 text-sm">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          취약 카드 TOP {cards.length}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {cards.map((card, i) => {
          const errorRate = Math.round(
            (card.incorrectCount / card.totalAttempts) * 100
          );
          return (
            <div
              key={card.cardId}
              className="flex items-center gap-2 rounded-lg border p-2 text-sm"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {card.word || card.frontText}
              </span>
              <Badge
                variant={errorRate >= 70 ? "destructive" : "secondary"}
                className="shrink-0 text-[10px]"
              >
                오답 {errorRate}%
              </Badge>
              <span className="shrink-0 text-xs text-muted-foreground">
                {card.incorrectCount}/{card.totalAttempts}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
