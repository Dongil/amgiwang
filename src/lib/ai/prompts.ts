import type { AIMessage } from "./provider";

/** PDF 텍스트에서 영어단어 카드 추출 */
export function vocabFromPdfPrompt(pdfText: string, dayLabel: string): AIMessage[] {
  return [
    {
      role: "system",
      content: `You are an expert at extracting vocabulary data from Korean English vocabulary book PDFs.
Extract each word entry into a structured JSON format. Return a JSON object with a "cards" array.

Each card object must have these fields:
- word (string, required): The English headword
- phonetic (string | null): Phonetic transcription in brackets
- meanings (array, required): Array of {pos: string, meaning: string, synonyms: string[]}
  - pos: part of speech (v, n, adj, adv, etc.)
  - meaning: Korean meaning
  - synonyms: English synonyms
- example_sentence (string | null): English example sentence
- example_translation (string | null): Korean translation of example
- derivatives (array): Array of {word: string, meaning: string}
- antonyms (array): Array of {word: string, meaning: string}
- tips (string | null): Study tips or exam patterns
- difficulty_level (number): 1-3 based on star count (★)
- tags (string[]): Include "${dayLabel}" tag

Rules:
- Extract ALL words from the text, don't skip any
- The first meaning's meaning field becomes the card's primary meaning
- If phonetic has no brackets, wrap in []
- If difficulty stars aren't visible, default to 2
- Derivatives are marked with ◆ or similar markers
- Tips may include patterns like "with regard to", "A as B" etc.
- Return ONLY valid JSON, no markdown`,
    },
    {
      role: "user",
      content: `Extract vocabulary cards from this ${dayLabel} text:\n\n${pdfText}`,
    },
  ];
}

/** 텍스트에서 영어단어 카드 추출 */
export function vocabFromTextPrompt(text: string): AIMessage[] {
  return [
    {
      role: "system",
      content: `You are an expert at creating English vocabulary study cards for Korean students.
Given a list of English words or text, create structured vocabulary cards.
Return a JSON object with a "cards" array.

Each card object must have:
- word (string): The English word
- phonetic (string | null): IPA or simplified phonetic
- meanings (array): [{pos: string, meaning: string, synonyms: string[]}]
- example_sentence (string | null): A natural example sentence
- example_translation (string | null): Korean translation
- derivatives (array): [{word: string, meaning: string}]
- antonyms (array): [{word: string, meaning: string}]
- tips (string | null): Useful study tips in Korean
- difficulty_level (number): 1 (easy) to 3 (hard)
- tags (string[]): relevant tags

Return ONLY valid JSON, no markdown.`,
    },
    {
      role: "user",
      content: `Create vocabulary cards from:\n\n${text}`,
    },
  ];
}

/** 텍스트에서 일반과목 카드 추출 */
export function generalCardsFromTextPrompt(text: string, subject: string): AIMessage[] {
  return [
    {
      role: "system",
      content: `You are an expert at creating study flashcards for Korean students.
Given text content about "${subject}", create flashcard pairs.
Return a JSON object with a "cards" array.

Each card object must have:
- front_text (string): Question or term (in Korean)
- back_text (string): Answer or definition (in Korean)
- tags (string[]): relevant tags

Make the questions clear and concise. Focus on key concepts.
Return ONLY valid JSON, no markdown.`,
    },
    {
      role: "user",
      content: `Create study cards from:\n\n${text}`,
    },
  ];
}

/** 어원 분석 프롬프트 */
export function etymologyPrompt(word: string): AIMessage[] {
  return [
    {
      role: "system",
      content: `You are an expert etymologist. Analyze the given English word and provide its etymology breakdown.
Return a JSON object with:
- root (string | null): The root/base of the word (e.g., "gard" for "regard")
- prefix (string | null): Any prefix (e.g., "re-")
- suffix (string | null): Any suffix (e.g., "-tion")
- etymology_note (string): Korean explanation of the word's origin and how the parts combine to form the meaning. Keep it concise (1-2 sentences).

Return ONLY valid JSON, no markdown.`,
    },
    {
      role: "user",
      content: `Analyze the etymology of: "${word}"`,
    },
  ];
}

/** 니모닉 생성 프롬프트 */
export function mnemonicPrompt(word: string, meaning: string): AIMessage[] {
  return [
    {
      role: "system",
      content: `You are an expert at creating Korean mnemonic devices for English vocabulary.
Create a memorable association using Korean pronunciation similarity or vivid imagery.
Return a JSON object with:
- mnemonic (string): The mnemonic in Korean (1-2 sentences, creative and memorable)

Example: "abandon" (버리다) → "어! 밴던! 밴드를 던져버리다"
Example: "abstract" (추상적인) → "앱스트랙트 → 앱을 스트레칭해서 추상적으로 만들다"

Return ONLY valid JSON, no markdown.`,
    },
    {
      role: "user",
      content: `Create a Korean mnemonic for: "${word}" (meaning: ${meaning})`,
    },
  ];
}

/** 퀴즈 보기 생성 프롬프트 (객관식 오답 보기) */
export function quizChoicesPrompt(
  correctAnswer: string,
  context: string,
  quizType: string,
  otherWords?: string[]
): AIMessage[] {
  return [
    {
      role: "system",
      content: `You are a quiz generator for Korean students studying English vocabulary.
Generate wrong answer choices for a multiple-choice quiz question.
Return a JSON object with:
- choices (string[]): Exactly 3 plausible but incorrect choices

Rules:
- Choices should be plausible (similar difficulty, same part of speech if applicable)
- Choices should NOT be synonyms of the correct answer
- For Korean answers, use natural Korean
- For English answers, use natural English
${otherWords?.length ? `- Prefer selecting from these words in the same deck: ${otherWords.join(", ")}` : ""}

Return ONLY valid JSON, no markdown.`,
    },
    {
      role: "user",
      content: `Quiz type: ${quizType}\nCorrect answer: "${correctAnswer}"\nContext: ${context}`,
    },
  ];
}

/** PDF 목차에서 Day 구조 추출 */
export function tocParsePrompt(tocText: string): AIMessage[] {
  return [
    {
      role: "system",
      content: `You are an expert at parsing table of contents from Korean vocabulary books.
Extract the Day structure from the given text.
Return a JSON object with:
- days (array): [{day: number, startWord: number, endWord: number, page: number}]
- totalDays (number)
- wordsPerDay (number): estimated average words per day

Return ONLY valid JSON, no markdown.`,
    },
    {
      role: "user",
      content: `Parse this table of contents:\n\n${tocText}`,
    },
  ];
}
