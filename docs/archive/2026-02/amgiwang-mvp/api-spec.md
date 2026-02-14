# 암기왕 - API 명세 설계

> **PDCA Phase**: Design
> **작성일**: 2026-02-14

---

## API 아키텍처

```
클라이언트 (브라우저)
  ├── Supabase Client (직접 DB 접근 - RLS 보호)
  │   ├── Auth (회원가입/로그인/로그아웃)
  │   ├── CRUD (decks, cards, vocab_cards, ...)
  │   └── Storage (PDF, 이미지 업로드)
  │
  └── Next.js Route Handlers (서버 사이드)
      ├── /api/ai/* (AI API 호출 - API키 보호)
      └── /api/pdf/* (PDF 파싱)
```

> Supabase RLS가 데이터 접근을 보호하므로 별도 REST API 불필요.
> AI/PDF 처리만 Route Handler로 구현 (API키 서버 보관).

---

## 1. Supabase 클라이언트 CRUD 패턴

### 인증 (Supabase Auth)

```typescript
// 회원가입
supabase.auth.signUp({ email, password, options: { data: { display_name } }})

// 로그인
supabase.auth.signInWithPassword({ email, password })

// 로그아웃
supabase.auth.signOut()

// 현재 유저
supabase.auth.getUser()

// 세션 감시
supabase.auth.onAuthStateChange((event, session) => { ... })
```

### 프로필
```typescript
// 조회
supabase.from('profiles').select('*').eq('id', userId).single()

// 수정
supabase.from('profiles').update({ display_name, grade, daily_goal }).eq('id', userId)

// AI 설정 수정
supabase.from('profiles').update({ ai_provider, ai_api_key_encrypted }).eq('id', userId)
```

### 덱 CRUD
```typescript
// 목록 (내 덱)
supabase.from('decks').select('*').eq('user_id', userId).order('updated_at', { ascending: false })

// 타입별 필터
supabase.from('decks').select('*').eq('user_id', userId).eq('deck_type', 'english_vocab')

// 생성
supabase.from('decks').insert({ user_id, deck_type, title, subject, color })

// 수정
supabase.from('decks').update({ title, description }).eq('id', deckId)

// 삭제 (cascade로 cards, vocab_cards도 삭제)
supabase.from('decks').delete().eq('id', deckId)

// 공유 토글
supabase.from('decks').update({ is_shared: true, share_id: nanoid(8) }).eq('id', deckId)

// 공유 덱 조회 (비로그인도 가능)
supabase.from('decks').select('*, cards(*), vocab_cards(*)').eq('share_id', shareId).single()
```

### 일반 카드 CRUD
```typescript
// 목록
supabase.from('cards').select('*').eq('deck_id', deckId).order('position')

// 생성
supabase.from('cards').insert({ deck_id, front_text, back_text, tags, position })

// 수정
supabase.from('cards').update({ front_text, back_text, tags }).eq('id', cardId)

// 삭제
supabase.from('cards').delete().eq('id', cardId)

// 대량 생성
supabase.from('cards').insert(cardsArray)
```

### 영어단어 카드 CRUD
```typescript
// 목록
supabase.from('vocab_cards').select('*').eq('deck_id', deckId).order('position')

// 생성
supabase.from('vocab_cards').insert({
  deck_id, word, meaning, meaning_sub, phonetic,
  part_of_speech, example_sentence, example_translation,
  synonyms, antonyms, root, prefix, suffix,
  etymology_note, mnemonic, difficulty_level, tags, position
})

// 대량 생성 (AI 생성 결과)
supabase.from('vocab_cards').insert(vocabCardsArray)

// 사용자 니모닉 수정
supabase.from('vocab_cards').update({ mnemonic_user }).eq('id', cardId)
```

### 학습 기록 (SM-2)
```typescript
// 카드의 현재 학습 상태 조회
supabase.from('study_records')
  .select('*')
  .eq('user_id', userId)
  .eq('card_id', cardId)
  .eq('card_type', cardType)
  .single()

// 학습 기록 upsert (SM-2 결과 저장)
supabase.from('study_records').upsert({
  user_id, card_id, card_type,
  quality, ease_factor, interval, repetitions, next_review_date,
  reviewed_at: new Date().toISOString()
}, { onConflict: 'user_id,card_id,card_type' })

// 오늘 복습할 카드 조회
supabase.from('study_records')
  .select('card_id, card_type')
  .eq('user_id', userId)
  .lte('next_review_date', today)
```

### 학습 계획 & 진도
```typescript
// 학습 계획 생성
supabase.from('study_plans').insert({
  user_id, deck_id, total_cards, daily_amount,
  start_date, end_date, total_days
})

// 학습 계획 조회
supabase.from('study_plans')
  .select('*, daily_progress(*)')
  .eq('deck_id', deckId)
  .eq('user_id', userId)
  .single()

// 일일 진도 생성
supabase.from('daily_progress').insert({
  study_plan_id, user_id, day_number,
  target_card_ids, studied_at
})

// 진도 업데이트
supabase.from('daily_progress').update({
  completed_card_ids, progress_rate, is_completed
}).eq('id', progressId)
```

