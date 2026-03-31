"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useVocabCardsPaginated,
  PAGE_SIZE,
} from "@/hooks/use-vocab-cards-paginated";
import { useDeleteVocabCard } from "@/hooks/use-vocab-cards";
import { queryKeys } from "@/lib/query-keys";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CardEditSheet } from "./card-edit-sheet";
import {
  ChevronLeft,
  ChevronRight,
  ListPlus,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { VocabCard } from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDay(card: any): string | null {
  // day_number 컬럼 우선 (Word Master 등)
  const dayNum = card.day_number as number | null | undefined;
  if (dayNum != null && dayNum > 0) return String(dayNum);
  // tags 폴백 (기존 덱)
  const tags = card.tags as string[] | null | undefined;
  if (tags) {
    for (const tag of tags) {
      const match = tag.match(/^Day(\d+)$/i);
      if (match) return match[1];
    }
  }
  return null;
}

export function CardListTable({ deckId }: { deckId: string }) {
  const [page, setPage] = useState(0);
  const [dayFilter, setDayFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [editCard, setEditCard] = useState<VocabCard | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [insertPosition, setInsertPosition] = useState<number | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<VocabCard | null>(null);

  const queryClient = useQueryClient();
  const deleteCard = useDeleteVocabCard();

  // Debounce search 300ms
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== searchQuery) {
        setSearchQuery(trimmed);
        setPage(0);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading } = useVocabCardsPaginated(deckId, {
    page,
    day: dayFilter ? `Day${dayFilter}` : null,
    search: searchQuery,
  });

  const handleDayChange = (value: string) => {
    setDayFilter(value === "all" ? null : value);
    setPage(0);
  };

  const openEdit = (card: VocabCard) => {
    setEditCard(card);
    setSheetOpen(true);
  };

  const openAdd = () => {
    setEditCard(null);
    setInsertPosition(undefined);
    setSheetOpen(true);
  };

  const openInsertBefore = (card: VocabCard) => {
    setEditCard(null);
    setInsertPosition(card.position);
    setSheetOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteCard.mutate(
      { cardId: deleteTarget.id, deckId },
      {
        onSuccess: () => {
          toast.success("삭제되었습니다.");
          setDeleteTarget(null);
          queryClient.invalidateQueries({
            queryKey: ["vocabCards", deckId, "paginated"],
          });
        },
        onError: () => toast.error("삭제 실패"),
      }
    );
  };

  // Day options (1-50)
  const dayOptions = Array.from({ length: 50 }, (_, i) => String(i + 1));

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="단어 검색…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
            aria-label="단어 검색"
          />
        </div>
        <Select
          value={dayFilter ?? "all"}
          onValueChange={handleDayChange}
        >
          <SelectTrigger className="w-[100px]" size="sm">
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {dayOptions.map((d) => (
              <SelectItem key={d} value={d}>
                Day {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={openAdd}>
          <Plus className="mr-1 h-4 w-4" />
          <span className="hidden sm:inline">카드 추가</span>
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : !data || data.cards.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {searchQuery || dayFilter ? "검색 결과가 없습니다." : "카드가 없습니다."}
        </p>
      ) : (
        <>
          <div className="rounded-md border">
            <Table className="table-fixed">
              <colgroup>
                <col className="w-10" />
                <col className="hidden w-10 sm:table-column" />
                <col className="w-[25%]" />
                <col className="hidden w-[20%] sm:table-column" />
                <col />
                <col className="w-10" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead className="hidden sm:table-cell">Day</TableHead>
                  <TableHead>단어</TableHead>
                  <TableHead className="hidden sm:table-cell">발음기호</TableHead>
                  <TableHead>뜻</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.cards.map((card, idx) => {
                  const day = extractDay(card);
                  const firstMeaning = card.meanings?.[0];

                  return (
                    <TableRow
                      key={card.id}
                      className="cursor-pointer"
                      onClick={() => openEdit(card as VocabCard)}
                    >
                      <TableCell className="text-muted-foreground">
                        {page * PAGE_SIZE + idx + 1}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {day ?? "-"}
                      </TableCell>
                      <TableCell className="font-medium">{card.word}</TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {card.phonetic ?? ""}
                      </TableCell>
                      <TableCell className="overflow-hidden truncate">
                        {firstMeaning?.meaning ?? card.meaning}
                      </TableCell>
                      <TableCell className="px-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                              aria-label="더 보기"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                openInsertBefore(card as VocabCard);
                              }}
                            >
                              <ListPlus className="mr-2 h-4 w-4" />
                              여기 앞에 추가
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(card as VocabCard);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(card as VocabCard);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              총 {data.totalCount.toLocaleString()}장
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                aria-label="이전 페이지"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {(() => {
                const total = data.totalPages || 1;
                const pages: (number | "…")[] = [];
                if (total <= 7) {
                  for (let i = 0; i < total; i++) pages.push(i);
                } else {
                  pages.push(0);
                  if (page > 2) pages.push("…");
                  for (let i = Math.max(1, page - 1); i <= Math.min(total - 2, page + 1); i++) pages.push(i);
                  if (page < total - 3) pages.push("…");
                  pages.push(total - 1);
                }
                return pages.map((p, i) =>
                  p === "…" ? (
                    <span key={`dots-${i}`} className="px-1 text-xs text-muted-foreground">
                      ...
                    </span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8 text-xs"
                      onClick={() => setPage(p)}
                    >
                      {p + 1}
                    </Button>
                  )
                );
              })()}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= data.totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                aria-label="다음 페이지"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Edit Sheet */}
      <CardEditSheet
        card={editCard}
        deckId={deckId}
        insertPosition={insertPosition}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setEditCard(null);
            setInsertPosition(undefined);
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>카드 삭제</DialogTitle>
            <DialogDescription>
              &quot;{deleteTarget?.word}&quot; 카드를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={deleteCard.isPending}
              onClick={confirmDelete}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
