import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
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

    // 병렬 조회 (async-parallel)
    const [deckRes, importCheck] = await Promise.all([
      supabase
        .from("decks")
        .select(
          "id, title, description, deck_type, subject, color, card_count, import_count, share_mode, created_at, profiles!user_id(id, display_name)"
        )
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

    const deck = deckRes.data;
    const cardTable = deck.deck_type === "english_vocab" ? "vocab_cards" : "cards";

    // 미리보기 카드 (최대 10장)
    const previewColumns =
      deck.deck_type === "english_vocab"
        ? "word, meaning, phonetic"
        : "front_text, back_text";

    const { data: cards } = await supabase
      .from(cardTable)
      .select(previewColumns)
      .eq("deck_id", deckId)
      .order("position")
      .limit(10);

    return NextResponse.json({
      deck: {
        id: deck.id,
        title: deck.title,
        description: deck.description,
        deck_type: deck.deck_type,
        subject: deck.subject,
        color: deck.color,
        card_count: deck.card_count,
        import_count: deck.import_count,
        share_mode: deck.share_mode,
        created_at: deck.created_at,
        owner: deck.profiles ?? { id: "", display_name: "알 수 없음" },
      },
      cards: cards ?? [],
      already_imported: !!importCheck.data,
    });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
