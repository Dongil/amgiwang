export interface SM2Input {
  quality: number; // 0-5
  easeFactor: number;
  interval: number;
  repetitions: number;
}

export interface SM2Result {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
}

/**
 * SM-2 간격 반복 알고리즘
 *
 * quality 매핑:
 * - "모름"   → 0
 * - "어려움" → 2
 * - "좋음"   → 3
 * - "완벽"   → 5
 */
export function calculateSM2(input: SM2Input): SM2Result {
  const { quality, easeFactor: prevEF, interval: prevInterval, repetitions: prevReps } = input;

  let easeFactor: number;
  let interval: number;
  let repetitions: number;

  if (quality < 3) {
    // 틀림 → 리셋
    repetitions = 0;
    interval = 1;
    easeFactor = prevEF;
  } else {
    // 맞음 → interval 증가
    repetitions = prevReps + 1;

    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(prevInterval * prevEF);
    }

    // EF 조정
    easeFactor = prevEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  }

  // 최소 EF
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  // 다음 복습 날짜
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return { easeFactor, interval, repetitions, nextReviewDate };
}

/** UI 버튼 → quality 매핑 */
export const QUALITY_MAP = {
  again: 0,
  hard: 2,
  good: 3,
  easy: 5,
} as const;

export type QualityLabel = keyof typeof QUALITY_MAP;

/** SM-2 기본값 */
export const SM2_DEFAULTS = {
  easeFactor: 2.5,
  interval: 0,
  repetitions: 0,
} as const;
