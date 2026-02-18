/**
 * 해커스 보카 수능 심화 PDF → VocabCard JSON 추출기
 * regex 기반 파서 v3
 */
import { readFileSync, writeFileSync } from "fs";
import { extractText } from "unpdf";

const PDF_PATH = "C:/Users/KDI/OneDrive - 제노글로벌/스캔/바탕 화면/해커스＿보카＿수능＿심화（수업용＿본책＿PDF）.pdf";

// ── 1. PDF 텍스트 추출 ──────────────────
console.log("Reading PDF...");
const buffer = readFileSync(PDF_PATH);
const { totalPages, text: pageTexts } = await extractText(
  new Uint8Array(buffer),
  { mergePages: false }
);
console.log(`Total pages: ${totalPages}`);

// ── 2. 페이지 분류 ──────────────────────
function classifyPage(text, pageIdx) {
  // 특수 페이지 제외 (이 책의 구성과 특징, 표지 등)
  if (/이\s*책의\s*구성과\s*특징/.test(text)) return "other";
  if (/Daily\s*Quiz/i.test(text)) return "quiz";

  const tocPattern = /DAY\s*\d+\s*\[?\d+-\d+\]?/gi;
  const tocMatches = text.match(tocPattern);
  if (tocMatches && tocMatches.length >= 3) return "toc";

  const vocabPattern = /\d{4}\s*★/g;
  const vocabMatches = text.match(vocabPattern);
  if (vocabMatches && vocabMatches.length >= 2) return "vocab";

  if (/회독|학습\s*플랜/i.test(text)) return "plan";
  return "other";
}

// ── 3. Day별 텍스트 그룹핑 ──────────────
const dayPages = new Map();
let currentDay = 0;

for (let i = 0; i < totalPages; i++) {
  const text = pageTexts[i];
  const type = classifyPage(text, i);

  const dayMatch = text.match(/DAY\s*\n?음성\s*바로\s*듣기\s*(\d+)/i)
    || text.match(/DAY\s+(\d+)/i);
  if (dayMatch) {
    currentDay = parseInt(dayMatch[1]);
  }

  if (type === "vocab" && currentDay > 0) {
    if (!dayPages.has(currentDay)) dayPages.set(currentDay, []);
    dayPages.get(currentDay).push(text);
  }
}

console.log(`Found ${dayPages.size} days`);

// ── 4. 유틸 함수 ────────────────────────
function hasKorean(s) {
  return /[\uAC00-\uD7A3]/.test(s);
}

const POS_LIST = ["v", "n", "a", "ad", "adj", "adv", "prep", "conj"];
const POS_RE_START = /^(v|n|a|ad|adj|adv|prep|conj)\s+/;

function normPos(p) {
  return p === "a" ? "adj" : p === "ad" ? "adv" : p;
}

// ── 5. 의미줄 파싱 ──────────────────────
function parseMeaningFromRest(posStr, rest) {
  // rest = "signify, indicate 의미하다, 나타내다"
  // 한글 단어의 시작점 찾기 (공백 뒤에 한글이 오는 위치)
  const match = rest.match(/\s([\uAC00-\uD7A3(])/);
  if (!match) {
    return { pos: normPos(posStr), meaning: rest.trim(), synonyms: [] };
  }

  const splitIdx = match.index + 1; // 공백 다음 위치
  const synonymPart = rest.substring(0, match.index).trim();
  const meaningPart = rest.substring(splitIdx).trim();

  const synonyms = synonymPart
    ? synonymPart.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  return { pos: normPos(posStr), meaning: meaningPart, synonyms };
}

// ── 6. 파생어 줄 파싱 ──────────────────
function parseDerivativesLine(line) {
  const results = [];
  // "word pos 한글" 패턴 반복 매칭 (3글자 이상 단어)
  const re = /([a-zA-Z][\w-]{2,})\s+(?:a|n|v|ad|adj|adv|prep|conj)\s+([\uAC00-\uD7A3][^\n]*?)(?=\s+[a-zA-Z][\w-]{2,}\s+(?:a|n|v|ad|adj|adv|prep|conj)\s+[\uAC00-\uD7A3]|$)/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    results.push({
      word: m[1].toLowerCase(),
      meaning: m[2].trim().replace(/,\s*$/, ""),
    });
  }
  return results;
}

