"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText, Upload } from "lucide-react";
import type { Deck } from "@/types/database";

export default function UploadPdfPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: deckId } = use(params);

  const { data: deck, isLoading } = useQuery({
    queryKey: [...queryKeys.decks.detail(deckId), "pdf"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("decks")
        .select("id, title, deck_type")
        .eq("id", deckId)
        .single();
      if (error) throw error;
      return data as Pick<Deck, "id" | "title" | "deck_type">;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/decks/${deckId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-bold">PDF 업로드</h1>
          <p className="text-xs text-muted-foreground">{deck?.title}</p>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">PDF 업로드 기능</p>
            <p className="mt-1 text-sm text-muted-foreground">
              PDF를 업로드하면 AI가 내용을 분석해서
              {deck?.deck_type === "english_vocab" ? " 단어를 " : " 카드를 "}
              자동 생성합니다.
            </p>
          </div>

          <div className="w-full rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              PDF 파일을 끌어 놓거나 클릭하세요
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              AI 설정이 필요합니다
            </p>
          </div>

          <Button asChild variant="outline" size="sm">
            <Link href="/settings/ai">AI 설정하기</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="mt-4 text-center">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/decks/${deckId}/cards/new`}>직접 입력하기</Link>
        </Button>
      </div>
    </div>
  );
}
