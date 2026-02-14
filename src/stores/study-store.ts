"use client";

import { create } from "zustand";
import type { Deck, Card, VocabCard, DailyProgress } from "@/types/database";

type StudyMode = "flashcard" | "quiz" | "listening";

interface StudyState {
  currentDeck: Deck | null;
  currentCards: (Card | VocabCard)[];
  currentIndex: number;
  studyMode: StudyMode;
  dailyProgress: DailyProgress | null;
  isFlipped: boolean;

  setDeck: (deck: Deck) => void;
  setCards: (cards: (Card | VocabCard)[]) => void;
  setDailyProgress: (progress: DailyProgress | null) => void;
  nextCard: () => void;
  prevCard: () => void;
  flipCard: () => void;
  setStudyMode: (mode: StudyMode) => void;
  reset: () => void;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  currentDeck: null,
  currentCards: [],
  currentIndex: 0,
  studyMode: "flashcard",
  dailyProgress: null,
  isFlipped: false,

  setDeck: (deck) => set({ currentDeck: deck }),
  setCards: (cards) => set({ currentCards: cards, currentIndex: 0, isFlipped: false }),
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

  setStudyMode: (mode) => set({ studyMode: mode }),

  reset: () =>
    set({
      currentDeck: null,
      currentCards: [],
      currentIndex: 0,
      studyMode: "flashcard",
      dailyProgress: null,
      isFlipped: false,
    }),
}));
