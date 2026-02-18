import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { deckTitle, dataPath } = (await request.json()) as {
      deckTitle?: string;
      dataPath?: string;
    };

    // JSON 데이터 읽기
    const jsonPath = dataPath || join(process.cwd(), "scripts/hackers-vocab-data.json");
    const rawData = readFileSync(jsonPath, "utf-8");
    const { cards, dayStats } = JSON.parse(rawData) as {
      cards: Array<{
        word: string;
        phonetic: string | null;
        meanings: Array<{ pos: string; meaning: string; synonyms: string[] }>;
        example_sentence: string | null;
        example_translation: string | null;
        derivatives: Array<{ word: string; meaning: string }>;
        antonyms: Array<{ word: string; meaning: string }>;
        tips: string | null;
        difficulty_level: number;
        tags: string[];
        position: number;
      }>;
      dayStats: Array<{ day: number; count: number }>;
    };

    // 1. 덱 생성
    const title = deckTitle || "해커스 보카 수능 심화";
    const totalDays = dayStats.length;
    const wordsPerDay = 35;

    const { data: deck, error: deckError } = await supabase
      .from("decks")
      .insert({
        user_id: user.id,
        title,
        deck_type: "english_vocab",
        subject: "영어",
        study_plan: {
          total_days: totalDays,
          daily_amount: wordsPerDay,
          current_day: 1,
        },
      })
      .select("id")
      .single();

    if (deckError) {
      return NextResponse.json({ error: `덱 생성 실패: ${deckError.message}` }, { status: 500 });
    }

    // 2. vocab_cards 배치 삽입 (50개씩)
    const BATCH_SIZE = 50;
    let totalInserted = 0;

    for (let i = 0; i < cards.length; i += BATCH_SIZE) {
      const batch = cards.slice(i, i + BATCH_SIZE).map((card) => ({
        deck_id: deck.id,
        word: card.word,
        meaning: card.meanings[0]?.meaning || "",
        meanings: card.meanings,
        phonetic: card.phonetic,
        example_sentence: card.example_sentence,
        example_translation: card.example_translation,
        derivatives: card.derivatives,
        antonyms: card.antonyms,
        tips: card.tips,
        difficulty_level: card.difficulty_level,
        tags: card.tags,
        position: card.position,
      }));

      const { error: insertError } = await supabase
        .from("vocab_cards")
        .insert(batch);

      if (insertError) {
        console.error(`Batch ${i / BATCH_SIZE + 1} insert error:`, insertError);
        // 계속 진행
      } else {
        totalInserted += batch.length;
      }
    }

    return NextResponse.json({
      success: true,
      deckId: deck.id,
      totalCards: totalInserted,
      totalDays,
      title,
    });
  } catch (err) {
    console.error("seed-deck error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "시드 실패" },
      { status: 500 }
    );
  }
}
