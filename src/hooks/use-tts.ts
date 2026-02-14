"use client";

import { useCallback } from "react";

export function useTts() {
  const speak = useCallback((text: string, lang: string = "en-US") => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  }, []);

  return { speak };
}
