import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 공유 페이지는 비로그인 접근 허용
  if (pathname.startsWith("/share/")) {
    return supabaseResponse;
  }

  // API 라우트 (/api/ai/*) 는 인증 필요
  if (pathname.startsWith("/api/ai/") && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // (auth) 페이지 - 이미 로그인 시 메인으로 리다이렉트
  if ((pathname === "/login" || pathname === "/signup") && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // (main) 페이지 - 비로그인 시 로그인으로 리다이렉트
  const publicPaths = ["/login", "/signup", "/share"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  if (!isPublic && !pathname.startsWith("/api/") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
