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

    if (query.length < 2) {
      return NextResponse.json({ error: "최소 2글자 이상 입력해주세요." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .ilike("display_name", `%${query}%`)
      .neq("id", user.id)
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 이메일 마스킹은 auth.users 접근 불가하므로 display_name만 반환
    const users = (data ?? []).map((p) => ({
      id: p.id,
      display_name: p.display_name,
      email_masked: "",
    }));

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
