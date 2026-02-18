/**
 * 해커스 보카 수능 심화 - Supabase 직접 시딩 스크립트
 * service_role 키 사용 (RLS 바이패스)
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qcnsjfnzvdnjbfushnss.supabase.co";
const SERVICE_ROLE_KEY = "***REMOVED_SERVICE_ROLE_KEY***";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// 1. 사용자 조회 (첫 번째 사용자)
const { data: profiles, error: profilesError } = await supabase
  .from("profiles")
  .select("id, display_name")
  .limit(1);

if (profilesError || !profiles?.length) {
  console.error("No users found:", profilesError);
  process.exit(1);
}

const userId = profiles[0].id;
console.log(`User: ${profiles[0].display_name} (${userId})`);

// 2. 기존 동일 덱 확인
const { data: existing } = await supabase
  .from("decks")
  .select("id")
  .eq("user_id", userId)
  .eq("title", "해커스 보카 수능 심화")
  .limit(1);

if (existing?.length) {
  console.log(`기존 덱이 있습니다 (${existing[0].id}). 삭제 후 재생성합니다.`);
  // 기존 카드 삭제
  await supabase.from("vocab_cards").delete().eq("deck_id", existing[0].id);
  await supabase.from("decks").delete().eq("id", existing[0].id);
  console.log("기존 덱 삭제 완료");
}

// 3. JSON 데이터 로드
const rawData = readFileSync("scripts/hackers-vocab-data.json", "utf-8");
const { cards, dayStats } = JSON.parse(rawData);
console.log(`Loaded: ${cards.length} cards, ${dayStats.length} days`);

// 4. 덱 생성
const { data: deck, error: deckError } = await supabase
  .from("decks")
  .insert({
    user_id: userId,
    title: "해커스 보카 수능 심화",
    deck_type: "english_vocab",
    subject: "영어",
    description: "수능 심화 영어단어 1,750단어 (50일 과정, 하루 35단어)",
  })
  .select("id")
  .single();

if (deckError) {
  console.error("덱 생성 실패:", deckError);
  process.exit(1);
}

console.log(`덱 생성 완료: ${deck.id}`);

// 5. vocab_cards 배치 삽입
const BATCH_SIZE = 50;
let totalInserted = 0;
let errorCount = 0;

for (let i = 0; i < cards.length; i += BATCH_SIZE) {
  const batch = cards.slice(i, i + BATCH_SIZE).map((card) => ({
    deck_id: deck.id,
    word: card.word,
    meaning: card.meanings[0]?.meaning || "",
    meanings: card.meanings,
    phonetic: card.phonetic,
    example_sentence: card.example_sentence,
    example_translation: card.example_translation,
    derivatives: card.derivatives,
    antonyms: card.antonyms,
    tips: card.tips,
    difficulty_level: card.difficulty_level,
    tags: card.tags,
    position: card.position,
  }));

  const { error: insertError } = await supabase
    .from("vocab_cards")
    .insert(batch);

  if (insertError) {
    console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, insertError.message);
    errorCount++;
  } else {
    totalInserted += batch.length;
  }

  process.stdout.write(`\r  Inserted: ${totalInserted}/${cards.length} cards`);
}

console.log(`\n\n=== Seeding Complete ===`);
console.log(`Deck ID: ${deck.id}`);
console.log(`Deck Title: 해커스 보카 수능 심화`);
console.log(`Total Cards: ${totalInserted}`);
console.log(`Total Days: ${dayStats.length}`);
if (errorCount > 0) {
  console.log(`Errors: ${errorCount} batches`);
}
console.log(`\nDeck URL: http://localhost:3000/decks/${deck.id}`);
