import { createClient } from "@supabase/supabase-js";
const s = createClient("https://qcnsjfnzvdnjbfushnss.supabase.co", "***REMOVED_SERVICE_ROLE_KEY***");
let total = 0, withIpa = 0;
for (let from = 0; ; from += 500) {
  const {data} = await s.from("vocab_cards").select("phonetic").eq("deck_id","0c27434b-9920-4c8d-bf26-92e13ef8ad51").range(from, from+499);
  if (data === null || data.length === 0) break;
  total += data.length;
  withIpa += data.filter(c => c.phonetic && /[ɪɛæʌɒʊəɑːˈˌ]/.test(c.phonetic)).length;
}
console.log("Total cards:", total);
console.log("With valid IPA:", withIpa, "(" + (withIpa/total*100).toFixed(1) + "%)");
