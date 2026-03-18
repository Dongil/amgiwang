import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SOURCE_BOOK } from "@/lib/wordmaster/constants";
import type { WordMasterEntry } from "@/lib/wordmaster/types";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    entries: WordMasterEntry[];
    deckOption: "single" | "per-day";
    deckTitle?: string;
  };

  const { entries, deckOption = "single", deckTitle } = body;
  if (!entries || entries.length === 0) {
    return NextResponse.json({ error: "No entries" }, { status: 400 });
  }

  try {
    const deckIds: string[] = [];

    if (deckOption === "per-day") {
      // DAY별 덱 생성
      const dayGroups = new Map<number, WordMasterEntry[]>();
      for (const entry of entries) {
        const group = dayGroups.get(entry.dayNumber) || [];
        group.push(entry);
        dayGroups.set(entry.dayNumber, group);
      }

      for (const [dayNum, dayEntries] of [...dayGroups.entries()].sort(
        (a, b) => a[0] - b[0]
      )) {
        const { data: deck, error: deckErr } = await supabase
          .from("decks")
          .insert({
            user_id: user.id,
            deck_type: "english_vocab",
            title: `${deckTitle || SOURCE_BOOK} - DAY ${String(dayNum).padStart(2, "0")}`,
            subject: "영어",
            color: "#10b981",
          })
          .select("id")
          .single();

        if (deckErr || !deck) continue;
        deckIds.push(deck.id);
        await insertCards(supabase, deck.id, dayEntries);
      }
    } else {
      // 단일 덱 생성
      const { data: deck, error: deckErr } = await supabase
        .from("decks")
        .insert({
          user_id: user.id,
          deck_type: "english_vocab",
          title: deckTitle || SOURCE_BOOK,
          subject: "영어",
          color: "#10b981",
        })
        .select("id")
        .single();

      if (deckErr || !deck) {
        return NextResponse.json(
          { error: `Deck creation failed: ${deckErr?.message}` },
          { status: 500 }
        );
      }
      deckIds.push(deck.id);
      await insertCards(supabase, deck.id, entries);
    }

    // card_count 동기화 (트리거로 처리되지만 배치 INSERT 후 보정)
    for (const deckId of deckIds) {
      const { count } = await supabase
        .from("vocab_cards")
        .select("id", { count: "exact", head: true })
        .eq("deck_id", deckId);
      await supabase
        .from("decks")
        .update({ card_count: count || 0 })
        .eq("id", deckId);
    }

    return NextResponse.json({
      deckId: deckIds[0],
      deckIds,
      importedCount: entries.length,
      failedCount: 0,
      errors: [],
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Import failed: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}

async function insertCards(
  supabase: Awaited<ReturnType<typeof createClient>>,
  deckId: string,
  entries: WordMasterEntry[]
) {
  const BATCH_SIZE = 50;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const cards = batch.map((entry) => ({
      deck_id: deckId,
      word: entry.word,
      meaning: entry.meanings[0]?.meaning || "",
      meanings: entry.meanings.map((m) => ({
        pos: m.pos,
        meaning: m.meaning,
        synonyms: entry.synonyms
          .filter((s) => !m.pos || s.pos === m.pos || !s.pos)
          .map((s) => s.word),
      })),
      antonyms: entry.antonyms.map((a) => ({
        word: a.word,
        meaning: a.meaning,
      })),
      derivatives: entry.derivatives.map((d) => ({
        word: d.word,
        meaning: d.meaning,
      })),
      collocations: [
        ...entry.relatedExpressions.map((r) => ({
          phrase: r.phrase,
          meaning: r.meaning,
          ...(r.source ? { source: r.source } : {}),
        })),
        ...entry.collocations.map((c) => ({
          phrase: c.phrase,
          meaning: c.meaning,
          ...(c.source ? { source: c.source } : {}),
        })),
      ],
      example_sentence: entry.exampleSentence || null,
      example_translation: entry.exampleTranslation || null,
      etymology_note: entry.etymologyNote || null,
      word_number: entry.wordNumber,
      day_number: entry.dayNumber,
      source_book: SOURCE_BOOK,
      position: entry.wordNumber,
      difficulty_level: 3,
    }));

    await supabase.from("vocab_cards").insert(cards);
  }
}
