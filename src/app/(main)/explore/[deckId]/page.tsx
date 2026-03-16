"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface PreviewData {
  deck: {
    id: string;
    title: string;
    description: string | null;
    deck_type: string;
    subject: string;
    color: string;
    card_count: number;
    import_count: number;
    owner: { id: string; display_name: string };
  };
  cards: Record<string, string>[];
  already_imported: boolean;
}

export default function DeckPreviewPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = use(params);
  const router = useRouter();
  const [cloning, setCloning] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["deck-preview", deckId],
    queryFn: async () => {
      const res = await fetch(`/api/decks/${deckId}/preview`);
      if (!res.ok) throw new Error("미리보기를 불러올 수 없습니다.");
      return res.json() as Promise<PreviewData>;
    },
  });

  async function handleClone() {
    setCloning(true);
    try {
      const res = await fetch(`/api/decks/${deckId}/clone`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const result = await res.json();
      toast.success(`${result.card_count}장의 카드를 가져왔습니다!`);
      router.push(`/decks/${result.deck_id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "가져오기에 실패했습니다.");
    } finally {
      setCloning(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-5 p-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data?.deck) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <p className="text-muted-foreground">덱을 찾을 수 없습니다.</p>
        <Button asChild variant="outline">
          <Link href="/explore">돌아가기</Link>
        </Button>
      </div>
    );
  }

  const { deck, cards, already_imported } = data;
  const isVocab = deck.deck_type === "english_vocab";

  return (
    <div className="space-y-5 p-5 pb-28">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="뒤로 가기">
          <Link href="/explore">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <span className="text-sm text-muted-foreground">덱 미리보기</span>
      </div>

      {/* 덱 정보 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">{isVocab ? "🔤" : "📖"}</span>
          <h1 className="text-xl font-bold tracking-tight">{deck.title}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {deck.owner.display_name} · {deck.subject} · {deck.card_count}
          {isVocab ? "단어" : "카드"}
        </p>
        {deck.import_count > 0 && (
          <Badge variant="secondary" className="text-xs">
            <Download className="mr-1 h-3 w-3" aria-hidden="true" />
            {deck.import_count}회 가져감
          </Badge>
        )}
        {deck.description && (
          <p className="text-sm text-muted-foreground">{deck.description}</p>
        )}
      </div>

      {/* 미리보기 카드 */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          미리보기 ({cards.length}/{deck.card_count})
        </p>
        {cards.map((card, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              {isVocab ? (
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="font-medium">{card.word}</span>
                    {card.phonetic && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {card.phonetic}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">{card.meaning}</span>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium">{card.front_text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{card.back_text}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-20 left-0 right-0 mx-auto max-w-md px-5">
        <Button
          onClick={handleClone}
          disabled={cloning || already_imported}
          className="h-12 w-full rounded-xl text-base shadow-lg"
        >
          {cloning ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {already_imported ? "이미 가져온 덱입니다" : "내 덱에 추가"}
        </Button>
      </div>
    </div>
  );
}
