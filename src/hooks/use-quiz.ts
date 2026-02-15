"use client";

import { useState, useCallback } from "react";
import type { VocabCard, Card, QuizType } from "@/types/database";

export interface QuizQuestion {
  id: string;
  type: QuizType;
  question: string;
  correctAnswer: string;
  choices?: string[];
  cardId: string;
  hint?: string;
}

export interface QuizAnswer {
  questionId: string;
  cardId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
}

interface UseQuizOptions {
  cards: (VocabCard | Card)[];
  deckType: "english_vocab" | "general";
  quizTypes: QuizType[];
  questionCount: number;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function useQuiz({ cards, deckType, quizTypes, questionCount }: UseQuizOptions) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(0);

  const generateQuestions = useCallback(() => {
    if (cards.length < 4) return;

    const selectedCards = shuffleArray([...cards]).slice(0, questionCount);
    const allCards = [...cards];

    const generated: QuizQuestion[] = selectedCards.map((card) => {
      const quizType = quizTypes[Math.floor(Math.random() * quizTypes.length)];

      if (deckType === "english_vocab") {
        const vc = card as unknown as VocabCard;
        const meaning = vc.meanings?.[0]?.meaning || vc.meaning;

        switch (quizType) {
          case "eng_to_kor": {
            // 영→한 4지선다
            const wrongCards = shuffleArray(
              (allCards as unknown as VocabCard[]).filter((c) => c.id !== vc.id)
            ).slice(0, 3);
            const wrongChoices = wrongCards.map(
              (c) => c.meanings?.[0]?.meaning || c.meaning
            );
            const choices = shuffleArray([meaning, ...wrongChoices]);
            return {
              id: `${vc.id}-${quizType}`,
              type: quizType,
              question: vc.word,
              correctAnswer: meaning,
              choices,
              cardId: vc.id,
              hint: vc.phonetic || undefined,
            };
          }
          case "kor_to_eng": {
            // 한→영 타이핑
            return {
              id: `${vc.id}-${quizType}`,
              type: quizType,
              question: meaning,
              correctAnswer: vc.word.toLowerCase(),
              cardId: vc.id,
              hint: vc.phonetic || undefined,
            };
          }
          case "fill_blank": {
            // 예문 빈칸
            const sentence = vc.example_sentence || `The word "${vc.word}" means ${meaning}.`;
            const blanked = sentence.replace(
              new RegExp(vc.word, "gi"),
              "________"
            );
            return {
              id: `${vc.id}-${quizType}`,
              type: quizType,
              question: blanked,
              correctAnswer: vc.word.toLowerCase(),
              cardId: vc.id,
              hint: meaning,
            };
          }
          case "listening": {
            // 발음 듣기 퀴즈 (TTS + 뜻 선택)
            const wrongCards = shuffleArray(
              (allCards as unknown as VocabCard[]).filter((c) => c.id !== vc.id)
            ).slice(0, 3);
            const wrongChoices = wrongCards.map(
              (c) => c.meanings?.[0]?.meaning || c.meaning
            );
            const choices = shuffleArray([meaning, ...wrongChoices]);
            return {
              id: `${vc.id}-${quizType}`,
              type: quizType,
              question: vc.word, // TTS로 읽어줄 단어
              correctAnswer: meaning,
              choices,
              cardId: vc.id,
            };
          }
          default: {
            // 기본: 영→한 객관식
            const wrongCards = shuffleArray(
              (allCards as unknown as VocabCard[]).filter((c) => c.id !== vc.id)
            ).slice(0, 3);
            const wrongChoices = wrongCards.map(
              (c) => c.meanings?.[0]?.meaning || c.meaning
            );
            const choices = shuffleArray([meaning, ...wrongChoices]);
            return {
              id: `${vc.id}-e2k`,
              type: "eng_to_kor" as QuizType,
              question: vc.word,
              correctAnswer: meaning,
              choices,
              cardId: vc.id,
            };
          }
        }
      } else {
        // 일반과목
        const gc = card as Card;
        switch (quizType) {
          case "ox": {
            // O/X 퀴즈
            const isTrue = Math.random() > 0.5;
            let displayAnswer = gc.back_text;
            if (!isTrue) {
              const wrongCard = shuffleArray(
                (allCards as unknown as Card[]).filter((c) => c.id !== gc.id)
              )[0];
              displayAnswer = wrongCard?.back_text || gc.back_text;
            }
            return {
              id: `${gc.id}-${quizType}`,
              type: quizType,
              question: `"${gc.front_text}"의 답: ${displayAnswer}`,
              correctAnswer: isTrue ? "O" : "X",
              choices: ["O", "X"],
              cardId: gc.id,
            };
          }
          default: {
            // 객관식
            const wrongCards = shuffleArray(
              (allCards as unknown as Card[]).filter((c) => c.id !== gc.id)
            ).slice(0, 3);
            const wrongChoices = wrongCards.map((c) => c.back_text);
            const choices = shuffleArray([gc.back_text, ...wrongChoices]);
            return {
              id: `${gc.id}-mc`,
              type: "multiple_choice" as QuizType,
              question: gc.front_text,
              correctAnswer: gc.back_text,
              choices,
              cardId: gc.id,
            };
          }
        }
      }
    });

    setQuestions(generated);
    setCurrentIndex(0);
    setAnswers([]);
    setIsFinished(false);
    setStartTime(Date.now());
    setQuestionStartTime(Date.now());
    return generated;
  }, [cards, deckType, quizTypes, questionCount]);

  const submitAnswer = useCallback(
    (userAnswer: string) => {
      const question = questions[currentIndex];
      if (!question) return;

      const isCorrect =
        question.choices
          ? userAnswer === question.correctAnswer
          : userAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();

      const answer: QuizAnswer = {
        questionId: question.id,
        cardId: question.cardId,
        userAnswer,
        isCorrect,
        timeSpent: (Date.now() - questionStartTime) / 1000,
      };

      const newAnswers = [...answers, answer];
      setAnswers(newAnswers);

      if (currentIndex + 1 >= questions.length) {
        setIsFinished(true);
      } else {
        setCurrentIndex((prev) => prev + 1);
        setQuestionStartTime(Date.now());
      }

      return isCorrect;
    },
    [questions, currentIndex, answers, questionStartTime]
  );

  const totalTimeSpent = isFinished
    ? Math.round((Date.now() - startTime) / 1000)
    : 0;

  const score = answers.filter((a) => a.isCorrect).length;

  const replaceQuestions = useCallback((updated: QuizQuestion[]) => {
    setQuestions(updated);
  }, []);

  return {
    questions,
    currentIndex,
    currentQuestion: questions[currentIndex] || null,
    answers,
    isFinished,
    score,
    totalQuestions: questions.length,
    totalTimeSpent,
    generateQuestions,
    submitAnswer,
    replaceQuestions,
  };
}
