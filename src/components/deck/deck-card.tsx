"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Deck } from "@/types/database";

interface DeckCardProps {
  deck: Deck;
}

export function DeckCard({ deck }: DeckCardProps) {
  const masteredRate =
    deck.card_count > 0
      ? Math.round((deck.mastered_count / deck.card_count) * 100)
      : 0;

  return (
    <Link href={`/decks/${deck.id}`}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span>
                  {deck.deck_type === "english_vocab" ? "🔤" : "📖"}
                </span>
                <h3 className="font-medium">{deck.title}</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {deck.subject} · {deck.card_count}
                {deck.deck_type === "english_vocab" ? "단어" : "카드"}
              </p>
            </div>
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: deck.color || "#6366f1" }}
            />
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>암기율</span>
              <span>{masteredRate}%</span>
            </div>
            <Progress value={masteredRate} className="mt-1 h-1.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
