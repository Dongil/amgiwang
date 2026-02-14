# 암기왕 - Vercel React Best Practices 검토 리포트

> **검토 대상**: plan-amgiwang.md v1.1, data-model.md, api-spec.md, component-spec.md
> **검토 기준**: Vercel React Best Practices v0.1.0 (45 rules, 8 categories)
> **검토일**: 2026-02-14

---

## 검토 요약

| 우선순위 | 카테고리 | 이슈 수 | 심각도 |
|---------|---------|---------|--------|
| 1 | Eliminating Waterfalls | 4 | CRITICAL |
| 2 | Bundle Size Optimization | 3 | CRITICAL |
| 3 | Server-Side Performance | 4 | HIGH |
| 4 | Client-Side Data Fetching | 1 | MEDIUM-HIGH |
| 5 | Re-render Optimization | 2 | MEDIUM |
| 6 | Rendering Performance | 2 | MEDIUM |
| 7 | JavaScript Performance | 1 | LOW-MEDIUM |
| 8 | Advanced Patterns | 0 | - |
| | **합계** | **17** | |

---

## 1. Eliminating Waterfalls (CRITICAL) - 4건

### 1-1. API Route Handler에서 워터폴 발생 위험
**규칙**: `async-api-routes`, `async-parallel`

**문제**: api-spec.md의 Route Handler 플로우가 순차적 (워터폴)
```
1. 클라이언트 → Route Handler (요청)
2. Route Handler → Supabase (ai_api_key 조회)    ← await
3. 복호화                                        ← await
4. Route Handler → AI API (호출)                  ← await
5. 응답 반환
```
Step 2 (API키 조회)와 요청 데이터 파싱은 독립적이므로 병렬 실행 가능.

**권고 - 설계 수정**:
```typescript
// api-spec.md Route Handler 패턴에 추가
export async function POST(request: Request) {
  // 독립적인 작업은 즉시 시작, 나중에 await
  const bodyPromise = request.json()
  const keyPromise = getUserAIKey(request)  // Supabase 조회 + 복호화

  const [body, { provider, apiKey }] = await Promise.all([
    bodyPromise,
    keyPromise
  ])

  const ai = createAIProvider(provider, apiKey)
  return ai.generateCards(body.text)
}
```

### 1-2. 대시보드 다중 데이터 페칭 워터폴 위험
**규칙**: `async-suspense-boundaries`, `server-parallel-fetching`

**문제**: component-spec.md 대시보드에 6개 컴포넌트가 각각 독립 데이터를 필요로 함
- `DailyStudyCard` → study_plans + daily_progress
- `ReviewCard` → study_records
- `StreakBadge` → profiles.streak_count
- `LevelProgressBar` → profiles.xp, level
- `DailyMissions` → daily_missions
- `WeeklyHeatmap` → study_records (주간)

모두 순차적으로 fetch하면 심각한 워터폴 발생.

**권고 - 설계 수정**:
```
component-spec.md 대시보드 섹션에 다음 패턴 명시:

1. Server Component로 대시보드 구현
2. 각 섹션을 독립 async Server Component로 분리
3. Suspense boundary로 개별 스트리밍

// (main)/page.tsx (Server Component)
export default function Dashboard() {
  return (
    <>
      <Suspense fallback={<LevelSkeleton />}>
        <LevelProgressBar />           {/* 독립 fetch */}
      </Suspense>
      <Suspense fallback={<StreakSkeleton />}>
        <StreakBadge />                 {/* 독립 fetch */}
      </Suspense>
      <Suspense fallback={<StudySkeleton />}>
        <DailyStudyCard />             {/* 독립 fetch */}
      </Suspense>
      <Suspense fallback={<ReviewSkeleton />}>
        <ReviewCard />                 {/* 독립 fetch */}
      </Suspense>
      <Suspense fallback={<MissionSkeleton />}>
        <DailyMissions />              {/* 독립 fetch */}
      </Suspense>
      <Suspense fallback={<HeatmapSkeleton />}>
        <WeeklyHeatmap />              {/* 독립 fetch */}
      </Suspense>
    </>
  )
}
```

### 1-3. 덱 상세 + 카드 목록 + 학습계획 워터폴
**규칙**: `async-parallel`

**문제**: decks/[id]/page.tsx에서 덱 정보, 카드 목록, 학습 계획을 순차 조회 위험.