// ── 7. 페이지 하단 해석 추출 ────────────
function extractTranslations(text) {
  const translations = new Map();
  const lines = text.split("\n");
  let currentWord = null;

  for (const line of lines) {
    const wordTransMatch = line.match(/^([a-zA-Z][\w-]*)\s+[・·]\s+(.+)/);
    if (wordTransMatch) {
      currentWord = wordTransMatch[1].toLowerCase();
      if (!translations.has(currentWord)) translations.set(currentWord, []);
      translations.get(currentWord).push(wordTransMatch[2].trim());
      continue;
    }
    const contTransMatch = line.match(/^[・·]\s+(.+)/);
    if (contTransMatch && currentWord) {
      translations.get(currentWord)?.push(contTransMatch[1].trim());
      continue;
    }
    if (line.trim()) currentWord = null;
  }
  return translations;
}

// ── 8. 단어 엔트리 파서 ─────────────────
function parseWordEntry(rawText, dayNumber) {
  const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const headerMatch = lines[0].match(/^(\d{4})\s*(★[\s★]*)/);
  if (!headerMatch) return null;

  const wordNum = parseInt(headerMatch[1]);
  const stars = (headerMatch[2].match(/★/g) || []).length;

  const card = {
    word: "",
    phonetic: null,
    meanings: [],
    example_sentence: null,
    example_translation: null,
    derivatives: [],
    antonyms: [],
    tips: null,
    difficulty_level: Math.min(stars, 3),
    tags: [`Day${dayNumber}`],
    position: wordNum,
  };

  let tipsMode = false;
  let tipsLines = [];
  let pendingExampleLines = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // 무시할 줄
    if (/HackersBook\.com/.test(line)) continue;
    if (/^DAY\s+\d+\s*$/.test(line)) continue;
    if (/^DAY\s*$/.test(line)) continue;
    if (/^음성\s*바로\s*듣기/.test(line)) continue;
    if (/^[\d\s]+$/.test(line) && line.replace(/\s/g, "").length > 6) continue;
    if (/^\d+\s+영어 실력/.test(line)) continue;

    // Tips 섹션
    if (/^Tips\s/.test(line)) {
      // 미완성 예문 flush
      if (pendingExampleLines.length > 0) {
        if (!card.example_sentence) {
          card.example_sentence = pendingExampleLines.join(" ");
        }
        pendingExampleLines = [];
      }
      tipsMode = true;
      tipsLines.push(line.replace(/^Tips\s+/, "").trim());
      continue;
    }
    if (tipsMode) {
      // 파생어줄이면 Tips 종료
      const derivCheck = parseDerivativesLine(line);
      if (derivCheck.length > 0 && derivCheck[0].word !== card.word) {
        tipsMode = false;
        // fall through to derivatives handling
      } else {
        tipsLines.push(line);
        continue;
      }
    }

    // 1. [phonetic] pos rest → 발음기호 + 의미
    const phoneticMeaningMatch = line.match(/^\[([^\]]*)\]\s+(v|n|a|ad|adj|adv|prep|conj)\s+(.+)/);
    if (phoneticMeaningMatch) {
      const rawPhonetic = phoneticMeaningMatch[1];
      if (/[a-zːɪɛæʌɒʊəɑ]/i.test(rawPhonetic) && rawPhonetic.length > 1) {
        card.phonetic = `[${rawPhonetic}]`;
      }
      if (hasKorean(phoneticMeaningMatch[3])) {
        const meaning = parseMeaningFromRest(phoneticMeaningMatch[2], phoneticMeaningMatch[3]);
        if (meaning) card.meanings.push(meaning);
      }
      continue;
    }

    // 2. [phonetic] 뒤에 예문이 이어지는 경우: [phonetic] Example sentence...
    const phoneticExampleMatch = line.match(/^\[([^\]]*)\]\s+([A-Z\u201C\u201D"'].+)/);
    if (phoneticExampleMatch) {
      const rawPhonetic = phoneticExampleMatch[1];
      if (/[a-zːɪɛæʌɒʊəɑ]/i.test(rawPhonetic) && rawPhonetic.length > 1) {
        card.phonetic = `[${rawPhonetic}]`;
      }
      // 뒤의 텍스트는 예문으로
      const exText = phoneticExampleMatch[2];
      if (/\s*(수능|모평|학평)\s*$/.test(exText)) {
        if (!card.example_sentence) {
          card.example_sentence = exText.replace(/\s*(수능|모평|학평)\s*$/, "").trim();
        }
      } else {
        pendingExampleLines.push(exText);
      }
      continue;
    }

    // 3. [phonetic] 만 있는 줄
    if (/^\[[^\]]*\]\s*$/.test(line)) {
      const rawPhonetic = line.match(/^\[([^\]]*)\]/)?.[1];
      if (rawPhonetic && /[a-zːɪɛæʌɒʊəɑ]/i.test(rawPhonetic) && rawPhonetic.length > 1) {
        card.phonetic = `[${rawPhonetic}]`;
      }
      continue;
    }

    // 4. 첫 단어+의미: word pos rest
    if (!card.word) {
      const wordMatch = line.match(/^([a-zA-Z][\w-]+)\s+(v|n|a|ad|adj|adv|prep|conj)\s+(.+)/);
      if (wordMatch && hasKorean(wordMatch[3])) {
        card.word = wordMatch[1].toLowerCase();
        const meaning = parseMeaningFromRest(wordMatch[2], wordMatch[3]);
        if (meaning) card.meanings.push(meaning);
        continue;
      }
    }

    // 5. 추가 의미: pos rest (한글 포함)
    if (card.word) {
      const addMeaningMatch = line.match(/^(v|n|a|ad|adj|adv|prep|conj)\s+(.+)/);
      if (addMeaningMatch && hasKorean(addMeaningMatch[2])) {
        const meaning = parseMeaningFromRest(addMeaningMatch[1], addMeaningMatch[2]);
        if (meaning) card.meanings.push(meaning);
        continue;
      }
    }

    // 6. 예문 (수능/모평/학평으로 끝남)
    if (/\s*(수능|모평|학평)\s*$/.test(line)) {
      pendingExampleLines.push(line.replace(/\s*(수능|모평|학평)\s*$/, "").trim());
      const fullExample = pendingExampleLines.join(" ");
      if (!card.example_sentence) {
        card.example_sentence = fullExample;
      }
      pendingExampleLines = [];
      continue;
    }

    // 7. 파생어/반의어 (3글자+ 영어단어 pos 한글)
    if (card.word) {
      const derivs = parseDerivativesLine(line);
      if (derivs.length > 0) {
        for (const d of derivs) {
          if (d.word === card.word) continue;
          const isAntonym = (
            (d.word.startsWith("dis") && !card.word.startsWith("dis")) ||
            (d.word.startsWith("un") && !card.word.startsWith("un")) ||
            (d.word.startsWith("in") && !card.word.startsWith("in") && d.word.length > 4) ||
            (d.word.startsWith("im") && !card.word.startsWith("im") && d.word.length > 4) ||
            (d.word.startsWith("ir") && !card.word.startsWith("ir") && d.word.length > 4) ||
            (d.word.startsWith("il") && !card.word.startsWith("il") && d.word.length > 4)
          );
          if (isAntonym) {
            card.antonyms.push(d);
          } else {
            card.derivatives.push(d);
          }
        }
        continue;
      }
    }

    // 8. 예문 이어짐 (영어 문장, 대문자/따옴표 시작)
    if (card.word && /^[A-Z\u201C\u201D\u2018\u2019"'(]/.test(line) && !hasKorean(line)) {
      pendingExampleLines.push(line);
      continue;
    }

    // 9. 이어지는 예문 줄 (소문자 영어)
    if (pendingExampleLines.length > 0 && /^[a-z]/.test(line) && !hasKorean(line)) {
      pendingExampleLines.push(line);
      continue;
    }
  }

  // 미완성 예문 flush
  if (pendingExampleLines.length > 0 && !card.example_sentence) {
    card.example_sentence = pendingExampleLines.join(" ");
  }

  // Tips 저장
  if (tipsLines.length > 0) {
    card.tips = tipsLines.join("\n");
  }

  if (!card.word || card.meanings.length === 0) return null;
  return card;
}

