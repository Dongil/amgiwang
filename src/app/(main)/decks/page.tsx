"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query-keys";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DeckCard } from "@/components/deck/deck-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import type { Deck, DeckType } from "@/types/database";

export default function DecksPage() {
  const user = useAuthStore((s) => s.user);
  const [deckTab, setDeckTab] = useState<"mine" | "shared">("mine");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  const { data: decks, isLoading } = useQuery({
    queryKey: queryKeys.decks.all,
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("decks")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      return (data ?? []) as Deck[];
    },
    enabled: !!user,
  });

  const { data: sharedDecks, isLoading: sharedLoading } = useQuery({
    queryKey: [...queryKeys.decks.all, "shared"],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("decks")
        .select("*")
        .eq("user_id", user!.id)
        .not("source_deck_id", "is", null)
        .order("updated_at", { ascending: false });
      return (data ?? []) as Deck[];
    },
    enabled: !!user && deckTab === "shared",
  });

  const currentDecks = deckTab === "mine"
    ? decks?.filter((d) => !d.source_deck_id)
    : sharedDecks;

  const subjects = Array.from(new Set(currentDecks?.map((d) => d.subject).filter(Boolean) ?? []));

  const filteredDecks = currentDecks?.filter((d) => {
    if (activeTab !== "all" && d.deck_type !== activeTab) return false;
    if (subjectFilter !== "all" && d.subject !== subjectFilter) return false;
    return true;
  });

  return (
    <div className="space-y-5 p-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">내 덱</h1>
        <Button asChild size="sm">
          <Link href="/decks/new">
            <Plus className="mr-1 h-4 w-4" />
            새 덱
          </Link>
        </Button>
      </div>

      <Tabs value={deckTab} onValueChange={(v) => setDeckTab(v as "mine" | "shared")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mine">내 덱</TabsTrigger>
          <TabsTrigger value="shared">공유받은 덱</TabsTrigger>
        </TabsList>
      </Tabs>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="english_vocab">영어단어</TabsTrigger>
          <TabsTrigger value="general">일반과목</TabsTrigger>
        </TabsList>
      </Tabs>

      {subjects.length > 0 && (
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="과목 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 과목</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {(deckTab === "mine" ? isLoading : sharedLoading) ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filteredDecks?.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            {deckTab === "shared"
              ? "공유받은 덱이 없어요. 탐색에서 덱을 가져와보세요!"
              : "아직 덱이 없어요. 새 덱을 만들어보세요!"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDecks?.map((deck) => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
        </div>
      )}
    </div>
  );
}
