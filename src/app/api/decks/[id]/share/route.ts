import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";
import type { ShareMode } from "@/types/database";

export async function PUT(
  request: Request,
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

    const { share_mode } = (await request.json()) as { share_mode: ShareMode };
    if (!["none", "public", "private"].includes(share_mode)) {
      return NextResponse.json({ error: "잘못된 공유 모드입니다." }, { status: 400 });
    }

    // 본인 덱 확인
    const { data: deck } = await supabase
      .from("decks")
      .select("id, user_id, share_id")
      .eq("id", deckId)
      .eq("user_id", user.id)
      .single();

    if (!deck) {
      return NextResponse.json({ error: "덱을 찾을 수 없습니다." }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      share_mode,
      is_shared: share_mode !== "none",
    };

    // public 모드 시 share_id 자동 생성
    if (share_mode === "public" && !deck.share_id) {
      updates.share_id = nanoid(12);
    }

    // none으로 변경 시 deck_shares 레코드 삭제
    if (share_mode === "none") {
      await supabase.from("deck_shares").delete().eq("deck_id", deckId);
    }

    const { error } = await supabase
      .from("decks")
      .update(updates)
      .eq("id", deckId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      share_mode,
      share_id: updates.share_id ?? deck.share_id,
    });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