// ── 9. 전체 파싱 실행 ───────────────────
console.log("\nParsing vocabulary entries...");
const allCards = [];
const dayStats = [];

for (const [dayNum, pages] of [...dayPages.entries()].sort((a, b) => a[0] - b[0])) {
  const dayText = pages.join("\n");
  const translations = extractTranslations(dayText);
  const entryBlocks = dayText.split(/(?=\d{4}\s+★)/);

  let dayCardCount = 0;

  for (const block of entryBlocks) {
    if (!/^\d{4}\s+★/.test(block.trim())) continue;

    const card = parseWordEntry(block.trim(), dayNum);
    if (!card) continue;

    const trans = translations.get(card.word);
    if (trans && trans.length > 0) {
      card.example_translation = trans[0];
    }

    allCards.push(card);
    dayCardCount++;
  }

  dayStats.push({ day: dayNum, count: dayCardCount });
  process.stdout.write(`  Day ${String(dayNum).padStart(2)}: ${dayCardCount} words\n`);
}

console.log(`\nTotal: ${allCards.length} vocabulary cards extracted`);

// ── 10. JSON 저장 ───────────────────────
writeFileSync(
  "scripts/hackers-vocab-data.json",
  JSON.stringify({ cards: allCards, dayStats }, null, 2)
);
console.log("Saved to scripts/hackers-vocab-data.json");

