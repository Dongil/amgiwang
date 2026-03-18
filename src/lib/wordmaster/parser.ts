import type {
  WordMasterEntry,
  ParsedMeaning,
  ParsedRelated,
  ParsedCollocation,
  ParseResult,
} from "./types";
import {
  SOURCE_BOOK,
  MAX_WORD_NUMBER,
  SOURCE_TAGS,
  dayForWordNumber,
} from "./constants";

/**
 * PDF 전체 텍스트에서 Word Master 단어 항목을 파싱합니다.
 */
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

    const blockEnd = Math.min(nextIndex, index + 3000);
    const block = fullText.substring(index, blockEnd);

    try {
      const entry = parseWordBlock(block, wordNum, word);
      if (entry) entries.push(entry);
    } catch (e) {
      errors.push(`#${wordNum} ${word}: ${(e as Error).message}`);
    }
  }

  const daySet = new Set(entries.map((e) => e.dayNumber));

  return {
    totalDays: daySet.size,
    totalWords: entries.length,
    entries,
    errors,
  };
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

function parseWordBlock(
  block: string,
  wordNumber: number,
  word: string
): WordMasterEntry | null {
  const lines = block.split("\n").map((l) => l.trim());

  const meanings: ParsedMeaning[] = [];
  const synonyms: ParsedRelated[] = [];
  const antonyms: ParsedRelated[] = [];
  const collocations: ParsedCollocation[] = [];
  const derivatives: ParsedRelated[] = [];
  let exampleSentence = "";
  let exampleTranslation = "";
  let etymologyNote = "";

  let foundWord = false;
  let inCollocationBlock = false;
  let inDerivativeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Skip the word number + word lines
    if (!foundWord) {
      if (line === word || line.includes(word)) {
        foundWord = true;
      }
      continue;
    }

    // Stop markers
    if (/^\d{4}$/.test(line)) break;
    if (/^Word Master/.test(line)) break;
    if (/^DAY\s*$/.test(line)) break;
    if (/^\d{2}$/.test(line) && lines[i - 1]?.match(/^DAY$/)) break;

    // Part of speech + meaning (첫 번째만)
    if (
      meanings.length === 0 &&
      /^(n|v|a|ad)\s/.test(line) &&
      /[\uAC00-\uD7AF]/.test(line)
    ) {
      parseMeaningLine(line, meanings);
      continue;
    }

    // Synonym (= marker)
    if (line.startsWith("=")) {
      const parsed = parseSynonymLine(line);
      if (parsed.length > 0) synonyms.push(...parsed);
      inCollocationBlock = false;
      inDerivativeBlock = false;
      continue;
    }

    // Antonym (↔ marker)
    if (line.startsWith("↔") || line.startsWith("⇔")) {
      const parsed = parseRelatedLine(line.replace(/^[↔⇔]\s*/, ""));
      if (parsed) antonyms.push(parsed);
      inCollocationBlock = false;
      inDerivativeBlock = false;
      continue;
    }

    // Collocation (+ marker)
    if (line.startsWith("+")) {
      const coll = parseCollocationLine(line.replace(/^\+\s*/, ""));
      if (coll) collocations.push(coll);
      inCollocationBlock = false;
      inDerivativeBlock = false;
      continue;
    }

    // Collocation block start
    if (line.includes("어구로 자주 쓰인다") || line.includes("자주 쓰이는")) {
      inCollocationBlock = true;
      inDerivativeBlock = false;
      continue;
    }

    if (inCollocationBlock) {
      const coll = parseInlineCollocation(line, word);
      if (coll) {
        collocations.push(coll);
        continue;
      } else {
        inCollocationBlock = false;
      }
    }

    // Derivative: 영어단어 + 품사 + 한국어뜻 패턴
    if (isDerivativeLine(line)) {
      inDerivativeBlock = true;
      parseDerivativeLine(line, derivatives);
      continue;
    }

    // Derivative continuation: 줄바꿈된 품사+뜻 (v 이익을 얻다) 또는 한국어만 (도움이 되다)
    if (inDerivativeBlock && derivatives.length > 0) {
      // "v 이익을 얻다," 같은 품사+뜻 continuation
      if (/^(n|v|a|ad)\s+[\uAC00-\uD7AF]/.test(line)) {
        const posMatch = line.match(/^(n|v|a|ad)\s+(.*)/);
        if (posMatch) {
          const lastDeriv = derivatives[derivatives.length - 1];
          lastDeriv.meaning += ` ${posMatch[1]} ${posMatch[2].trim().replace(/,$/, "")}`;
        }
        continue;
      }
      // 한국어만 있는 줄 → 이전 파생어 뜻에 이어붙이기
      if (
        /^[\uAC00-\uD7AF]/.test(line) &&
        !/^[\uAC00-\uD7AF].*[A-Za-z]/.test(line) &&
        line.length < 30
      ) {
        const lastDeriv = derivatives[derivatives.length - 1];
        lastDeriv.meaning += ` ${line.replace(/,$/, "").trim()}`;
        continue;
      }
      inDerivativeBlock = false;
    }

    // Etymology note
    if (
      line.includes("＋") ||
      (line.includes("→") && /[a-z]/.test(line) && /[\uAC00-\uD7AF]/.test(line))
    ) {
      etymologyNote = line;
      continue;
    }

    // Example sentence (English)
    if (
      !exampleSentence &&
      /^[A-Z]/.test(line) &&
      line.length > 20 &&
      !/[\uAC00-\uD7AF]/.test(line)
    ) {
      exampleSentence = collectSentence(lines, i);
      continue;
    }

    // Example translation (Korean)
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

    // Antonym without explicit ↔ marker (반의어 영역 - 유의어 뒤)
    if (
      synonyms.length > 0 &&
      antonyms.length === 0 &&
      !inDerivativeBlock &&
      /^[a-z]/.test(line) &&
      /[\uAC00-\uD7AF]/.test(line) &&
      /\s+(n|v|a|ad)\s+/.test(line)
    ) {
      const parsed = parseRelatedLine(line);
      if (parsed) {
        antonyms.push(parsed);
        continue;
      }
    }
  }

  if (meanings.length === 0 && !exampleSentence) return null;

  // 파생어 meaning 정리 (trailing comma 등)
  for (const d of derivatives) {
    d.meaning = d.meaning.replace(/,\s*$/, "").trim();
  }

  return {
    wordNumber,
    dayNumber: dayForWordNumber(wordNumber),
    word,
    meanings,
    exampleSentence,
    exampleTranslation,
    synonyms,
    antonyms,
    collocations,
    derivatives,
    etymologyNote: etymologyNote || undefined,
  };
}