**권고**:
```typescript
// 설계에 명시: 덱 상세 페이지는 Promise.all 사용
const [deck, cards, studyPlan] = await Promise.all([
  supabase.from('decks').select('*').eq('id', deckId).single(),
  supabase.from(deckType === 'english_vocab' ? 'vocab_cards' : 'cards')
    .select('*').eq('deck_id', deckId).order('position'),
  supabase.from('study_plans').select('*, daily_progress(*)')
    .eq('deck_id', deckId).maybeSingle()
])
```

### 1-4. PDF 업로드 → 파싱 → AI 생성 순차 처리
**규칙**: `async-defer-await`

**문제**: PDF 플로우가 완전 순차적. 사용자가 페이지 범위 선택 전에 파싱을 시작할 수 있음.

**권고**:
```
PDF 업로드 완료 시 즉시 백그라운드 파싱 시작 (전체 텍스트 추출)
→ 사용자가 페이지 범위 선택
→ 이미 추출된 텍스트에서 해당 범위만 AI에 전달
= 대기 시간 크게 단축
```

---

## 2. Bundle Size Optimization (CRITICAL) - 3건

### 2-1. shadcn/ui + lucide-react 배럴 임포트 주의
**규칙**: `bundle-barrel-imports`

**문제**: component-spec.md에 lucide-react 아이콘 사용 예정 (Home, BookOpen, BarChart3 등).
배럴 임포트 시 1,583개 모듈 로드 → 초기 로딩 2.8초 추가.

**권고 - next.config.js에 명시**:
```javascript
// next.config.js에 다음 추가 필수
module.exports = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons']
  }
}
```

### 2-2. AI 채팅/퀴즈 등 무거운 컴포넌트 Dynamic Import
**규칙**: `bundle-dynamic-imports`

**문제**: 통계 차트(recharts 등), AI 채팅, 퀴즈 모드 등은 초기 로딩에 불필요하나
정적 import 시 메인 번들에 포함됨.

**권고 - component-spec.md에 Dynamic Import 대상 명시**:
```typescript
// 다음 컴포넌트는 반드시 next/dynamic 사용
const QuizMode = dynamic(() => import('@/components/quiz/quiz-mode'))
const AIChatMode = dynamic(() => import('@/components/ai/ai-chat'))
const StatsCharts = dynamic(() => import('@/components/stats/charts'), { ssr: false })
const PdfUploader = dynamic(() => import('@/components/pdf/pdf-uploader'))
const VocabFlashcard = dynamic(() => import('@/components/study/vocab-flashcard'))
```

### 2-3. PDF 파싱 라이브러리 서버 전용
**규칙**: `bundle-conditional`

**문제**: plan에 `pdf-parse` 명시. 이 라이브러리는 서버에서만 사용되지만
Route Handler가 아닌 곳에서 import하면 클라이언트 번들에 포함될 수 있음.

**권고**:
```
- pdf-parse는 /api/pdf/parse/route.ts에서만 import
- 클라이언트 코드에서 절대 import 금지
- api-spec.md에 "서버 전용 모듈" 섹션 추가
```

---

## 3. Server-Side Performance (HIGH) - 4건

### 3-1. RSC/Client Component 경계가 설계에 미정의
**규칙**: `server-serialization`, `server-parallel-fetching`

**문제**: component-spec.md에 Server Component vs Client Component 구분이 없음.
모든 컴포넌트가 'use client'로 구현되면 SSR 성능 이점을 잃음.

**권고 - 컴포넌트별 서버/클라이언트 구분 명시**:
```
Server Components (데이터 페칭, SEO):
- (main)/page.tsx (대시보드)
- decks/page.tsx (덱 목록)
- decks/[id]/page.tsx (덱 상세)
- stats/page.tsx (통계)
- share/[shareId]/page.tsx (공유 덱)

Client Components ('use client'):
- study/page.tsx (학습 모드 - 인터랙션 필수)
- quiz/page.tsx (퀴즈 - 인터랙션 필수)
- ai-chat/page.tsx (채팅 - 실시간)
- components/study/* (카드 뒤집기, 스와이프)
- components/quiz/* (선택, 타이머)
- components/pdf/pdf-uploader.tsx (파일 드래그&드롭)
- BottomNav (active 상태 관리)
- QualityButtons (클릭 핸들러)
- TtsButton (Web Speech API)
```

