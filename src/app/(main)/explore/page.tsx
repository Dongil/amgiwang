"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download } from "lucide-react";
import type { SharedDeckView } from "@/types/database";

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState("latest");

  const { data, isLoading } = useQuery({
    queryKey: ["explore", searchQuery, typeFilter, sort],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (typeFilter !== "all") params.set("type", typeFilter);
      params.set("sort", sort);

      const res = await fetch(`/api/decks/explore?${params}`);
      if (!res.ok) throw new Error("탐색 실패");
      return res.json() as Promise<{ decks: SharedDeckView[]; total: number }>;
    },
  });

  const decks = useMemo(() => data?.decks ?? [], [data?.decks]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(query);
  }

  return (
    <div className="space-y-5 p-5">
      <h1 className="text-2xl font-bold tracking-tight">덱 탐색</h1>

      <form onSubmit={handleSearch} className="relative" role="search">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="덱 검색…"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="덱 검색"
        />
      </form>

      <div className="flex gap-2">
        <div className="flex gap-1">
          {[
            { value: "all", label: "전체" },
            { value: "english_vocab", label: "영어단어" },
            { value: "general", label: "일반과목" },
          ].map((t) => (
            <Button
              key={t.value}
              variant={typeFilter === t.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(t.value)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">최신순</SelectItem>
            <SelectItem value="popular">인기순</SelectItem>
            <SelectItem value="cards">카드 많은순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : decks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Search className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
          <p className="text-muted-foreground">
            {searchQuery
              ? "검색 결과가 없습니다."
              : "공유된 덱이 아직 없어요."}
          </p>
        </div>
      ) : (
        <div className="space-y-3" style={{ contentVisibility: "auto" }}>
          {decks.map((deck) => (
            <Link key={deck.id} href={`/explore/${deck.id}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span aria-hidden="true">
                          {deck.deck_type === "english_vocab" ? "🔤" : "📖"}
                        </span>
                        <h3 className="font-medium">{deck.title}</h3>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {deck.owner.display_name} · {deck.card_count}
                        {deck.deck_type === "english_vocab" ? "단어" : "카드"}
                        {deck.import_count > 0 && (
                          <span className="ml-1 inline-flex items-center gap-0.5">
                            · <Download className="inline h-3 w-3" aria-hidden="true" /> {deck.import_count}
                          </span>
                        )}
                      </p>
                    </div>
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: deck.color || "#10b981" }}
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