// ── 11. 통계 ────────────────────────────
const withPhonetic = allCards.filter(c => c.phonetic).length;
const withExample = allCards.filter(c => c.example_sentence).length;
const withTips = allCards.filter(c => c.tips).length;
const withDerivatives = allCards.filter(c => c.derivatives.length > 0).length;
const withAntonyms = allCards.filter(c => c.antonyms.length > 0).length;
const withTranslation = allCards.filter(c => c.example_translation).length;
const avgMeanings = allCards.reduce((s, c) => s + c.meanings.length, 0) / allCards.length;

console.log(`\n=== Extraction Stats ===`);
console.log(`Total cards: ${allCards.length}`);
console.log(`With phonetic: ${withPhonetic} (${(withPhonetic/allCards.length*100).toFixed(1)}%)`);
console.log(`With example: ${withExample} (${(withExample/allCards.length*100).toFixed(1)}%)`);
console.log(`With translation: ${withTranslation} (${(withTranslation/allCards.length*100).toFixed(1)}%)`);
console.log(`With tips: ${withTips} (${(withTips/allCards.length*100).toFixed(1)}%)`);
console.log(`With derivatives: ${withDerivatives} (${(withDerivatives/allCards.length*100).toFixed(1)}%)`);
console.log(`With antonyms: ${withAntonyms} (${(withAntonyms/allCards.length*100).toFixed(1)}%)`);
console.log(`Avg meanings/card: ${avgMeanings.toFixed(1)}`);

// 샘플
console.log(`\n=== Sample (Day 1, first 5) ===`);
const samples = allCards.filter(c => c.tags[0] === "Day1").slice(0, 5);
for (const s of samples) {
  console.log(`\n  ${s.position}. ${s.word} ${s.phonetic || ""}`);
  for (const m of s.meanings) {
    console.log(`     (${m.pos}) [${m.synonyms.join(", ")}] ${m.meaning}`);
  }
  if (s.example_sentence) console.log(`     Ex: ${s.example_sentence.substring(0, 80)}`);
  if (s.example_translation) console.log(`     해석: ${s.example_translation.substring(0, 60)}`);
  if (s.derivatives.length) console.log(`     파생: ${s.derivatives.map(d=>`${d.word}(${d.meaning})`).join(", ")}`);
  if (s.antonyms.length) console.log(`     반의: ${s.antonyms.map(d=>`${d.word}(${d.meaning})`).join(", ")}`);
  if (s.tips) console.log(`     Tips: ${s.tips.substring(0, 80)}`);
}

console.log(`\n=== Sample (Day 2, first 3) ===`);
const samples2 = allCards.filter(c => c.tags[0] === "Day2").slice(0, 3);
for (const s of samples2) {
  console.log(`\n  ${s.position}. ${s.word} ${s.phonetic || ""}`);
  for (const m of s.meanings) {
    console.log(`     (${m.pos}) [${m.synonyms.join(", ")}] ${m.meaning}`);
  }
  if (s.example_sentence) console.log(`     Ex: ${s.example_sentence.substring(0, 80)}`);
}
