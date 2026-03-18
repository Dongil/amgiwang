export interface ParsedMeaning {
  pos: string;
  meaning: string;
}

export interface ParsedRelated {
  word: string;
  pos?: string;
  meaning: string;
}

export interface ParsedCollocation {
  phrase: string;
  meaning: string;
  source?: string;
}

export interface WordMasterEntry {
  wordNumber: number;
  dayNumber: number;
  word: string;
  meanings: ParsedMeaning[];
  exampleSentence: string;
  exampleTranslation: string;
  synonyms: ParsedRelated[];
  antonyms: ParsedRelated[];
  relatedExpressions: ParsedCollocation[];
  collocations: ParsedCollocation[];
  derivatives: ParsedRelated[];
  etymologyNote?: string;
}

export interface ParseResult {
  totalDays: number;
  totalWords: number;
  entries: WordMasterEntry[];
  errors: string[];
}