### 3-2. RSC → Client 직렬화 데이터 최소화
**규칙**: `server-serialization`

**문제**: vocab_cards가 17개 필드. 덱 목록 페이지에서 카드 수만 필요한데
전체 카드 데이터를 Client Component에 전달하면 직렬화 비용 과다.

**권고**:
```
- 덱 목록: decks 테이블만 조회 (card_count 캐시 활용)
- 덱 상세: 필요한 필드만 select
- 학습 모드: 현재 표시 카드 1장 + 다음 2장만 프리페치

supabase.from('vocab_cards')
  .select('id, word, meaning, phonetic')  // 목록용: 4필드만
  .eq('deck_id', deckId)

supabase.from('vocab_cards')
  .select('*')  // 학습용: 전체 필드
  .eq('id', cardId).single()
```

### 3-3. 공유 덱 페이지에 React.cache() 미적용
**규칙**: `server-cache-react`

**문제**: share/[shareId]/page.tsx에서 같은 요청 내 덱 정보를 여러 컴포넌트에서 중복 조회 가능.

**권고 - api-spec.md에 추가**:
```typescript
import { cache } from 'react'

export const getSharedDeck = cache(async (shareId: string) => {
  return supabase.from('decks')
    .select('*, cards(*), vocab_cards(*)')
    .eq('share_id', shareId).single()
})
```

### 3-4. after() 활용 미설계
**규칙**: `server-after-nonblocking`

**문제**: 학습 기록 저장, XP 업데이트, 뱃지 체크 등이 학습 플로우를 블로킹할 수 있음.

**권고**:
```typescript
import { after } from 'next/server'

// 학습 카드 평가 API에서
export async function POST(request: Request) {
  const { cardId, quality } = await request.json()
  const sm2Result = calculateSM2(quality, ...)

  // 즉시 응답 (사용자 대기 최소화)
  const response = NextResponse.json({ success: true, nextReviewDate: sm2Result.nextReviewDate })

  // 비블로킹으로 후속 작업 처리
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

## 4. Client-Side Data Fetching (MEDIUM-HIGH) - 1건

### 4-1. TanStack Query vs SWR 결정 + 중복 요청 방지
**규칙**: `client-swr-dedup`

**문제**: plan에 TanStack Query 선택했으나 설계에서 dedupe 패턴 미정의.
학습 화면에서 카드 데이터를 여러 컴포넌트가 동시 요청 가능.

**권고 - api-spec.md에 추가**:
```typescript
// TanStack Query는 기본적으로 같은 queryKey에 대해 dedupe 지원
// 하지만 queryKey 설계를 표준화해야 함

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

## 5. Re-render Optimization (MEDIUM) - 2건

### 5-1. Zustand Store 세분화 필요
**규칙**: `rerender-derived-state`, `rerender-defer-reads`

**문제**: study-store.ts에 `currentCards` (배열 전체)를 구독하면
카드 1장 평가 시 전체 카드 목록 구독 컴포넌트가 리렌더링됨.

**권고**:
```typescript
// study-store에 selector 패턴 추가
const currentCard = useStudyStore(s => s.currentCards[s.currentIndex])
const progress = useStudyStore(s => s.currentIndex / s.currentCards.length)
// 전체 배열 구독 대신 파생 값만 구독
```

### 5-2. QualityButtons에 useTransition 적용
**규칙**: `rerender-transitions`

**문제**: SM-2 평가 버튼 클릭 시 다음 카드 전환 + DB 저장이 동시 발생.
DB 저장이 완료될 때까지 UI가 블로킹될 수 있음.

**권고**:
```typescript
// QualityButtons에서 카드 전환은 즉시, DB 저장은 transition으로
const [isPending, startTransition] = useTransition()

function handleRate(quality: number) {
  nextCard() // 즉시 다음 카드 표시

  startTransition(async () => {
    await rateCard(quality) // 비긴급: DB 저장
  })
}
```

---

## 6. Rendering Performance (MEDIUM) - 2건

### 6-1. 카드 목록에 content-visibility 미적용
**규칙**: `rendering-content-visibility`

**문제**: 덱에 500장 이상 카드가 있을 때 카드 목록 렌더링 성능 저하 가능.

**권고 - component-spec.md에 추가**:
```css
/* 카드 목록 아이템에 적용 */
.card-list-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 80px; /* 예상 높이 */
}
```

