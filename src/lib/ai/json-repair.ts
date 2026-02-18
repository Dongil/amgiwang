/** 마크다운 코드 펜스 제거 + 잘린 JSON 복구 */
export function safeJsonParse(raw: string): unknown {
  let text = raw.trim();

  // 마크다운 코드 펜스 제거
  text = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
  text = text.trim();

  if (!text) throw new Error("AI 응답이 비어있습니다.");

  // 먼저 그대로 파싱 시도
  try {
    return JSON.parse(text);
  } catch {
    // 잘린 JSON 복구 시도
  }

  // trailing comma 제거
  let repaired = text.replace(/,\s*$/, "");

  // 열린 괄호 카운트로 닫기
  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escape = false;

  for (const ch of repaired) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") braces++;
    if (ch === "}") braces--;
    if (ch === "[") brackets++;
    if (ch === "]") brackets--;
  }

  // 문자열이 열려 있으면 닫기
  if (inString) repaired += '"';

  // trailing comma 다시 제거
  repaired = repaired.replace(/,\s*$/, "");

  // 닫히지 않은 괄호 닫기
  while (brackets > 0) { repaired += "]"; brackets--; }
  while (braces > 0) { repaired += "}"; braces--; }

  try {
    return JSON.parse(repaired);
  } catch {
    // 마지막 시도: 마지막 완전한 객체까지만 파싱
    const lastComplete = repaired.lastIndexOf("},");
    if (lastComplete > 0) {
      const truncated = repaired.substring(0, lastComplete + 1) + "]}";
      try {
        return JSON.parse(truncated);
      } catch {
        // give up
      }
    }
    throw new Error("AI 응답 JSON 파싱 실패 (잘린 응답)");
  }
}
