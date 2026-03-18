export const SOURCE_BOOK = "Word Master 고등 Complete";
export const WORDS_PER_DAY = 50;
export const MAX_WORD_NUMBER = 1200;

export const POS_ABBR = ["n", "v", "a", "ad"] as const;
export type PosAbbr = (typeof POS_ABBR)[number];

export const SOURCE_TAGS = ["수능", "교과서", "학평", "모평"] as const;

// Word number regex: 4-digit number on its own line followed by word
export const WORD_ENTRY_RE = /\n(\d{4})\s*\n([a-zA-Z][\w\s''-]*?)\n/g;

// Part of speech + meaning: "n 증거, 흔적" or "v 입증하다"
export const POS_MEANING_RE = /^(n|v|a|ad)\s+(.+)$/;

// Synonym marker: "= word pos meaning"
export const SYNONYM_RE = /^=\s+(.+?)\s+(n|v|a|ad)\s+(.+)$/;

// Collocation with + prefix
export const COLLOCATION_PLUS_RE = /^\+\s+(.+?)(?:\s{2,}(.+))?$/;

// Source tag at end of line
export const SOURCE_TAG_RE = /\s+(수능|교과서|학평|모평)\s*$/;

// Derivative (tab-indented): "  word  pos  meaning"
export const DERIVATIVE_RE = /^\t(.+?)\s+(n|v|a|ad)\s+(.+)$/;

export function dayForWordNumber(wordNumber: number): number {
  return Math.ceil(wordNumber / WORDS_PER_DAY);
}
