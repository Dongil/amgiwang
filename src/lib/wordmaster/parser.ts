import type {
  WordMasterEntry,
  ParsedMeaning,
  ParsedRelated,
  ParsedCollocation,
  ParseResult,
} from "./types";
import {
  MAX_WORD_NUMBER,
  SOURCE_TAGS,
  dayForWordNumber,
} from "./constants";

export function parseWordMasterText(fullText: string): ParseResult {
  const entries: WordMasterEntry[] = [];
  const errors: string[] = [];

  const wordPositions = extractWordPositions(fullText);
  const sortedPositions = [...wordPositions.entries()].sort(
    (a, b) => a[1].index - b[1].index
  );

  for (let i = 0; i < sortedPositions.length; i++) {
    const [wordNum, { index, word }] = sortedPositions[i];
    const nextIndex =
      i + 1 < sortedPositions.length
        ? sortedPositions[i + 1][1].index
        : index + 3000;
    const block = fullText.substring(index, Math.min(nextIndex, index + 3000));

    try {
      const entry = parseWordBlock(block, wordNum, word);
      if (entry) entries.push(entry);
    } catch (e) {
      errors.push(`#${wordNum} ${word}: ${(e as Error).message}`);
    }
  }

  // wordNumber 순으로 정렬 (PDF 2단 레이아웃으로 추출 순서가 섞일 수 있음)
  entries.sort((a, b) => a.wordNumber - b.wordNumber);
  const daySet = new Set(entries.map((e) => e.dayNumber));
  return { totalDays: daySet.size, totalWords: entries.length, entries, errors };
}

function extractWordPositions(
  text: string
): Map<number, { index: number; word: string }> {
  const positions = new Map<number, { index: number; word: string }>();
  const re = /\n(\d{4})\s*\n([a-zA-Z][\w\s''-]*?)\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const num = parseInt(m[1], 10);
    if (num >= 1 && num <= MAX_WORD_NUMBER && !positions.has(num)) {
      positions.set(num, { index: m.index, word: m[2].trim() });
    }
  }
  return positions;
}

/**
 * 단어가 base word의 파생어인지 판별
 * e.g., "struggling" → "struggle" 파생, "guilty" → "innocent" 파생 아님
 */
function isDerivedFrom(candidate: string, baseWord: string): boolean {
  const base = baseWord.toLowerCase().replace(/e$/, "");
  const cand = candidate.toLowerCase();
  // 공통 stem이 3자 이상이면 파생어
  return (
    cand.startsWith(base) ||
    base.startsWith(cand.slice(0, Math.max(3, cand.length - 3)))
  );
}

/**
 * 영어 텍스트와 한국어 텍스트의 경계에서 분리
 * "take ~ for granted ~을 당연한 일로 여기다" → { phrase: "take ~ for granted", meaning: "~을 당연한 일로 여기다" }
 * "good[clear/strong] evidence 훌륭한[명확한/강력한] 증거" → { phrase: "good[clear/strong] evidence", meaning: "훌륭한..." }
 */
function splitAtKorean(line: string): { phrase: string; meaning: string } | null {
  const koreanIdx = line.search(/[\uAC00-\uD7AF]/);
  if (koreanIdx <= 0) return null;

  // ~ 바로 뒤 한국어이면 ~도 의미에 포함 (예: ~을)
  const meaningIdx =
    koreanIdx > 0 && line[koreanIdx - 1] === "~"
      ? koreanIdx - 1
      : koreanIdx;
  const phrase = line.slice(0, meaningIdx).trim();
  const meaning = line.slice(meaningIdx).trim();

  if (!phrase || !meaning) return null;
  return { phrase, meaning };
}

