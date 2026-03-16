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

    const { data, error } = await supabase
      .from("deck_shares")
      .select("id, shared_with_id, created_at, profiles!shared_with_id(display_name)")
      .eq("deck_id", deckId)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const users = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.shared_with_id,
      display_name: (row.profiles as Record<string, string>)?.display_name ?? "사용자",
      created_at: row.created_at,
    }));

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(
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

    const { user_id } = (await request.json()) as { user_id: string };
    if (!user_id) {
      return NextResponse.json({ error: "사용자 ID가 필요합니다." }, { status: 400 });
    }

    // 본인 덱 & private 모드 확인
    const { data: deck } = await supabase
      .from("decks")
      .select("id, user_id, share_mode")
      .eq("id", deckId)
      .eq("user_id", user.id)
      .single();

    if (!deck) {
      return NextResponse.json({ error: "덱을 찾을 수 없습니다." }, { status: 404 });
    }

    if (deck.share_mode !== "private") {
      return NextResponse.json({ error: "비공개 공유 모드에서만 사용자를 추가할 수 있습니다." }, { status: 400 });
    }

    // 최대 20명 제한
    const { count } = await supabase
      .from("deck_shares")
      .select("id", { count: "exact", head: true })
      .eq("deck_id", deckId);

    if ((count ?? 0) >= 20) {
      return NextResponse.json({ error: "최대 20명까지 공유할 수 있습니다." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("deck_shares")
      .insert({
        deck_id: deckId,
        owner_id: user.id,
        shared_with_id: user_id,
      })
      .select("id, shared_with_id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "이미 공유된 사용자입니다." }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 추가된 사용자 이름 조회
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user_id)
      .single();

    return NextResponse.json(
      {
        id: data.id,
        shared_with_id: data.shared_with_id,
        display_name: profile?.display_name ?? "사용자",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(
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

    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "사용자 ID가 필요합니다." }, { status: 400 });
    }

    const { error } = await supabase
      .from("deck_shares")
      .delete()
      .eq("deck_id", deckId)
      .eq("owner_id", user.id)
      .eq("shared_with_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