### 퀴즈 결과
```typescript
// 저장
supabase.from('quiz_results').insert({
  user_id, deck_id, quiz_type, score,
  total_questions, time_spent_sec, answers, day_number
})

// 덱별 결과 조회
supabase.from('quiz_results')
  .select('*')
  .eq('deck_id', deckId)
  .order('created_at', { ascending: false })
```

### PDF 업로드
```typescript
// 1. Storage에 파일 업로드
supabase.storage.from('pdfs').upload(`${userId}/${fileName}`, file)

// 2. pdf_uploads 레코드 생성
supabase.from('pdf_uploads').insert({
  user_id, deck_id, file_name, file_url, file_size, status: 'uploading'
})

// 3. 상태 업데이트
supabase.from('pdf_uploads').update({ status: 'processing' }).eq('id', uploadId)
```

---

## 2. Next.js Route Handlers (서버 사이드)

### POST /api/ai/generate-cards
일반과목 카드 AI 자동 생성

```typescript
// Request
{
  text: string,          // 교과서 텍스트 또는 추출된 PDF 텍스트
  count?: number,        // 생성할 카드 수 (기본: 자동)
  subject?: string       // 과목 힌트
}

// Response
{
  cards: Array<{
    front_text: string,
    back_text: string,
    tags: string[]
  }>
}
```

### POST /api/ai/generate-vocab
영어단어 카드 AI 자동 생성

```typescript
// Request
{
  text: string,          // 단어 리스트 텍스트 또는 PDF 추출 텍스트
  words?: string[],      // 또는 단어 배열 직접 입력
  include_etymology?: boolean,  // 어원 포함 여부
  include_mnemonic?: boolean    // 니모닉 포함 여부
}

// Response
{
  vocab_cards: Array<{
    word: string,
    meaning: string,
    meaning_sub?: string,
    phonetic: string,
    part_of_speech: string,
    example_sentence: string,
    example_translation: string,
    synonyms: string[],
    antonyms: string[],
    root?: string,
    prefix?: string,
    suffix?: string,
    etymology_note?: string,
    mnemonic?: string,
    difficulty_level: number
  }>
}
```

### POST /api/ai/generate-etymology
어원 분석 (기존 단어에 어원 정보 추가)

```typescript
// Request
{
  words: Array<{ word: string, meaning: string }>
}

// Response
{
  results: Array<{
    word: string,
    root: string,
    prefix: string,
    suffix: string,
    etymology_note: string,
    related_words: string[]  // 같은 어근 단어들
  }>
}
```

### POST /api/ai/generate-mnemonic
AI 연상 니모닉 생성

```typescript
// Request
{
  words: Array<{ word: string, meaning: string, phonetic?: string }>
}

// Response
{
  mnemonics: Array<{
    word: string,
    mnemonic: string  // 연상법 텍스트
  }>
}
```

### POST /api/ai/generate-quiz
퀴즈 생성 (일반 + 영어 모두)

```typescript
// Request
{
  deck_id: string,
  deck_type: 'general' | 'english_vocab',
  quiz_type: 'multiple_choice' | 'ox' | 'fill_blank' | 'subjective'
           | 'eng_to_kor' | 'kor_to_eng' | 'listening' | 'etymology',
  card_ids?: string[],    // 특정 카드 범위 지정
  day_number?: number,    // Day별 범위 퀴즈
  count: number           // 문제 수
}

// Response
{
  questions: Array<{
    id: string,
    type: string,
    question: string,
    options?: string[],     // 객관식 보기
    correct_answer: string,
    explanation: string,
    source_card_id: string
  }>
}
```

### POST /api/ai/chat
AI 심층 질문 대화

```typescript
// Request
{
  messages: Array<{ role: 'user' | 'assistant', content: string }>,
  deck_id?: string,
  context?: string   // 학습 중인 카드 내용 (컨텍스트)
}

// Response (스트리밍)
ReadableStream<{ content: string }>
```

### POST /api/ai/analyze
오답 분석

```typescript
// Request
{
  wrong_answers: Array<{
    question: string,
    correct_answer: string,
    user_answer: string,
    card_type: 'general' | 'english_vocab'
  }>
}

// Response
{
  analyses: Array<{
    question: string,
    why_wrong: string,
    correct_concept: string,
    study_tip: string,
    related_cards?: string[]
  }>
}
```

### POST /api/pdf/parse
PDF 텍스트 추출

```typescript
// Request
{
  file_url: string,     // Supabase Storage URL
  page_range?: string   // "1-15" (선택)
}

// Response
{
  text: string,           // 추출된 전체 텍스트
  page_count: number,
  pages: Array<{
    page_number: number,
    text: string
  }>
}
```

