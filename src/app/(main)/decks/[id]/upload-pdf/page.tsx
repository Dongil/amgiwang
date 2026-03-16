"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, Type } from "lucide-react";
import { PdfUploader } from "@/components/pdf/pdf-uploader";
import { PdfCardPreview } from "@/components/pdf/pdf-card-preview";
import { TextCardGenerator } from "@/components/pdf/text-card-generator";
import type { Deck } from "@/types/database";

interface ClassifiedPage {
  pageNum: number;
  text: string;
  type: "toc" | "vocab" | "quiz" | "plan" | "other";
  dayNumber?: number;
}

export default function UploadPdfPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: deckId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [parsedResult, setParsedResult] = useState<{
    totalPages: number;
    pages: ClassifiedPage[];
    fileUrl: string;
  } | null>(null);

  const { data: deck, isLoading } = useQuery({
    queryKey: [...queryKeys.decks.detail(deckId), "pdf"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("decks")
        .select("id, title, deck_type, subject")
        .eq("id", deckId)
        .single();
      if (error) throw error;
      return data as Pick<Deck, "id" | "title" | "deck_type" | "subject">;
    },
  });

  // PDF 분석 결과에서 Day 그룹 생성
  const dayGroups = useMemo(() => {
    if (!parsedResult) return [];
    const vocabPages = parsedResult.pages.filter((p) => p.type === "vocab");

    // Day 번호 없는 페이지는 직전 페이지의 Day를 상속
    let lastDay = 1;
    const pagesWithDay = vocabPages.map((page) => {
      if (page.dayNumber) lastDay = page.dayNumber;
      return { ...page, dayNumber: page.dayNumber || lastDay };
    });

    const grouped = new Map<number, { pageNums: number[]; texts: string[] }>();
    for (const page of pagesWithDay) {
      const existing = grouped.get(page.dayNumber) || { pageNums: [], texts: [] };
      existing.pageNums.push(page.pageNum);
      existing.texts.push(page.text);
      grouped.set(page.dayNumber, existing);
    }

    return Array.from(grouped.entries())
      .map(([dayNumber, { pageNums, texts }]) => ({
        dayNumber,
        pageNums,
        text: texts.join("\n\n"),
      }))
      .sort((a, b) => a.dayNumber - b.dayNumber);
  }, [parsedResult]);

  function handleComplete(count: number) {
    queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
    queryClient.invalidateQueries({
      queryKey: queryKeys.decks.detail(deckId),
    });
    if (deck?.deck_type === "english_vocab") {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vocabCards.list(deckId),
      });
    } else {
      queryClient.invalidateQueries({
        queryKey: queryKeys.cards.list(deckId),
      });
    }
    router.push(`/decks/${deckId}`);
  }

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
        <Button asChild variant="ghost" size="icon" aria-label="뒤로 가기">
          <Link href={`/decks/${deckId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-bold">카드 생성</h1>
          <p className="text-xs text-muted-foreground">{deck?.title}</p>
        </div>
      </div>

      <Tabs defaultValue="pdf">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pdf">
            <FileText className="mr-1 h-3 w-3" aria-hidden="true" />
            PDF 업로드
          </TabsTrigger>
          <TabsTrigger value="text">
            <Type className="mr-1 h-3 w-3" aria-hidden="true" />
            텍스트 입력
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pdf" className="mt-4 space-y-4">
          {!parsedResult ? (
            <PdfUploader
              deckId={deckId}
              deckType={deck?.deck_type || "general"}
              onParsed={setParsedResult}
            />
          ) : dayGroups.length > 0 ? (
            <PdfCardPreview
              deckId={deckId}
              deckType={deck?.deck_type || "general"}
              dayGroups={dayGroups}
              onComplete={handleComplete}
            />
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              <p>단어 페이지를 찾지 못했습니다.</p>
              <p className="mt-1">다른 PDF를 시도해보세요.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setParsedResult(null)}
              >
                다시 업로드
              </Button>
            </div>
          )}

          {parsedResult && (
            <div className="text-center text-xs text-muted-foreground">
              총 {parsedResult.totalPages}페이지 ·{" "}
              {parsedResult.pages.filter((p) => p.type === "vocab").length}개 단어 페이지 ·{" "}
              {dayGroups.length}개 Day
            </div>
          )}
        </TabsContent>

        <TabsContent value="text" className="mt-4">
          <TextCardGenerator
            deckId={deckId}
            deckType={deck?.deck_type || "general"}
            subject={deck?.subject || ""}
            onComplete={handleComplete}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
