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

  let foundWord = false;
  let inCollocationBlock = false;
  let inRelatedBlock = false;
  let inDerivativeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Skip word number + word lines
    if (!foundWord) {
      if (line === word || line.includes(word)) foundWord = true;
      continue;
    }

    // Stop markers
    if (/^\d{4}$/.test(line)) break;
    if (/^Word Master/.test(line)) break;
    if (/^DAY\s*$/.test(line)) break;
    if (/^\d{2}$/.test(line) && lines[i - 1]?.match(/^DAY$/)) break;

    // === Part of speech + meaning (첫 번째만) ===
    if (
      meanings.length === 0 &&
      /^(n|v|a|ad)\s/.test(line) &&
      /[\uAC00-\uD7AF]/.test(line)
    ) {
      parseMeaningLine(line, meanings);
      continue;
    }

    // === Synonym (= marker or ⊜ or similar) ===
    if (line.startsWith("=") || line.startsWith("⊜")) {
      const parsed = parseSynonymLine(line);
      if (parsed.length > 0) synonyms.push(...parsed);
      inCollocationBlock = false;
      inRelatedBlock = false;
      inDerivativeBlock = false;
      continue;
    }

    // === Antonym (↔ ⇔ or various PDF symbols) ===
    // pdfjs may extract ↔ as different chars. Check for common patterns:
    // - explicit ↔ ⇔ characters
    // - line that starts with a word + pos + Korean AND appears right after synonyms
    if (
      line.startsWith("↔") ||
      line.startsWith("⇔") ||
      line.startsWith("⬌") ||
      line.startsWith("\u21D4") ||
      line.startsWith("\u2194")
    ) {
      const parsed = parseRelatedLine(
        line.replace(/^[↔⇔⬌\u21D4\u2194]\s*/, "")
      );
      if (parsed) antonyms.push(parsed);
      inCollocationBlock = false;
      inRelatedBlock = false;
      inDerivativeBlock = false;
      continue;
    }

    // Antonym without marker: right after synonym line, has word + pos + Korean
    // PDF uses a special symbol that pdfjs may drop entirely
    if (
      synonyms.length > 0 &&
      antonyms.length === 0 &&
      !inDerivativeBlock &&
      !inRelatedBlock &&
      !inCollocationBlock &&
      /^[a-z][\w-]*\s+(n|v|a|ad)\s+[\uAC00-\uD7AF]/.test(line) &&
      !isDerivativeLine(line)
    ) {
      const parsed = parseRelatedLine(line);
      if (parsed) {
        antonyms.push(parsed);
        continue;
      }
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

    // + continuation lines (no + prefix, but same pattern: English phrase + Korean)
    if (inRelatedBlock) {
      const expr = parseExpressionLine(line);
      if (expr) {
        relatedExpressions.push(expr);
        continue;
      } else {
        inRelatedBlock = false;
      }
    }

    // === Frequent Collocations block ===
    if (line.includes("어구로 자주 쓰인다") || line.includes("자주 쓰이는")) {
      inCollocationBlock = true;
      inRelatedBlock = false;
      inDerivativeBlock = false;
      collocations.push({ phrase: "", meaning: line, source: undefined });
      continue;
    }

    if (inCollocationBlock) {
      const coll = parseInlineCollocation(line);
      if (coll) {
        collocations.push(coll);
        continue;
      } else {
        inCollocationBlock = false;
      }
    }

    // === Derivative ===
    if (isDerivativeLine(line)) {
      inDerivativeBlock = true;
      inRelatedBlock = false;
      parseDerivativeLine(line, derivatives);
      continue;
    }

    // Derivative continuation
    if (inDerivativeBlock && derivatives.length > 0) {
      if (/^(n|v|a|ad)\s+[\uAC00-\uD7AF]/.test(line)) {
        const posMatch = line.match(/^(n|v|a|ad)\s+(.*)/);
        if (posMatch) {
          const lastDeriv = derivatives[derivatives.length - 1];
          lastDeriv.meaning += ` ${posMatch[1]} ${posMatch[2].trim().replace(/,$/, "")}`;
        }
        continue;
      }
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
    word,
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
  const parts = line.split(/\s+(?=(?:n|v|a|ad)\s+[\uAC00-\uD7AF])/);
  for (const part of parts) {
    const match = part.match(/^(n|v|a|ad)\s+(.+)/);
    if (match) out.push({ pos: match[1], meaning: match[2].trim() });
  }
}

function parseSynonymLine(line: string): ParsedRelated[] {
  const results: ParsedRelated[] = [];
  const cleaned = line.replace(/^[=⊜]\s*/, "");
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
  if (match)
    return { word: match[1].trim(), pos: match[2], meaning: match[3].trim() };
  const match2 = line.match(/^([a-zA-Z][\w\s'-]*?)\s+([\uAC00-\uD7AF].+)/);
  if (match2) return { word: match2[1].trim(), meaning: match2[2].trim() };
  return null;
}

/**
 * + 관련 표현 / continuation 줄 파싱
 * "struggle to ~하기 위해 애쓰다"
 * "struggle with ~으로 고심하다"
 */
function parseExpressionLine(line: string): ParsedCollocation | null {
  // Check for source tag
  let source: string | undefined;
  let cleaned = line;
  for (const tag of SOURCE_TAGS) {
    if (cleaned.endsWith(tag)) {
      source = tag;
      cleaned = cleaned.slice(0, -tag.length).trim();
      break;
    }
  }

  // English phrase + Korean meaning (separated by space before Korean)
  const match = cleaned.match(
    /^([a-zA-Z][\w\s'-]+?)\s+([\uAC00-\uD7AF~].+)/
  );
  if (match) {
    return { phrase: match[1].trim(), meaning: match[2].trim(), source };
  }

  // English-only expression (e.g., "reappoint v 재임명하다")
  const match2 = cleaned.match(/^([a-zA-Z][\w\s'-]+)\s+(n|v|a|ad)\s+([\uAC00-\uD7AF].+)/);
  if (match2) {
    return {
      phrase: match2[1].trim(),
      meaning: `${match2[2]} ${match2[3].trim()}`,
      source,
    };
  }

  return null;
}

function isDerivativeLine(line: string): boolean {
  return /^[a-z][\w]*(?:ly|ment|tion|sion|ness|ity|ance|ence|ous|ive|al|ful|less|able|ible|er|or|ist|ism|ize|ise|ate|ent|ant|ing|ed|es|en|ic|ical)?\s+(n|v|a|ad)\s+[\uAC00-\uD7AF]/.test(
    line
  );
}

function parseDerivativeLine(line: string, out: ParsedRelated[]): void {
  const wordMatch = line.match(/^([a-zA-Z][\w]*)\s+(.*)/);
  if (!wordMatch) return;
  const word = wordMatch[1].trim();
  const meaning = wordMatch[2].trim().replace(/,$/, "");
  if (meaning) out.push({ word, meaning });
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
  const match = cleaned.match(/^([a-zA-Z][\w\s'-]+?)\s+([\uAC00-\uD7AF].+)/);
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
    if (/^[=+↔⇔⊜]/.test(next)) break;
    if (/^\d{4}$/.test(next)) break;
    if (/^[A-Za-z]/.test(next)) {
      sentence += " " + next;
    } else {
      break;
    }
  }
  return sentence.replace(/\s+/g, " ").trim();
}
