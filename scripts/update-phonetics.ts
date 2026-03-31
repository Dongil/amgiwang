/**
 * Word Master 덱의 발음기호를 무료 사전 API로 일괄 업데이트
 * 실행: npx tsx scripts/update-phonetics.ts
 */

import { execSync } from "child_process";
import { writeFileSync, readFileSync } from "fs";
import { resolve } from "path";

const DICT_API = "https://api.dictionaryapi.dev/api/v2/entries/en";
const DELAY_MS = 1500;
const BATCH_SIZE = 5;
const ACCESS_TOKEN = "sbp_05c283e927b8bf8f3383875e1206155f6e8b522c";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPhonetic(word: string): Promise<string | null> {
  const lookupWord = word.split(/\s+/)[0].replace(/[^a-zA-Z-]/g, "");
  if (!lookupWord) return null;

  try {
    const res = await fetch(`${DICT_API}/${encodeURIComponent(lookupWord)}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const entry = data[0];
    if (entry.phonetic) return entry.phonetic;
    if (entry.phonetics && Array.isArray(entry.phonetics)) {
      for (const p of entry.phonetics) {
        if (p.text) return p.text;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function dbQueryFile(sqlFile: string): string {
  return execSync(
    `npx supabase db query --linked -o json -f "${sqlFile}"`,
    {
      env: { ...process.env, SUPABASE_ACCESS_TOKEN: ACCESS_TOKEN },
      encoding: "utf-8",
      timeout: 30000,
      stdio: ["pipe", "pipe", "pipe"],
    }
  );
}

function dbExecFile(sqlFile: string) {
  execSync(
    `npx supabase db query --linked -f "${sqlFile}"`,
    {
      env: { ...process.env, SUPABASE_ACCESS_TOKEN: ACCESS_TOKEN },
      encoding: "utf-8",
      timeout: 30000,
      stdio: ["pipe", "pipe", "pipe"],
    }
  );
}

async function main() {
  const sqlDir = resolve(__dirname);
  const fetchSql = resolve(sqlDir, "fetch-remaining.sql");
  const updateSql = resolve(sqlDir, "phonetics-update.sql");

  console.log("📖 Fetching remaining cards without phonetics...");
  const raw = dbQueryFile(fetchSql);
  const parsed = JSON.parse(raw);
  const cards: { id: string; word: string }[] = parsed.rows ?? [];
  console.log(`📝 발음기호 없는 카드: ${cards.length}개`);

  if (cards.length === 0) {
    console.log("✅ 모든 카드에 발음기호가 있습니다.");
    return;
  }

  const uniqueWords = [...new Set(
    cards.map((c) => c.word.split(/\s+/)[0].replace(/[^a-zA-Z-]/g, "").toLowerCase())
  )].filter(Boolean);
  console.log(`🔍 고유 단어 ${uniqueWords.length}개 조회 중... (딜레이 ${DELAY_MS}ms)`);

  const phoneticMap = new Map<string, string>();
  let fetched = 0;
  let consecutiveFails = 0;

  for (let i = 0; i < uniqueWords.length; i += BATCH_SIZE) {
    const batch = uniqueWords.slice(i, i + BATCH_SIZE);

    // 순차 처리로 rate limit 방지
    for (const w of batch) {
      const phonetic = await fetchPhonetic(w);
      if (phonetic) {
        phoneticMap.set(w, phonetic);
        consecutiveFails = 0;
      } else {
        consecutiveFails++;
      }
      fetched++;
    }

    console.log(`  🔍 ${fetched}/${uniqueWords.length} 조회 (확보: ${phoneticMap.size})`);

    // rate limit 감지: 연속 실패 20회 이상이면 대기 후 재시도
    if (consecutiveFails >= 20) {
      console.log("  ⏳ Rate limit 감지, 10초 대기...");
      await sleep(10000);
      consecutiveFails = 0;
    } else {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n📝 발음기호 확보: ${phoneticMap.size}/${uniqueWords.length}`);

  // SQL 생성
  const sqlLines: string[] = [];
  for (const card of cards) {
    const lookupWord = card.word.split(/\s+/)[0].replace(/[^a-zA-Z-]/g, "").toLowerCase();
    const phonetic = phoneticMap.get(lookupWord);
    if (phonetic) {
      const escaped = phonetic.replace(/'/g, "''");
      sqlLines.push(`UPDATE vocab_cards SET phonetic = '${escaped}' WHERE id = '${card.id}';`);
    }
  }

  if (sqlLines.length === 0) {
    console.log("⚠️ 새로운 발음기호가 없습니다.");
    return;
  }

  writeFileSync(updateSql, sqlLines.join("\n"), "utf-8");
  console.log(`💾 SQL: ${sqlLines.length}개 UPDATE`);

  console.log("🚀 DB 업데이트 중...");
  // SQL 파일을 청크로 분할 실행
  const CHUNK = 200;
  for (let i = 0; i < sqlLines.length; i += CHUNK) {
    const chunk = sqlLines.slice(i, i + CHUNK);
    const chunkFile = resolve(sqlDir, `phonetics-chunk.sql`);
    writeFileSync(chunkFile, chunk.join("\n"), "utf-8");
    try {
      dbExecFile(chunkFile);
      console.log(`  ✅ ${Math.min(i + CHUNK, sqlLines.length)}/${sqlLines.length}`);
    } catch (e) {
      console.error(`  ❌ 청크 실패:`, (e as Error).message?.slice(0, 100));
    }
  }

  console.log(`\n🎉 완료! ${sqlLines.length}개 카드 발음기호 업데이트`);
}

main().catch(console.error);