또는 가상화 라이브러리(react-window/tanstack-virtual) 고려.

### 6-2. 조건부 렌더링 && 대신 삼항 연산자 사용
**규칙**: `rendering-conditional-render`

**문제**: 설계에서 명시적 렌더링 패턴 미정의. `&&` 사용 시 0이나 빈 문자열 렌더링 버그 가능.

**권고 - 코딩 컨벤션에 추가**:
```tsx
// Bad
{cards.length && <CardList cards={cards} />}  // 0 렌더링 버그

// Good
{cards.length > 0 ? <CardList cards={cards} /> : null}
```

---

## 7. JavaScript Performance (LOW-MEDIUM) - 1건

### 7-1. SM-2 연산 결과 캐싱
**규칙**: `js-cache-function-results`

**문제**: 같은 카드를 여러 번 조회할 때 SM-2 계산 반복 가능.

**권고**:
```typescript
// SM-2 결과를 Map에 캐싱
const sm2Cache = new Map<string, SM2Result>()

function getCachedSM2(cardId: string, quality: number, prev: SM2State): SM2Result {
  const key = `${cardId}:${quality}:${prev.easeFactor}:${prev.interval}`
  if (sm2Cache.has(key)) return sm2Cache.get(key)!
  const result = calculateSM2(quality, prev.easeFactor, prev.interval, prev.repetitions)
  sm2Cache.set(key, result)
  return result
}
```

---

## 설계 문서 수정 권고 사항 요약

### 반드시 반영 (CRITICAL/HIGH) - 11건

| # | 규칙 | 수정 대상 | 내용 |
|---|------|----------|------|
| 1 | `async-api-routes` | api-spec.md | Route Handler에 Promise.all 패턴 추가 |
| 2 | `async-suspense-boundaries` | component-spec.md | 대시보드 Suspense 경계 설계 추가 |
| 3 | `async-parallel` | component-spec.md | 덱 상세 병렬 페칭 패턴 추가 |
| 4 | `async-defer-await` | plan / api-spec.md | PDF 백그라운드 파싱 전략 추가 |
| 5 | `bundle-barrel-imports` | plan (next.config.js) | optimizePackageImports 설정 |
| 6 | `bundle-dynamic-imports` | component-spec.md | Dynamic Import 대상 목록 추가 |
| 7 | `bundle-conditional` | api-spec.md | 서버 전용 모듈 섹션 추가 |
| 8 | `server-serialization` | component-spec.md | **RSC/Client 구분 명시** |
| 9 | `server-serialization` | api-spec.md | select 필드 최소화 패턴 |
| 10 | `server-cache-react` | api-spec.md | 공유 덱 React.cache() |
| 11 | `server-after-nonblocking` | api-spec.md | 학습 기록 after() 패턴 |

### 권장 반영 (MEDIUM) - 6건

| # | 규칙 | 수정 대상 | 내용 |
|---|------|----------|------|
| 12 | `client-swr-dedup` | api-spec.md | queryKey 표준화 |
| 13 | `rerender-derived-state` | component-spec.md | Zustand selector 패턴 |
| 14 | `rerender-transitions` | component-spec.md | QualityButtons useTransition |
| 15 | `rendering-content-visibility` | component-spec.md | 카드 목록 가상화 |
| 16 | `rendering-conditional-render` | 코딩 컨벤션 | 삼항 연산자 규칙 |
| 17 | `js-cache-function-results` | api-spec.md | SM-2 캐싱 |

---

## 종합 평가

**현재 설계 점수: 68/100**

| 영역 | 점수 | 비고 |
|------|------|------|
| 기능 설계 완성도 | 95/100 | 매우 상세하고 빈틈 없음 |
| 데이터 모델 | 90/100 | RLS, 인덱스 잘 설계됨 |
| 성능 최적화 설계 | 45/100 | RSC/Client 구분, 워터폴 방지 미흡 |
| 번들 최적화 | 50/100 | Dynamic Import, 배럴 임포트 미고려 |
| 렌더링 최적화 | 60/100 | 가상화, content-visibility 미고려 |

**핵심 조치 3가지**:
1. component-spec.md에 **Server/Client Component 경계** 명확히 정의
2. 대시보드 + 덱 상세에 **Suspense + 병렬 페칭** 패턴 설계
3. next.config.js에 **optimizePackageImports** + Dynamic Import 대상 목록 확정
