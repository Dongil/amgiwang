export const queryKeys = {
  decks: {
    all: ["decks"] as const,
    list: (type?: string) => ["decks", "list", type] as const,
    detail: (id: string) => ["decks", "detail", id] as const,
  },
  cards: {
    list: (deckId: string) => ["cards", deckId] as const,
    detail: (id: string) => ["cards", "detail", id] as const,
  },
  vocabCards: {
    list: (deckId: string) => ["vocabCards", deckId] as const,
    detail: (id: string) => ["vocabCards", "detail", id] as const,
    paginated: (deckId: string, opts: { page: number; day: string | null; search: string }) =>
      ["vocabCards", deckId, "paginated", opts] as const,
  },
  studyRecords: {
    review: (userId: string) => ["studyRecords", "review", userId] as const,
  },
  studyPlans: {
    byDeck: (deckId: string) => ["studyPlans", deckId] as const,
  },
  profile: {
    me: ["profile", "me"] as const,
  },
  dailyMissions: {
    today: (userId: string) => ["dailyMissions", "today", userId] as const,
  },
} as const;
