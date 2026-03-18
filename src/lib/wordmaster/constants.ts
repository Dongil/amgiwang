export const SOURCE_BOOK = "Word Master 고등 Complete";
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

// Word Master 고등 Complete 실제 DAY 경계 (word_number 범위)
// DAY 1~17: 일반 단어 (각 50개)
// DAY 18~20: 숙어 (각 ~40개)
// DAY 21~25: 어원별 단어 (각 ~40개)
// DAY 26~30: 다의어/혼동어 (각 ~30개)
const DAY_BOUNDARIES: [number, number][] = [
  [1, 50],     // DAY 1
  [51, 100],   // DAY 2
  [101, 150],  // DAY 3
  [151, 200],  // DAY 4
  [201, 250],  // DAY 5
  [251, 300],  // DAY 6
  [301, 350],  // DAY 7
  [351, 400],  // DAY 8
  [401, 450],  // DAY 9
  [451, 500],  // DAY 10
  [501, 550],  // DAY 11
  [551, 600],  // DAY 12
  [601, 650],  // DAY 13
  [651, 680],  // DAY 14
  [681, 720],  // DAY 15
  [721, 760],  // DAY 16
  [761, 800],  // DAY 17
  [801, 840],  // DAY 18 (숙어)
  [841, 880],  // DAY 19 (숙어)
  [881, 920],  // DAY 20 (숙어)
  [921, 960],  // DAY 21 (어원)
  [961, 1000], // DAY 22 (어원)
  [1001, 1040],// DAY 23 (어원)
  [1041, 1070],// DAY 24 (어원)
  [1071, 1100],// DAY 25 (어원)
  [1101, 1115],// DAY 26 (다의어)
  [1116, 1125],// DAY 27 (다의어)
  [1126, 1132],// DAY 28 (혼동어)
  [1133, 1140],// DAY 29 (혼동어)
  [1141, 1200],// DAY 30 (혼동어)
];

export function dayForWordNumber(wordNumber: number): number {
  for (let i = 0; i < DAY_BOUNDARIES.length; i++) {
    const [start, end] = DAY_BOUNDARIES[i];
    if (wordNumber >= start && wordNumber <= end) {
      return i + 1;
    }
  }
  // fallback: 50개씩 균등 분배
  return Math.min(Math.ceil(wordNumber / 50), 30);
}
