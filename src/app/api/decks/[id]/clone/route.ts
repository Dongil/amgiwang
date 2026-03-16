import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deckId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 병렬 조회: 원본 덱 + 중복 import 체크 (async-parallel)
    const [deckRes, duplicateRes] = await Promise.all([
      supabase
        .from("decks")
        .select("*")
        .eq("id", deckId)
        .in("share_mode", ["public", "private"])
        .single(),
      supabase
        .from("decks")
        .select("id")
        .eq("source_deck_id", deckId)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (!deckRes.data) {
      return NextResponse.json({ error: "공유된 덱을 찾을 수 없습니다." }, { status: 404 });
    }

    if (duplicateRes.data) {
      return NextResponse.json({ error: "이미 가져온 덱입니다." }, { status: 409 });
    }

    const sourceDeck = deckRes.data;

    // 카드 수 제한
    if (sourceDeck.card_count > 500) {
      return NextResponse.json({ error: "500장 이상의 덱은 가져올 수 없습니다." }, { status: 400 });
    }

    // 카드 조회
    const cardTable = sourceDeck.deck_type === "english_vocab" ? "vocab_cards" : "cards";
    const { data: cards } = await supabase
      .from(cardTable)
      .select("*")
      .eq("deck_id", deckId)
      .order("position");

    // 새 덱 생성
    const { data: newDeck, error: deckError } = await supabase
      .from("decks")
      .insert({
        user_id: user.id,
        deck_type: sourceDeck.deck_type,
        title: sourceDeck.title,
        subject: sourceDeck.subject,
        description: sourceDeck.description,
        color: sourceDeck.color,
        card_count: cards?.length ?? 0,
        source_deck_id: deckId,
        source_user_id: sourceDeck.user_id,
      })
      .select("id")
      .single();

    if (deckError || !newDeck) {
      return NextResponse.json({ error: "덱 생성에 실패했습니다." }, { status: 500 });
    }

    // 카드 복사
    if (cards && cards.length > 0) {
      const newCards = cards.map((c: Record<string, unknown>) => {
        const { id: _id, deck_id: _deckId, created_at: _ca, updated_at: _ua, ...rest } = c;
        return { ...rest, deck_id: newDeck.id };
      });

      const { error: cardsError } = await supabase.from(cardTable).insert(newCards);
      if (cardsError) {
        // 카드 복사 실패 시 덱도 삭제
        await supabase.from("decks").delete().eq("id", newDeck.id);
        return NextResponse.json({ error: "카드 복사에 실패했습니다." }, { status: 500 });
      }
    }

    // 원본 import_count 증가
    await supabase.rpc("increment_import_count", { deck_uuid: deckId });

    return NextResponse.json(
      { deck_id: newDeck.id, card_count: cards?.length ?? 0 },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
