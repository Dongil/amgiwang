/**
 * Gemini API로 정확한 IPA 발음기호 생성 → Supabase DB 업데이트
 * 50단어씩 배치 처리
 */
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SUPABASE_URL = "https://qcnsjfnzvdnjbfushnss.supabase.co";
const SERVICE_ROLE_KEY = "***REMOVED_SERVICE_ROLE_KEY***";
const GEMINI_API_KEY = "***REMOVED_GEMINI_KEY***";
const DECK_ID = "0c27434b-9920-4c8d-bf26-92e13ef8ad51";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.1,
    maxOutputTokens: 4096,
    responseMimeType: "application/json",
  },
  systemInstruction: {
    parts: [{
      text: `You are a phonetics expert. Given a list of English words, return their IPA (International Phonetic Alphabet) transcriptions.
Return a JSON object where keys are the words and values are the IPA transcriptions in brackets.
Use standard IPA notation with brackets, e.g. [miːn], [rɪˈɡɑːrd], [ˌɑːpərˈtuːnəti].
Include stress marks (ˈ for primary, ˌ for secondary) for words with 2+ syllables.
Use American English pronunciation.
Return ONLY valid JSON.`
    }]
  },
});

// 1. 전체 카드 조회 (1000개 limit 우회)
console.log("Fetching all vocab cards...");
let allCards = [];
let from = 0;
const PAGE_SIZE = 500;
while (true) {
  const { data, error: fetchErr } = await supabase
    .from("vocab_cards")
    .select("id, word, phonetic")
    .eq("deck_id", DECK_ID)
    .order("position")
    .range(from, from + PAGE_SIZE - 1);
  if (fetchErr) { console.error(fetchErr); break; }
  if (!data || data.length === 0) break;
  allCards.push(...data);
  if (data.length < PAGE_SIZE) break;
  from += PAGE_SIZE;
}
const cards = allCards;
const error = null;

if (error) {
  console.error("Error fetching cards:", error);
  process.exit(1);
}

console.log(`Total cards: ${cards.length}`);

// 2. 배치 처리 (50단어씩)
const BATCH_SIZE = 50;
let updated = 0;
let errors = 0;

for (let i = 0; i < cards.length; i += BATCH_SIZE) {
  const batch = cards.slice(i, i + BATCH_SIZE);
  const words = batch.map(c => c.word);
  const batchNum = Math.floor(i / BATCH_SIZE) + 1;
  const totalBatches = Math.ceil(cards.length / BATCH_SIZE);

  process.stdout.write(`\rBatch ${batchNum}/${totalBatches}: ${words.slice(0, 3).join(", ")}...`);

  try {
    const result = await model.generateContent(
      `Provide IPA phonetic transcriptions for these English words:\n${words.join(", ")}`
    );
    const text = result.response.text();
    const phonetics = JSON.parse(text);

    // DB 업데이트
    for (const card of batch) {
      // 대소문자 무관 매칭
      const ipa = phonetics[card.word] || phonetics[card.word.toLowerCase()]
        || phonetics[card.word.charAt(0).toUpperCase() + card.word.slice(1)];

      if (ipa) {
        const { error: updateError } = await supabase
          .from("vocab_cards")
          .update({ phonetic: ipa })
          .eq("id", card.id);

        if (updateError) {
          errors++;
        } else {
          updated++;
        }
      }
    }
  } catch (err) {
    console.error(`\nBatch ${batchNum} error:`, err.message);
    errors++;
  }

  // Rate limit 방지
  await new Promise(r => setTimeout(r, 500));
}

console.log(`\n\n=== Phonetics Update Complete ===`);
console.log(`Updated: ${updated}/${cards.length}`);
if (errors > 0) console.log(`Errors: ${errors}`);

// 3. 샘플 확인
const { data: samples } = await supabase
  .from("vocab_cards")
  .select("word, phonetic")
  .eq("deck_id", DECK_ID)
  .order("position")
  .limit(10);

console.log(`\nSample phonetics:`);
for (const s of samples) {
  console.log(`  ${s.word}: ${s.phonetic}`);
}
