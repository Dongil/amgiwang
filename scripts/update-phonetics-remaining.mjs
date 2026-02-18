/**
 * 나머지 카드 발음기호 업데이트 (position 1000+)
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

// position >= 1000인 카드 (이전 스크립트에서 처리 안된 것)
console.log("Fetching remaining cards...");
let allCards = [];
let from = 0;
while (true) {
  const { data } = await supabase
    .from("vocab_cards")
    .select("id, word, phonetic, position")
    .eq("deck_id", DECK_ID)
    .order("position")
    .range(1000 + from, 1000 + from + 499);
  if (!data || data.length === 0) break;
  allCards.push(...data);
  if (data.length < 500) break;
  from += 500;
}

console.log(`Remaining cards: ${allCards.length}`);

const BATCH_SIZE = 50;
let updated = 0;

for (let i = 0; i < allCards.length; i += BATCH_SIZE) {
  const batch = allCards.slice(i, i + BATCH_SIZE);
  const words = batch.map(c => c.word);
  const batchNum = Math.floor(i / BATCH_SIZE) + 1;
  const totalBatches = Math.ceil(allCards.length / BATCH_SIZE);

  process.stdout.write(`\rBatch ${batchNum}/${totalBatches}: ${words.slice(0, 3).join(", ")}...`);

  try {
    const result = await model.generateContent(
      `Provide IPA phonetic transcriptions for these English words:\n${words.join(", ")}`
    );
    const text = result.response.text();
    const phonetics = JSON.parse(text);

    for (const card of batch) {
      const ipa = phonetics[card.word] || phonetics[card.word.toLowerCase()]
        || phonetics[card.word.charAt(0).toUpperCase() + card.word.slice(1)];

      if (ipa) {
        await supabase
          .from("vocab_cards")
          .update({ phonetic: ipa })
          .eq("id", card.id);
        updated++;
      }
    }
  } catch (err) {
    console.error(`\nBatch ${batchNum} error:`, err.message);
  }

  await new Promise(r => setTimeout(r, 500));
}

console.log(`\n\nUpdated: ${updated}/${allCards.length}`);

// 확인
const { data: samples } = await supabase
  .from("vocab_cards")
  .select("word, phonetic")
  .eq("deck_id", DECK_ID)
  .order("position")
  .range(1000, 1009);

console.log(`\nSample (position 1000+):`);
for (const s of samples) {
  console.log(`  ${s.word}: ${s.phonetic}`);
}