---

## 3. AI 프로바이더 추상화

```typescript
// lib/ai/provider.ts

interface AIProvider {
  generateCards(prompt: string): Promise<GeneratedCards>
  generateVocab(prompt: string): Promise<GeneratedVocab>
  generateQuiz(prompt: string): Promise<GeneratedQuiz>
  chat(messages: Message[], stream?: boolean): Promise<string | ReadableStream>
  analyze(prompt: string): Promise<Analysis>
}

// 팩토리 패턴
function createAIProvider(provider: 'gemini' | 'openai' | 'claude', apiKey: string): AIProvider {
  switch (provider) {
    case 'gemini': return new GeminiProvider(apiKey)
    case 'openai': return new OpenAIProvider(apiKey)
    case 'claude': return new ClaudeProvider(apiKey)
  }
}
```

### Route Handler 내 API키 처리 플로우 (워터폴 방지)

```typescript
// [Vercel Best Practice: async-api-routes, async-parallel]
// 독립 작업은 즉시 시작, 나중에 await

export async function POST(request: Request) {
  // 1. 독립적인 작업을 동시에 시작
  const bodyPromise = request.json()
  const keyPromise = getUserAIKey(request) // Supabase 조회 + 복호화

  // 2. 동시에 await
  const [body, { provider, apiKey }] = await Promise.all([
    bodyPromise,
    keyPromise
  ])

  // 3. AI 호출
  const ai = createAIProvider(provider, apiKey)
  return ai.generateCards(body.text)
}
```

### 서버 전용 모듈 (클라이언트 번들 제외)

```
[Vercel Best Practice: bundle-conditional]
다음 모듈은 Route Handler에서만 import. 클라이언트 코드에서 절대 import 금지.

- pdf-parse → /api/pdf/parse/route.ts 전용
- AI SDK 라이브러리 → /api/ai/*/route.ts 전용
- pgcrypto 복호화 → /api/ai/*/route.ts 전용
```

### 비블로킹 후속 작업 (after() 패턴)

```typescript
// [Vercel Best Practice: server-after-nonblocking]
// 학습 기록 저장은 사용자 응답을 블로킹하지 않음

import { after } from 'next/server'

// 학습 카드 평가 후 즉시 응답, 후속 작업은 비블로킹
export async function POST(request: Request) {
  const { cardId, quality } = await request.json()
  const sm2Result = calculateSM2(quality, ...)

  const response = NextResponse.json({
    success: true,
    nextReviewDate: sm2Result.nextReviewDate
  })

  after(async () => {
    await Promise.all([
      updateStudyRecord(sm2Result),
      updateXP(userId, 5),
      checkBadgeConditions(userId),
      updateDailyProgress(userId, cardId),
      updateStreakCount(userId)
    ])
  })

  return response
}
```

---

## 4. TanStack Query Key 표준화

```typescript
// [Vercel Best Practice: client-swr-dedup]
// queryKey를 표준화하여 중복 요청 자동 방지

export const queryKeys = {
  decks: {
    all: ['decks'] as const,
    list: (type?: string) => ['decks', 'list', type] as const,
    detail: (id: string) => ['decks', 'detail', id] as const,
  },
  cards: {
    list: (deckId: string) => ['cards', deckId] as const,
    detail: (id: string) => ['cards', 'detail', id] as const,
  },
  vocabCards: {
    list: (deckId: string) => ['vocabCards', deckId] as const,
  },
  studyRecords: {
    review: (userId: string) => ['studyRecords', 'review', userId] as const,
  },
  studyPlans: {
    byDeck: (deckId: string) => ['studyPlans', deckId] as const,
  },
} as const
```

---

## 5. SM-2 알고리즘 명세

```typescript
// lib/sm2.ts

interface SM2Result {
  easeFactor: number
  interval: number
  repetitions: number
  nextReviewDate: Date
}

function calculateSM2(
  quality: number,      // 0-5 (0-1: 모름, 2: 어려움, 3: 좋음, 4-5: 완벽)
  prevEaseFactor: number,
  prevInterval: number,
  prevRepetitions: number
): SM2Result {
  // quality < 3 → 리셋 (처음부터)
  // quality >= 3 → interval 증가
  // easeFactor 조정: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  // 최소 easeFactor: 1.3
}

// UI 매핑
// "모름" → quality 0
// "어려움" → quality 2
// "좋음" → quality 3
// "완벽" → quality 5
```

---

## 5. Middleware (인증 보호)

```typescript
// middleware.ts
// (auth) 그룹 = 비로그인 접근 가능
// (main) 그룹 = 로그인 필수 → 비로그인 시 /login 리다이렉트
// /share/[shareId] = 비로그인 접근 가능
// /api/ai/* = 로그인 필수 (Supabase 세션 검증)
```
