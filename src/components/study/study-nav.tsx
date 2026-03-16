"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useStudyStore } from "@/stores/study-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import type { VocabCard } from "@/types/database";

interface StudyNavProps {
  deckTitle: string;
  deckId: string;
}

export function StudyNav({ deckTitle, deckId }: StudyNavProps) {
  const {
    allCards,
    currentCards,
    currentIndex,
    currentDay,
    prevCard,
    nextCard,
    goToIndex,
    filterByDay,
  } = useStudyStore();

  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpValue, setJumpValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Extract unique day numbers from all cards
  const dayNumbers = useMemo(() => {
    const days = new Set<number>();
    for (const card of allCards) {
      const tags = "tags" in card ? (card as { tags: string[] }).tags : [];
      for (const tag of tags) {
        const match = tag.match(/^Day(\d+)$/i);
        if (match) days.add(parseInt(match[1]));
      }
    }
    return Array.from(days).sort((a, b) => a - b);
  }, [allCards]);

  const progressPercent =
    currentCards.length > 0
      ? ((currentIndex + 1) / currentCards.length) * 100
      : 0;

  const handleJump = () => {
    const n = parseInt(jumpValue);
    if (n >= 1 && n <= currentCards.length) {
      goToIndex(n - 1);
    }
    setJumpOpen(false);
    setJumpValue("");
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    const q = searchQuery.trim().toLowerCase();
    const idx = currentCards.findIndex((c) => {
      if ("word" in c) return (c as VocabCard).word.toLowerCase().includes(q);
      return false;
    });
    if (idx !== -1) {
      goToIndex(idx);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <div className="mb-4 space-y-2">
      {/* Row 1: Back + Title */}
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="뒤로 가기">
          <Link href={`/decks/${deckId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <p className="flex-1 truncate text-sm font-medium">{deckTitle}</p>
      </div>

      {/* Row 2: Day selector | Prev/Next + Counter | Search */}
      <div className="flex items-center gap-2">
        {dayNumbers.length > 0 && (
          <Select
            value={currentDay !== null ? String(currentDay) : "all"}
            onValueChange={(v) => filterByDay(v === "all" ? null : parseInt(v))}
          >
            <SelectTrigger className="w-[90px]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {dayNumbers.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  Day {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex flex-1 items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={currentIndex === 0}
            onClick={prevCard}
            aria-label="이전 카드"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            type="button"
            onClick={() => {
              setJumpValue(String(currentIndex + 1));
              setJumpOpen(true);
            }}
            aria-label="카드 번호로 이동"
            className="rounded px-2 py-1 text-sm hover:bg-accent"
          >
            {currentIndex + 1}/{currentCards.length}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={currentIndex >= currentCards.length - 1}
            onClick={nextCard}
            aria-label="다음 카드"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {searchOpen ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              placeholder="단어 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
                if (e.key === "Escape") {
                  setSearchOpen(false);
                  setSearchQuery("");
                }
              }}
              className="h-8 w-[120px]"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
              }}
              aria-label="검색 닫기"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSearchOpen(true)}
            aria-label="단어 검색"
          >
            <Search className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Progress */}
      <Progress value={progressPercent} className="h-1.5" />

      {/* Jump Dialog */}
      <Dialog open={jumpOpen} onOpenChange={setJumpOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>카드 번호로 이동</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              type="number"
              min={1}
              max={currentCards.length}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJump();
              }}
              placeholder={`1 ~ ${currentCards.length}`}
            />
            <Button onClick={handleJump}>이동</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