function parseMeaningLine(line: string, out: ParsedMeaning[]): void {
  const parts = line.split(/\s+(?=(?:n|v|a|ad)\s+[\uAC00-\uD7AF])/);
  for (const part of parts) {
    const match = part.match(/^(n|v|a|ad)\s+(.+)/);
    if (match) {
      out.push({ pos: match[1], meaning: match[2].trim() });
    }
  }
}

function parseSynonymLine(line: string): ParsedRelated[] {
  const results: ParsedRelated[] = [];
  const cleaned = line.replace(/^=\s*/, "");
  const parts = cleaned.split(/\s+(?=[a-zA-Z][\w-]*\s+(?:n|v|a|ad)\s)/);
  for (const part of parts) {
    const parsed = parseRelatedLine(part.trim());
    if (parsed) results.push(parsed);
  }
  return results;
}

function parseRelatedLine(line: string): ParsedRelated | null {
  const match = line.match(
    /^([a-zA-Z][\w\s'-]*?)\s+(n|v|a|ad)\s+([\uAC00-\uD7AF].+)/
  );
  if (match) {
    return { word: match[1].trim(), pos: match[2], meaning: match[3].trim() };
  }
  const match2 = line.match(/^([a-zA-Z][\w\s'-]*?)\s+([\uAC00-\uD7AF].+)/);
  if (match2) {
    return { word: match2[1].trim(), meaning: match2[2].trim() };
  }
  return null;
}

/**
 * 파생어 줄 판별: 영어단어 + 품사 + 한국어뜻
 */
function isDerivativeLine(line: string): boolean {
  return /^[a-z][\w]*(?:ly|ment|tion|sion|ness|ity|ance|ence|ous|ive|al|ful|less|able|ible|er|or|ist|ism|ize|ise|ate|ent|ant|ing|ed|es|en|ic|ical)?\s+(n|v|a|ad)\s+[\uAC00-\uD7AF]/.test(line);
}

/**
 * 파생어 줄 파싱: 한 줄에 여러 파생어+품사 가능
 * "benefit n 이익, 혜택 v 이익을 얻다,"
 * → benefit: "n 이익, 혜택 v 이익을 얻다"
 */
function parseDerivativeLine(line: string, out: ParsedRelated[]): void {
  // "word pos meaning [pos meaning ...]"
  const wordMatch = line.match(/^([a-zA-Z][\w]*)\s+(.*)/);
  if (!wordMatch) return;

  const word = wordMatch[1].trim();
  const rest = wordMatch[2].trim();

  // 나머지에서 품사+뜻 추출
  const meaningParts: string[] = [];
  const posRe = /\b(n|v|a|ad)\b/g;
  let lastIdx = 0;
  let pm: RegExpExecArray | null;

  while ((pm = posRe.exec(rest)) !== null) {
    if (pm.index > lastIdx && lastIdx > 0) {
      // 이전 품사+뜻 영역의 끝
    }
    lastIdx = pm.index;
  }

  // 간단히 전체를 meaning으로 합침
  const meaning = rest
    .replace(/,\s*$/, "")
    .trim();

  if (meaning) {
    out.push({ word, meaning });
  }
}

function parseCollocationLine(line: string): ParsedCollocation | null {
  let source: string | undefined;
  let cleaned = line;
  for (const tag of SOURCE_TAGS) {
    if (cleaned.endsWith(tag)) {
      source = tag;
      cleaned = cleaned.slice(0, -tag.length).trim();
      break;
    }
  }

  const match = cleaned.match(/^(.+?)\s{2,}([\uAC00-\uD7AF].+)/);
  if (match) {
    return { phrase: match[1].trim(), meaning: match[2].trim(), source };
  }

  if (/[a-zA-Z]/.test(cleaned) && cleaned.length > 3) {
    return { phrase: cleaned.trim(), meaning: "", source };
  }

  return null;
}

function parseInlineCollocation(
  line: string,
  _baseWord: string
): ParsedCollocation | null {
  let source: string | undefined;
  let cleaned = line;
  for (const tag of SOURCE_TAGS) {
    if (cleaned.endsWith(tag)) {
      source = tag;
      cleaned = cleaned.slice(0, -tag.length).trim();
      break;
    }
  }

  const match = cleaned.match(
    /^([a-zA-Z][\w\s'-]+?)\s+([\uAC00-\uD7AF].+)/
  );
  if (match) {
    return { phrase: match[1].trim(), meaning: match[2].trim(), source };
  }
  return null;
}

function collectSentence(lines: string[], startIdx: number): string {
  let sentence = lines[startIdx];
  for (let j = startIdx + 1; j < Math.min(startIdx + 4, lines.length); j++) {
    const next = lines[j];
    if (!next) break;
    if (/[\uAC00-\uD7AF]/.test(next)) break;
    if (/^(n|v|a|ad)\s/.test(next)) break;
    if (/^[=+↔⇔]/.test(next)) break;
    if (/^\d{4}$/.test(next)) break;
    if (/^[A-Z]/.test(next) || /^[a-z]/.test(next)) {
      sentence += " " + next;
    } else {
      break;
    }
  }
  return sentence.replace(/\s+/g, " ").trim();
}
