import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim() ?? "";
    const type = url.searchParams.get("type") ?? "";
    const subject = url.searchParams.get("subject") ?? "";
    const sort = url.searchParams.get("sort") ?? "latest";
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
    const pageSize = 20;

    let builder = supabase
      .from("decks")
      .select(
        "id, title, description, deck_type, subject, color, card_count, import_count, share_mode, created_at, profiles!user_id(id, display_name)",
        { count: "exact" }
      )
      .eq("share_mode", "public")
      .neq("user_id", user.id);

    if (query) {
      builder = builder.ilike("title", `%${query}%`);
    }
    if (type && type !== "all") {
      builder = builder.eq("deck_type", type);
    }
    if (subject && subject !== "all") {
      builder = builder.eq("subject", subject);
    }

    // 정렬
    if (sort === "popular") {
      builder = builder.order("import_count", { ascending: false });
    } else if (sort === "cards") {
      builder = builder.order("card_count", { ascending: false });
    } else {
      builder = builder.order("created_at", { ascending: false });
    }

    // 페이지네이션
    const from = (page - 1) * pageSize;
    builder = builder.range(from, from + pageSize - 1);

    const { data, count, error } = await builder;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const decks = (data ?? []).map((d: Record<string, unknown>) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      deck_type: d.deck_type,
      subject: d.subject,
      color: d.color,
      card_count: d.card_count,
      import_count: d.import_count,
      share_mode: d.share_mode,
      created_at: d.created_at,
      owner: d.profiles ?? { id: "", display_name: "알 수 없음" },
    }));

    return NextResponse.json({
      decks,
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
