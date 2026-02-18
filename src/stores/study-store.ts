"use client";

import { create } from "zustand";
import type { Deck, Card, VocabCard, DailyProgress } from "@/types/database";

type StudyMode = "flashcard" | "quiz" | "listening";

interface StudyState {
  currentDeck: Deck | null;
  allCards: (Card | VocabCard)[];
  currentCards: (Card | VocabCard)[];
  currentIndex: number;
  currentDay: number | null;
  studyMode: StudyMode;
  dailyProgress: DailyProgress | null;
  isFlipped: boolean;

  setDeck: (deck: Deck) => void;
  setCards: (cards: (Card | VocabCard)[]) => void;
  setAllCards: (cards: (Card | VocabCard)[]) => void;
  setDailyProgress: (progress: DailyProgress | null) => void;
  nextCard: () => void;
  prevCard: () => void;
  flipCard: () => void;
  goToIndex: (index: number) => void;
  filterByDay: (day: number | null) => void;
  setStudyMode: (mode: StudyMode) => void;
  reset: () => void;
}

function filterCardsByDay(cards: (Card | VocabCard)[], day: number | null): (Card | VocabCard)[] {
  if (day === null) return cards;
  const tag = `Day${day}`;
  return cards.filter((c) => {
    const tags = "tags" in c ? (c as { tags: string[] }).tags : [];
    return tags.some((t) => t.toLowerCase() === tag.toLowerCase());
  });
}

export const useStudyStore = create<StudyState>((set, get) => ({
  currentDeck: null,
  allCards: [],
  currentCards: [],
  currentIndex: 0,
  currentDay: null,
  studyMode: "flashcard",
  dailyProgress: null,
  isFlipped: false,

  setDeck: (deck) => set({ currentDeck: deck }),

  setCards: (cards) =>
    set({ currentCards: cards, allCards: cards, currentIndex: 0, isFlipped: false, currentDay: null }),

  setAllCards: (cards) =>
    set({ allCards: cards, currentCards: cards, currentIndex: 0, isFlipped: false, currentDay: null }),

  setDailyProgress: (progress) => set({ dailyProgress: progress }),

  nextCard: () => {
    const { currentIndex, currentCards } = get();
    if (currentIndex < currentCards.length - 1) {
      set({ currentIndex: currentIndex + 1, isFlipped: false });
    }
  },

  prevCard: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1, isFlipped: false });
    }
  },

  flipCard: () => set({ isFlipped: !get().isFlipped }),

  goToIndex: (index: number) => {
    const { currentCards } = get();
    if (index >= 0 && index < currentCards.length) {
      set({ currentIndex: index, isFlipped: false });
    }
  },

  filterByDay: (day: number | null) => {
    const { allCards } = get();
    const filtered = filterCardsByDay(allCards, day);
    set({ currentCards: filtered, currentIndex: 0, currentDay: day, isFlipped: false });
  },

  setStudyMode: (mode) => set({ studyMode: mode }),

  reset: () =>
    set({
      currentDeck: null,
      allCards: [],
      currentCards: [],
      currentIndex: 0,
      currentDay: null,
      studyMode: "flashcard",
      dailyProgress: null,
      isFlipped: false,
    }),
}));
