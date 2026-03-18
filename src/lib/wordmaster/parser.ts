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

  // Step 1: 단어 번호 기준으로 모든 엔트리 위치 추출 (첫 등장만)
  const wordPositions = extractWordPositions(fullText);

  // Step 2: 각 단어 블록 파싱
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

/**
 * 단어 번호별 첫 등장 위치와 단어를 추출합니다.
 */
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
 * 단어 블록(텍스트)을 파싱하여 WordMasterEntry를 반환합니다.
 */
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Skip the word number + word lines themselves
    if (!foundWord) {
      if (line === word || line.includes(word)) {
        foundWord = true;
      }
      continue;
    }

    // Stop at next word number or page markers
    if (/^\d{4}$/.test(line)) break;
    if (/^Word Master/.test(line)) break;
    if (/^DAY\s*$/.test(line)) break;
    if (/^\d{2}$/.test(line) && lines[i - 1]?.match(/^DAY$/)) break;

    // Part of speech + meaning line
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
      continue;
    }

    // Antonym (↔ or  marker followed by word + pos + Korean)
    if (line.startsWith("↔") || line.startsWith("⇔")) {
      const parsed = parseRelatedLine(line.replace(/^[↔⇔]\s*/, ""));
      if (parsed) antonyms.push(parsed);
      inCollocationBlock = false;
      continue;
    }

    // Collocation (+ marker)
    if (line.startsWith("+")) {
      const coll = parseCollocationLine(line.replace(/^\+\s*/, ""));
      if (coll) collocations.push(coll);
      inCollocationBlock = false;
      continue;
    }

    // Collocation block (inline, after "~는 ... 어구로 자주 쓰인다")
    if (line.includes("어구로 자주 쓰인다") || line.includes("자주 쓰이는")) {
      inCollocationBlock = true;
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

    // Derivative (tab-indented or with special formatting)
    if (
      /^\t/.test(block.split("\n")[i] || "") ||
      isDerivativeLine(line, word)
    ) {
      const parsed = parseRelatedLine(line);
      if (parsed) derivatives.push(parsed);
      continue;
    }

    // Etymology note (어원 구간 DAY 21~25)
    if (
      line.includes("＋") ||
      (line.includes("→") && /[a-z]/.test(line) && /[\uAC00-\uD7AF]/.test(line))
    ) {
      etymologyNote = line;
      continue;
    }

    // Example sentence (English - starts with capital, has spaces, no Korean)
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

    // Antonym without marker (line after synonym that has ↔-like word + pos + Korean)
    if (
      synonyms.length > 0 &&
      antonyms.length === 0 &&
      !line.startsWith("=") &&
      /^[a-z]/.test(line) &&
      /[\uAC00-\uD7AF]/.test(line)
    ) {
      const parsed = parseRelatedLine(line);
      if (parsed) {
        // Check if this is actually an antonym (has specific meaning indicators)
        antonyms.push(parsed);
        continue;
      }
    }
  }

  if (meanings.length === 0 && !exampleSentence) return null;

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
  // Split by POS boundaries: "n 증거, 흔적 v 입증하다"
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
  // May have multiple synonyms: "helpful a 도움이 되는 advantageous a 이로운"
  const parts = cleaned.split(/\s+(?=[a-zA-Z][\w-]*\s+(?:n|v|a|ad)\s)/);
  for (const part of parts) {
    const parsed = parseRelatedLine(part.trim());
    if (parsed) results.push(parsed);
  }
  return results;
}

function parseRelatedLine(line: string): ParsedRelated | null {
  // "helpful a 도움이 되는, 유익한"
  const match = line.match(
    /^([a-zA-Z][\w\s'-]*?)\s+(n|v|a|ad)\s+([\uAC00-\uD7AF].+)/
  );
  if (match) {
    return { word: match[1].trim(), pos: match[2], meaning: match[3].trim() };
  }
  // Without pos: "helpful 도움이 되는"
  const match2 = line.match(/^([a-zA-Z][\w\s'-]*?)\s+([\uAC00-\uD7AF].+)/);
  if (match2) {
    return { word: match2[1].trim(), meaning: match2[2].trim() };
  }
  return null;
}

function parseCollocationLine(line: string): ParsedCollocation | null {
  // Check for source tag at end
  let source: string | undefined;
  let cleaned = line;
  for (const tag of SOURCE_TAGS) {
    if (cleaned.endsWith(tag)) {
      source = tag;
      cleaned = cleaned.slice(0, -tag.length).trim();
      break;
    }
  }

  // "good[clear/strong] evidence  훌륭한[명확한/강력한] 증거"
  const match = cleaned.match(
    /^(.+?)\s{2,}([\uAC00-\uD7AF].+)/
  );
  if (match) {
    return { phrase: match[1].trim(), meaning: match[2].trim(), source };
  }

  // Single phrase without translation
  if (/[a-zA-Z]/.test(cleaned) && cleaned.length > 3) {
    return { phrase: cleaned.trim(), meaning: "", source };
  }

  return null;
}

function parseInlineCollocation(
  line: string,
  _baseWord: string
): ParsedCollocation | null {
  // "cognitive development 인지 발달 학평"
  let source: string | undefined;
  let cleaned = line;
  for (const tag of SOURCE_TAGS) {
    if (cleaned.endsWith(tag)) {
      source = tag;
      cleaned = cleaned.slice(0, -tag.length).trim();
      break;
    }
  }

  // English phrase + Korean meaning
  const match = cleaned.match(
    /^([a-zA-Z][\w\s'-]+?)\s+([\uAC00-\uD7AF].+)/
  );
  if (match) {
    return { phrase: match[1].trim(), meaning: match[2].trim(), source };
  }
  return null;
}

function isDerivativeLine(line: string, _word: string): boolean {
  // Derivatives have pos+meaning pattern and are related words
  return /^[a-z][\w]*\s+(n|v|a|ad)\s+[\uAC00-\uD7AF]/.test(line);
}

function collectSentence(lines: string[], startIdx: number): string {
  let sentence = lines[startIdx];
  // Some sentences span multiple lines
  for (let j = startIdx + 1; j < Math.min(startIdx + 4, lines.length); j++) {
    const next = lines[j];
    if (!next) break;
    if (/[\uAC00-\uD7AF]/.test(next)) break; // Korean = translation
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