function parseWordBlock(
  block: string,
  wordNumber: number,
  word: string
): WordMasterEntry | null {
  const lines = block.split("\n").map((l) => l.trim());

  const meanings: ParsedMeaning[] = [];
  const synonyms: ParsedRelated[] = [];
  const antonyms: ParsedRelated[] = [];
  const relatedExpressions: ParsedCollocation[] = [];
  const collocations: ParsedCollocation[] = [];
  const derivatives: ParsedRelated[] = [];
  let exampleSentence = "";
  let exampleTranslation = "";
  let etymologyNote = "";

  let fullWord = word; // 여러 줄 표제어 지원 (예: "pros and" + "cons" → "pros and cons")
  let foundWord = false;
  let inCollocationBlock = false;
  let inRelatedBlock = false;
  let inDerivativeBlock = false;
  let hadSynonyms = false;
  let hadAntonyms = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (!foundWord) {
      if (line === word || line.includes(word)) foundWord = true;
      continue;
    }

    // 표제어가 여러 줄인 경우 (예: "pros and\ncons") → 단어명에 합치기
    if (meanings.length === 0 && /^[a-z]/.test(line) && !/[\uAC00-\uD7AF]/.test(line) && !line.match(/^(n|v|a|ad)\s/) && line.length < 20) {
      fullWord += " " + line;
      continue;
    }

    // POS 없이 한국어만 있는 뜻 (숙어/구문: "찬반양론; 장단점")
    if (meanings.length === 0 && /^[\uAC00-\uD7AF]/.test(line) && !exampleSentence) {
      meanings.push({ pos: "", meaning: line });
      continue;
    }

    // Stop markers
    if (/^\d{4}$/.test(line)) break;
    if (/^Word Master/.test(line)) break;
    if (/^\d+\s+Word Master/.test(line)) break; // 페이지 마커: "22 Word Master 고등 COMPLETE"
    if (/^DAY\s/.test(line)) break;
    if (/^\d{2}$/.test(line) && lines[i - 1]?.match(/^DAY/)) break;
    if (line.startsWith("<이 책")) break;

    // === Part of speech + meaning ===
    if (
      meanings.length === 0 &&
      /^(n|v|a|ad)\s/.test(line) &&
      /[\uAC00-\uD7AF]/.test(line)
    ) {
      parseMeaningLine(line, meanings);
      continue;
    }

    // === Synonym (= marker) ===
    if (line.startsWith("=") || line.startsWith("⊜")) {
      const parsed = parseSynonymLine(line);
      if (parsed.length > 0) synonyms.push(...parsed);
      hadSynonyms = true;
      inCollocationBlock = false;
      inRelatedBlock = false;
      inDerivativeBlock = false;
      continue;
    }

    // === Synonym continuation (POS+뜻이 다음 줄에 이어지는 경우) ===
    // 예: "= bloom v 1. 꽃이 피다" 다음 줄 "n 1. 꽃, 개화(기) 2. 전성기"
    if (hadSynonyms && synonyms.length > 0 && /^(n|v|a|ad)\s/.test(line) && /[\uAC00-\uD7AF]/.test(line) && !hadAntonyms && !inDerivativeBlock) {
      const posMatch = line.match(/^(n|v|a|ad)\s+(.*)/);
      if (posMatch) {
        const lastSyn = synonyms[synonyms.length - 1];
        lastSyn.meaning += ` ${posMatch[1]} ${posMatch[2].trim()}`;
        continue;
      }
    }

    // === Explicit antonym markers ===
    if (
      line.startsWith("<->") ||
      line.startsWith("<―>") ||
      line.startsWith("↔") ||
      line.startsWith("⇔") ||
      line.startsWith("⬌") ||
      line.startsWith("\u21D4") ||
      line.startsWith("\u2194")
    ) {
      const parsed = parseRelatedLine(
        line.replace(/^(?:<[-―]>|[↔⇔⬌\u21D4\u2194])\s*/, "")
      );
      if (parsed) antonyms.push(parsed);
      hadAntonyms = true;
      inCollocationBlock = false;
      inRelatedBlock = false;
      inDerivativeBlock = false;
      continue;
    }

    // === Related expressions (+ marker) ===
    if (line.startsWith("+")) {
      inRelatedBlock = true;
      inCollocationBlock = false;
      inDerivativeBlock = false;
      const expr = parseExpressionLine(line.replace(/^\+\s*/, ""));
      if (expr) relatedExpressions.push(expr);
      continue;
    }

    // + continuation: 관련 표현은 base word를 포함하는 구문만
    if (inRelatedBlock) {
      // 한국어 없는 짧은 영어 줄은 우측 컬럼 잔여 텍스트 → 무시하고 블록 유지
      if (
        /^[a-zA-Z]/.test(line) &&
        !/[\uAC00-\uD7AF]/.test(line) &&
        line.length < 30
      ) {
        continue;
      }
      // Collocation 헤더이면 → 관련 표현 블록 종료, collocation으로 전환
      if (line.includes("어구로 자주 쓰인다") || line.includes("자주 쓰이는")) {
        inRelatedBlock = false;
        inCollocationBlock = true;
        collocations.push({ phrase: "", meaning: line, source: undefined });
        continue;
      }
      // "word POS meaning" 패턴이면 파생어 → 관련 표현 블록 종료, 아래 일반 처리로
      // POS 뒤에 한국어/숫자/괄호/~ 가 바로 와야 함 ("on a quite..." 같은 오인 방지)
      if (/^[a-z][\w-]*\s+(n|v|a|ad)\s+(?:[\uAC00-\uD7AF(~]|\d+\.)/.test(line)) {
        inRelatedBlock = false;
        // fall through to wordPosMatch below
      } else {
        // 영어 구문 + 한국어 뜻 패턴 (관련 표현 후보)
        const split = splitAtKorean(line);
        if (split && split.phrase.toLowerCase().includes(fullWord.toLowerCase())) {
          relatedExpressions.push({
            phrase: split.phrase,
            meaning: split.meaning,
          });
          continue;
        }
        inRelatedBlock = false;
      }
    }

    // === Frequent Collocations block ===
    // 헤더: "~어구로 자주 쓰인다", "자주 쓰이는", 또는 "word 는/은 ... 쓰이며" (여러 줄 헤더 첫 줄)
    if (
      line.includes("어구로 자주 쓰인다") ||
      line.includes("자주 쓰이는") ||
      line.includes("자주 쓰인다") ||
      (line.toLowerCase().startsWith(fullWord.toLowerCase()) && /[은는]\s.*쓰이/.test(line))
    ) {
      inCollocationBlock = true;
      inRelatedBlock = false;
      inDerivativeBlock = false;
      collocations.push({ phrase: "", meaning: line, source: undefined });
      continue;
    }

    if (inCollocationBlock) {
      // "word POS meaning" 패턴이면 파생어 → collocation 블록 종료
      // POS 뒤에 한국어/숫자/괄호/~ 가 바로 와야 함 ("on a quite..." 같은 오인 방지)
      if (/^[a-z][\w-]*\s+(n|v|a|ad)\s+(?:[\uAC00-\uD7AF(~]|\d+\.)/.test(line)) {
        inCollocationBlock = false;
        // fall through to wordPosMatch below
      } else {
        // 한국어 없는 짧은 영어 줄은 우측 컬럼 잔여 텍스트 → 무시
        if (
          /^[a-zA-Z]/.test(line) &&
          !/[\uAC00-\uD7AF]/.test(line) &&
          line.length < 30
        ) {
          continue;
        }
        const coll = parseInlineCollocation(line);
        if (coll) {
          collocations.push(coll);
          continue;
        } else {
          inCollocationBlock = false;
        }
      }
    }

    // === 단어 + 품사 + 뜻 패턴 (파생어 또는 반의어 판별) ===
    // 뜻에 한국어가 포함되면 형식 무관하게 매칭 (1. 유행병, (보조금, ~하다 등)
    const wordPosMatch = line.match(
      /^([a-z][\w-]*)\s+(n|v|a|ad)\s+(.*[\uAC00-\uD7AF].*)/
    );
    if (wordPosMatch) {
      const candidateWord = wordPosMatch[1].trim();

      // base word와 관련 있으면 → 파생어
      if (isDerivedFrom(candidateWord, fullWord)) {
        inDerivativeBlock = true;
        inRelatedBlock = false;
        parseDerivativeLine(line, derivatives);
        continue;
      }

      // base word와 무관하고, 아직 파생어/관련표현/collocation 진입 전이면 → 반의어
      // (PDF에서 <-> 마커가 이미지로 렌더링되어 텍스트 추출 안 되는 경우 대응)
      // 반의어는 항상 +관련표현/collocation/파생어보다 앞에 위치
      if (!hadAntonyms && !inDerivativeBlock && relatedExpressions.length === 0 && collocations.length === 0) {
        antonyms.push({
          word: candidateWord,
          pos: wordPosMatch[2],
          meaning: wordPosMatch[3].trim(),
        });
        hadAntonyms = true;
        continue;
      }

      // 그 외 → 파생어로 처리
      inDerivativeBlock = true;
      parseDerivativeLine(line, derivatives);
      continue;
    }

    // === 마커 없는 구문형 반의어 (예: "processed data 가공 후 데이터") ===
    if (!hadAntonyms && !inDerivativeBlock && exampleTranslation && relatedExpressions.length === 0 && collocations.length === 0) {
      const split = splitAtKorean(line);
      if (split && /^[a-zA-Z]/.test(line)) {
        const firstWord = split.phrase.split(/\s/)[0].toLowerCase();
        // 자기 자신(base word 포함)이나 파생어는 반의어가 아님
        if (
          !split.phrase.toLowerCase().includes(fullWord.toLowerCase()) &&
          !isDerivedFrom(firstWord, fullWord)
        ) {
          antonyms.push({ word: split.phrase, meaning: split.meaning });
          hadAntonyms = true;
          continue;
        }
      }
    }

    // === Derivative continuation ===
    if (inDerivativeBlock && derivatives.length > 0) {
      // 한국어 없는 짧은 영어 줄은 우측 컬럼 잔여 텍스트 → 무시하고 블록 유지
      if (
        /^[a-zA-Z]/.test(line) &&
        !/[\uAC00-\uD7AF]/.test(line) &&
        line.length < 30
      ) {
        continue;
      }
      // 품사+뜻 continuation: "v 이익을 얻다," 또는 "n 1. 결백" 또는 "n (보조금"
      if (/^(n|v|a|ad)\s+(?:[\uAC00-\uD7AF]|\d+\.|\()/.test(line)) {
        const posMatch = line.match(/^(n|v|a|ad)\s+(.*)/);
        if (posMatch) {
          const lastDeriv = derivatives[derivatives.length - 1];
          lastDeriv.meaning += ` ${posMatch[1]} ${posMatch[2].trim().replace(/,$/, "")}`;
        }
        continue;
      }
      // 한국어/숫자만 있는 줄 → 이전 파생어 뜻에 이어붙이기 (예: "2. 순진", "등의) 수령자")
      if (
        /^[\uAC00-\uD7AF\d(]/.test(line) &&
        !/^[\uAC00-\uD7AF].*[A-Za-z]/.test(line) &&
        line.length < 30
      ) {
        const lastDeriv = derivatives[derivatives.length - 1];
        lastDeriv.meaning += ` ${line.replace(/,$/, "").trim()}`;
        continue;
      }
      inDerivativeBlock = false;
    }

    // === Etymology note ===
    if (
      line.includes("＋") ||
      (line.includes("→") &&
        /[a-z]/.test(line) &&
        /[\uAC00-\uD7AF]/.test(line))
    ) {
      etymologyNote = line;
      continue;
    }

    // === Example sentence (English) ===
    if (
      !exampleSentence &&
      /^[A-Z]/.test(line) &&
      line.length > 20 &&
      !/[\uAC00-\uD7AF]/.test(line)
    ) {
      exampleSentence = collectSentence(lines, i);
      continue;
    }

    // === Example translation (Korean) ===
    if (
      !exampleTranslation &&
      exampleSentence &&
      /[\uAC00-\uD7AF]/.test(line) &&
      line.length > 10 &&
      !line.match(/^(n|v|a|ad)\s/)
    ) {
      exampleTranslation = line;
      continue;
    }
  }

  if (meanings.length === 0 && !exampleSentence) return null;

  for (const d of derivatives) {
    d.meaning = d.meaning.replace(/,\s*$/, "").trim();
  }

  return {
    wordNumber,
    dayNumber: dayForWordNumber(wordNumber),
    word: fullWord,
    meanings,
    exampleSentence,
    exampleTranslation,
    synonyms,
    antonyms,
    relatedExpressions,
    collocations,
    derivatives,
    etymologyNote: etymologyNote || undefined,
  };
}

function parseMeaningLine(line: string, out: ParsedMeaning[]): void {
  const parts = line.split(/\s+(?=(?:n|v|a|ad)\s+[\uAC00-\uD7AF(])/);
  for (const part of parts) {
    const match = part.match(/^(n|v|a|ad)\s+(.+)/);
    if (match) out.push({ pos: match[1], meaning: match[2].trim() });
  }
}

function parseSynonymLine(line: string): ParsedRelated[] {
  const results: ParsedRelated[] = [];
  const cleaned = line.replace(/^[=⊜]\s*/, "");

  // 한국어가 없는 경우: 쉼표로 구분된 영어 단어 목록 (예: "quick, swift")
  if (!/[\uAC00-\uD7AF]/.test(cleaned)) {
    const words = cleaned.split(/[,\s]+/).filter(Boolean);
    for (const w of words) {
      if (/^[a-zA-Z]/.test(w)) results.push({ word: w.trim(), meaning: "" });
    }
    return results;
  }

  // 한국어가 있는 경우: "word POS meaning" 또는 "phrase meaning" 파싱
  const parts = cleaned.split(/\s+(?=[a-zA-Z][\w-]*\s+(?:n|v|a|ad)\s)/);
  for (const part of parts) {
    const parsed = parseRelatedLine(part.trim());
    if (parsed) results.push(parsed);
  }
  return results;
}

function parseRelatedLine(line: string): ParsedRelated | null {
  // 1) "word POS meaning" 패턴 (뜻: 한국어, 숫자, 괄호 시작 허용)
  const match = line.match(
    /^([a-zA-Z][\w\s'-]*?)\s+(n|v|a|ad)\s+(\d+\.\s*[\uAC00-\uD7AF].+|\([\uAC00-\uD7AF].+|[\uAC00-\uD7AF].+)/
  );
  if (match)
    return { word: match[1].trim(), pos: match[2], meaning: match[3].trim() };

  // 2) 한국어 경계에서 분리 (예: "bring about ~을 유발하다")
  const split = splitAtKorean(line);
  if (split) return { word: split.phrase, meaning: split.meaning };

  return null;
}

function parseExpressionLine(line: string): ParsedCollocation | null {
  let source: string | undefined;
  let cleaned = line;
  for (const tag of SOURCE_TAGS) {
    if (cleaned.endsWith(tag)) {
      source = tag;
      cleaned = cleaned.slice(0, -tag.length).trim();
      break;
    }
  }
  // 한국어 경계에서 분리 ([], /, ~ 등 특수문자 포함 구문 지원)
  const split = splitAtKorean(cleaned);
  if (split) return { phrase: split.phrase, meaning: split.meaning, source };
  return null;
}

function parseDerivativeLine(line: string, out: ParsedRelated[]): void {
  const wordMatch = line.match(/^([a-zA-Z][\w]*)\s+(.*)/);
  if (!wordMatch) return;
  const derivWord = wordMatch[1].trim();
  const meaning = wordMatch[2].trim().replace(/,$/, "");
  if (meaning) out.push({ word: derivWord, meaning });
}

function parseInlineCollocation(line: string): ParsedCollocation | null {
  let source: string | undefined;
  let cleaned = line;
  for (const tag of SOURCE_TAGS) {
    if (cleaned.endsWith(tag)) {
      source = tag;
      cleaned = cleaned.slice(0, -tag.length).trim();
      break;
    }
  }
  const split = splitAtKorean(cleaned);
  if (split) return { phrase: split.phrase, meaning: split.meaning, source };
  return null;
}

function collectSentence(lines: string[], startIdx: number): string {
  let sentence = lines[startIdx];
  for (let j = startIdx + 1; j < Math.min(startIdx + 4, lines.length); j++) {
    const next = lines[j];
    if (!next) break;
    if (/[\uAC00-\uD7AF]/.test(next)) break;
    if (/^(n|v|a|ad)\s/.test(next)) break;
    if (/^[=+↔⇔⊜]/.test(next) || next.startsWith("<->") || next.startsWith("<―>")) break;
    if (/^\d{4}$/.test(next)) break;
    if (/^[A-Za-z]/.test(next)) sentence += " " + next;
    else break;
  }
  return sentence.replace(/\s+/g, " ").trim();
}
