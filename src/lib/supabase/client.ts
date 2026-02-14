import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** 인증된 Supabase REST API 호출 (POST/PATCH/DELETE) */
export async function supabaseMutate<T = unknown>(
  table: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: Record<string, unknown> | Record<string, unknown>[],
  options?: { filter?: string; returnData?: boolean; onConflict?: string }
): Promise<{ data: T | null; error: string | null }> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { data: null, error: "세션이 만료되었습니다." };
  }

  const url = new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}`);
  if (options?.filter) {
    // e.g. "id=eq.abc123"
    const [key, val] = options.filter.split("=");
    url.searchParams.set(key, val);
  }
  if (options?.onConflict) {
    url.searchParams.set("on_conflict", options.onConflict);
  }

  const prefer: string[] = [];
  prefer.push(options?.returnData ? "return=representation" : "return=minimal");
  if (options?.onConflict) {
    prefer.push("resolution=merge-duplicates");
  }

  const headers: Record<string, string> = {
    "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    "Authorization": `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
    "Prefer": prefer.join(","),
  };

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errText = await res.text();
    return { data: null, error: errText };
  }

  if (options?.returnData && res.status !== 204) {
    const data = await res.json();
    return { data: Array.isArray(data) ? data[0] : data, error: null };
  }

  return { data: null, error: null };
}
