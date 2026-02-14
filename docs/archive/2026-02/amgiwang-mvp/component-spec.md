# 암기왕 - 컴포넌트 & 화면 설계

> **PDCA Phase**: Design
> **작성일**: 2026-02-14

---

## 라우팅 구조

```
/                         → 리다이렉트 (/login 또는 /dashboard)
├── (auth)/               → 비로그인 레이아웃
│   ├── login             → 로그인
│   └── signup            → 회원가입
├── (main)/               → 로그인 레이아웃 (Bottom Nav)
│   ├── /                 → 대시보드 (홈)
│   ├── decks             → 덱 목록
│   ├── decks/new         → 덱 생성
│   ├── decks/[id]        → 덱 상세
│   ├── decks/[id]/edit   → 덱 편집
│   ├── decks/[id]/cards/new       → 카드 추가
│   ├── decks/[id]/upload-pdf      → PDF 업로드
│   ├── decks/[id]/study-plan      → 학습 계획
│   ├── decks/[id]/study           → 학습 모드
│   ├── decks/[id]/quiz            → 퀴즈 모드
│   ├── decks/[id]/ai-chat         → AI 대화
│   ├── stats             → 통계
│   └── settings           → 설정
│       └── ai             → AI 설정
├── share/[shareId]       → 공유 덱 뷰 (비로그인 가능)
└── api/                  → Route Handlers
```

---

## 레이아웃

### (main)/layout.tsx - 메인 레이아웃
```
┌─────────────────────────────────┐
│  [Header: 암기왕 로고 + 알림]    │
│─────────────────────────────────│
│                                 │
│         [Page Content]          │
│        (children 영역)           │
│                                 │
│─────────────────────────────────│
│  🏠홈  📚덱  📊통계  ⚙️설정     │  ← Bottom Navigation
└─────────────────────────────────┘
```

### Bottom Navigation 컴포넌트
```typescript
// components/layout/bottom-nav.tsx
const navItems = [
  { href: '/', icon: Home, label: '홈' },
  { href: '/decks', icon: BookOpen, label: '덱' },
  { href: '/stats', icon: BarChart3, label: '통계' },
  { href: '/settings', icon: Settings, label: '설정' },
]
```

---

## 주요 화면별 컴포넌트

### 1. 대시보드 (홈)

```
┌──────────────────────────────┐
│  안녕, {이름}! 👋             │
│  Lv.{n}  ━━━━━━━ {xp} XP    │
├──────────────────────────────┤
│  🔥 {n}일 연속 학습 중!       │
├──────────────────────────────┤
│  📋 오늘의 학습                │
│  ┌────────────────────────┐  │
│  │ 📚 {덱이름} Day {n}/{N}│  │
│  │ ━━━━━━━━━ {n}% 완료    │  │
│  │ 오늘 분량: {n}장 남음   │  │
│  │       [학습 시작]       │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ 🔄 복습할 카드 {n}장    │  │
│  │       [복습 시작]       │  │
│  └────────────────────────┘  │
├──────────────────────────────┤
│  🎯 오늘의 미션               │
│  ☐ 카드 30장 복습 (0/30)     │
│  ☐ 퀴즈 3회 도전 (1/3)       │
│  ☑ 10분 이상 학습 ✅ +10XP   │
├──────────────────────────────┤
│  📅 이번 주 학습              │
│  월 화 수 목 금 토 일         │
│  🟩 🟩 🟩 🟨 ⬜ ⬜ ⬜        │  ← 히트맵
└──────────────────────────────┘
```

**컴포넌트 분해:**
- `DailyStudyCard` - 오늘의 학습 진도 (study_plans + daily_progress)
- `ReviewCard` - 복습 필요 카드 수 (study_records)
- `StreakBadge` - 연속 학습일 표시
- `LevelProgressBar` - XP/레벨 진행 바
- `DailyMissions` - 일일 미션 리스트
- `WeeklyHeatmap` - 주간 학습 히트맵

### 2. 덱 목록

```
┌──────────────────────────────┐
│  내 덱                        │
│  [영어단어🔤] [일반과목📖]     │  ← 타입 탭
│  과목: [전체▼]                 │  ← 과목 필터
├──────────────────────────────┤
│  ┌────────────────────────┐  │
│  │ 🔤 수능 필수 영단어     │  │
│  │ 영어 · 450단어          │  │
│  │ Day 5/14 ━━━━ 35%      │  │
│  │ 암기율 72%              │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ 📖 한국사 근현대사      │  │
│  │ 한국사 · 120카드        │  │
│  │ Day 3/7 ━━━━ 42%       │  │
│  │ 암기율 58%              │  │
│  └────────────────────────┘  │
│                              │
│        [+ 새 덱 만들기]       │
└──────────────────────────────┘
```

**컴포넌트:**
- `DeckTypeTab` - 영어단어/일반과목 탭
- `SubjectFilter` - 과목 필터 드롭다운
- `DeckCard` - 덱 카드 (제목, 카드수, 진도, 암기율)
- `CreateDeckButton` - FAB 또는 버튼

### 3. 덱 생성

```
┌──────────────────────────────┐
│  ← 새 덱 만들기               │
├──────────────────────────────┤
│  덱 타입 선택                  │
│  ┌──────┐  ┌──────┐          │
│  │ 🔤   │  │ 📖   │          │
│  │영어  │  │일반  │          │
│  │단어장│  │과목  │          │
│  └──────┘  └──────┘          │
├──────────────────────────────┤
│  덱 이름: [                 ]│
│  과목:    [영어     ▼       ]│
│  설명:    [                 ]│
│  색상:    🔴🟠🟡🟢🔵🟣      │
├──────────────────────────────┤
│  카드 추가 방법:               │
│  [📄 PDF 업로드]              │
│  [✍️ 직접 입력]               │
│  [🤖 AI 자동 생성]            │
│  [📋 CSV 붙여넣기]            │
├──────────────────────────────┤
│  학습 계획 (선택):             │
│  일일 분량: [30] 장            │
│  학습 기간: [14] 일            │
├──────────────────────────────┤
│         [덱 만들기]            │
└──────────────────────────────┘
```

**컴포넌트:**
- `DeckTypeSelector` - 영어단어/일반과목 선택
- `DeckForm` - 덱 정보 입력 폼
- `CardInputMethodSelector` - 카드 추가 방법 선택
- `StudyPlanForm` - 학습 계획 설정

### 4. PDF 업로드 화면

```
┌──────────────────────────────┐
│  ← PDF 업로드                 │
├──────────────────────────────┤
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│  │                        │  │
│  │   📄 PDF 파일을 끌어    │  │
│  │   놓거나 클릭하세요     │  │
│  │                        │  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│  📎 vocabulary.pdf (2.3MB)   │  ← 업로드된 파일
│  ━━━━━━━━━━━━━━━━━ 100%     │
├──────────────────────────────┤
│  페이지 범위 (선택):           │
│  [1] ~ [15] 페이지            │
│                              │
│  [🤖 AI 카드 생성 시작]       │
├──────────────────────────────┤
│  📊 생성 결과 미리보기         │
│  ┌────────────────────────┐  │
│  │ ✅ abundant - 풍부한    │  │
│  │ ✅ diligent - 부지런한  │  │
│  │ ✏️ ambiguous - 모호한   │  │  ← 편집 가능
│  │ ❌ (삭제)               │  │
│  │ ... 총 45개 카드         │  │
│  └────────────────────────┘  │
│                              │
│  [전체 선택] [선택 저장]       │
└──────────────────────────────┘
```

**컴포넌트:**
- `PdfUploader` - 드래그&드롭 + 파일 선택
- `PdfPageRange` - 페이지 범위 선택
- `PdfCardPreview` - AI 생성 결과 미리보기
- `PdfCardPreviewItem` - 개별 카드 편집/삭제

### 5. 영어단어 학습 모드

```
┌──────────────────────────────┐
│  ← 수능 필수 영단어            │
│  Day 5 · 12/30               │
│  ━━━━━━━━━━━━━━━━━ 40%       │
├──────────────────────────────┤
│                              │
│       abundant               │
│    /əˈbʌndənt/  🔊           │
│                              │
│  ──── 탭하여 뜻 보기 ────     │
│                              │
│  [펼치면 아래 내용 표시]       │
│                              │
│   adj. 풍부한, 많은            │
│                              │
│   💡 "아빠 던져 → 풍부하게"    │
│                              │
│   📝 Water is abundant in    │
│   this region.               │
│   (이 지역은 물이 풍부하다)    │
│                              │
│   🌱 ab-(강조) + und-(파도)   │
│     + -ant = 넘쳐나는         │
│                              │
│   ↔ plentiful, ample         │
│   ↔ scarce, rare             │
│                              │
├──────────────────────────────┤
│ [모름😰] [어려움😐] [좋음😊] [완벽🎉] │
└──────────────────────────────┘
```

**컴포넌트:**
- `VocabFlashcard` - 영어단어 전용 카드 (탭하여 뒤집기)
  - `VocabFront` - 앞면 (단어 + 발음기호 + TTS)
  - `VocabBack` - 뒷면 (뜻 + 품사 + 니모닉 + 예문 + 어원 + 관련어)
- `StudyProgressBar` - Day 진도 바
- `QualityButtons` - SM-2 평가 버튼 4개
- `TtsButton` - TTS 재생 버튼

### 6. 일반과목 학습 모드

```
┌──────────────────────────────┐
│  ← 한국사 근현대사             │
│  Day 3 · 6/15                │
│  ━━━━━━━━━━━━━━━━ 40%        │
├──────────────────────────────┤
│                              │
│  ┌────────────────────────┐  │
│  │                        │  │
│  │  3·1 운동이 일어난      │  │
│  │  직접적인 계기는?       │  │
│  │                        │  │
│  │   [탭하여 답 보기]      │  │
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│  [뒤집으면]                    │
│                              │
│  ┌────────────────────────┐  │
│  │  2·8 독립선언서         │  │
│  │  (도쿄 유학생들이       │  │
│  │   발표한 독립선언)      │  │
│  └────────────────────────┘  │
│                              │
├──────────────────────────────┤
│ [모름😰] [어려움😐] [좋음😊] [완벽🎉] │
└──────────────────────────────┘
```

**컴포넌트:**
- `Flashcard` - 일반 플래시카드 (앞면/뒷면 뒤집기)
- `StudyProgressBar` - 공통 진도 바
- `QualityButtons` - SM-2 평가 버튼

### 7. 퀴즈 모드

```
┌──────────────────────────────┐
│  ← 퀴즈                      │
│  문제 3/10  ⏱️ 02:34         │
│  ━━━━━━━━━━━━━━━━ 30%        │
├──────────────────────────────┤
│                              │
│  Q. "abundant"의 뜻은?       │
│                              │
│  ┌────────────────────────┐  │
│  │ ① 부족한                │  │
│  ├────────────────────────┤  │
│  │ ② 풍부한       ← 선택  │  │ ← 하이라이트
│  ├────────────────────────┤  │
│  │ ③ 모호한                │  │
│  ├────────────────────────┤  │
│  │ ④ 부지런한              │  │
│  └────────────────────────┘  │
│                              │
│          [다음 →]             │
├──────────────────────────────┤
│  ✅ 정답! 풍부한              │
│  📝 Water is abundant...     │
│            [해설 보기]        │
└──────────────────────────────┘
```

**컴포넌트:**
- `QuizHeader` - 진도 + 타이머
- `QuizQuestion` - 문제 표시
- `QuizOptions` - 객관식 보기 (4지선다)
- `QuizFillBlank` - 빈칸 채우기 입력
- `QuizTyping` - 한→영 타이핑 입력
- `QuizResult` - 정답/오답 피드백
- `QuizSummary` - 퀴즈 결과 요약 (점수, 오답 목록)

### 8. 설정 > AI 설정

```
┌──────────────────────────────┐
│  ← AI 설정                    │
├──────────────────────────────┤
│  AI 프로바이더                 │
│  ┌──────┐┌──────┐┌──────┐   │
│  │Gemini││OpenAI││Claude│   │
│  │  ✅  ││      ││      │   │
│  └──────┘└──────┘└──────┘   │
├──────────────────────────────┤
│  API 키                       │
│  [sk-xxxxx...xxxxx        ]  │
│  🔒 암호화되어 안전하게 저장   │
│                              │
│  [연결 테스트]  ✅ 연결 성공   │
├──────────────────────────────┤
│  AI 기능 안내                  │
│  · 카드 자동 생성              │
│  · 퀴즈 문제 생성              │
│  · 어원 분석 & 니모닉          │
│  · 오답 분석                   │
│  · AI 심층 질문                │
│                              │
│         [저장]                │
└──────────────────────────────┘
```

---

## Server/Client Component 경계 (Vercel Best Practice)

> `server-serialization`, `server-parallel-fetching` 규칙 적용.
> 데이터 페칭은 Server Component에서, 인터랙션은 Client Component에서.

### Server Components (기본값 - 'use client' 없음)
```
페이지 레벨:
- (main)/page.tsx            대시보드 (Suspense로 섹션별 스트리밍)
- decks/page.tsx             덱 목록 (서버에서 데이터 조회)
- decks/[id]/page.tsx        덱 상세 (병렬 페칭: deck + cards + plan)
- stats/page.tsx             통계 (서버에서 집계 데이터 조회)
- share/[shareId]/page.tsx   공유 덱 (React.cache()로 중복 방지)

레이아웃:
- (main)/layout.tsx          메인 레이아웃 (BottomNav는 Client)
- (auth)/layout.tsx          인증 레이아웃
```

### Client Components ('use client' 선언)
```
인터랙션 필수 페이지:
- decks/[id]/study/page.tsx     학습 모드 (카드 넘기기, 스와이프)
- decks/[id]/quiz/page.tsx      퀴즈 (선택, 타이머, 입력)
- decks/[id]/ai-chat/page.tsx   AI 채팅 (실시간 입력/스트리밍)
- decks/[id]/upload-pdf/page.tsx  PDF 업로드 (드래그&드롭, 파일 선택)

인터랙션 컴포넌트:
- BottomNav              (active 상태, 라우트 감지)
- QualityButtons         (클릭 → SM-2 평가)
- TtsButton              (Web Speech API 호출)
- VocabFlashcard         (탭하여 뒤집기 애니메이션)
- Flashcard              (스와이프 제스처)
- PdfUploader            (드래그&드롭)
- DeckForm, StudyPlanForm (폼 입력)
- Quiz* 컴포넌트들        (선택, 타이머, 입력)
- BadgeUnlockModal       (애니메이션)
- XpToast                (알림)
```

### 대시보드 Suspense 스트리밍 패턴

```tsx
// [Vercel Best Practice: async-suspense-boundaries]
// 각 섹션이 독립적으로 데이터 페칭 → 병렬 스트리밍

// (main)/page.tsx (Server Component)
export default function Dashboard() {
  return (
    <div className="space-y-4 p-4">
      <Suspense fallback={<Skeleton className="h-16" />}>
        <LevelProgressBar />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-12" />}>
        <StreakBadge />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-32" />}>
        <DailyStudyCard />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-20" />}>
        <ReviewCard />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-24" />}>
        <DailyMissions />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-20" />}>
        <WeeklyHeatmap />
      </Suspense>
    </div>
  )
}
```

### 덱 상세 병렬 페칭 패턴

```tsx
// [Vercel Best Practice: async-parallel]
// decks/[id]/page.tsx (Server Component)

export default async function DeckDetail({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const deckId = params.id

  // 3개 쿼리 병렬 실행 (워터폴 방지)
  const [deckRes, studyPlanRes] = await Promise.all([
    supabase.from('decks').select('*').eq('id', deckId).single(),
    supabase.from('study_plans').select('*, daily_progress(*)')
      .eq('deck_id', deckId).maybeSingle(),
  ])

  const deck = deckRes.data!
  // 카드는 deck_type에 따라 테이블 분기
  const cardsRes = await supabase
    .from(deck.deck_type === 'english_vocab' ? 'vocab_cards' : 'cards')
    .select('id, position, ...')  // 목록용 최소 필드만
    .eq('deck_id', deckId).order('position')

  return <DeckDetailView deck={deck} cards={cardsRes.data} plan={studyPlanRes.data} />
}
```

### Dynamic Import 대상 (번들 최적화)

```tsx
// [Vercel Best Practice: bundle-dynamic-imports]
// 초기 로딩에 불필요한 무거운 컴포넌트

import dynamic from 'next/dynamic'

const QuizMode = dynamic(() => import('@/components/quiz/quiz-mode'))
const AIChatMode = dynamic(() => import('@/components/ai/ai-chat'))
const StatsCharts = dynamic(() => import('@/components/stats/charts'), { ssr: false })
const PdfUploader = dynamic(() => import('@/components/pdf/pdf-uploader'))
const BadgeUnlockModal = dynamic(() => import('@/components/gamification/badge-modal'))
```

### next.config.js 필수 설정

```javascript
// [Vercel Best Practice: bundle-barrel-imports]
module.exports = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons']
  }
}
```

---

## 공통 컴포넌트

| 컴포넌트 | 설명 | 출처 |
|---------|------|------|
| Button, Input, Card, Dialog, Select, Tabs, Badge, Progress, Tooltip, Sheet, Skeleton, Toast | 기본 UI | shadcn/ui |
| BottomNav | 하단 내비게이션 | 커스텀 |
| ProtectedRoute | 인증 필요 래퍼 | 커스텀 |
| LoadingSpinner | 로딩 상태 | 커스텀 |
| EmptyState | 빈 상태 안내 | 커스텀 |
| ConfirmDialog | 삭제 확인 등 | 커스텀 |
| TtsButton | TTS 재생 버튼 | 커스텀 |
| XpToast | XP 획득 토스트 알림 | 커스텀 |
| BadgeUnlockModal | 뱃지 획득 모달 | 커스텀 |

---

## 상태 관리 (Zustand Stores)

### auth-store.ts
```typescript
interface AuthStore {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  initialize(): Promise<void>
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string, displayName: string): Promise<void>
  signOut(): Promise<void>
  updateProfile(data: Partial<Profile>): Promise<void>
}
```

### study-store.ts
```typescript
interface StudyStore {
  currentDeck: Deck | null
  currentCards: (Card | VocabCard)[]
  currentIndex: number
  studyMode: 'flashcard' | 'quiz' | 'listening'
  dailyProgress: DailyProgress | null

  startStudy(deckId: string): Promise<void>
  nextCard(): void
  prevCard(): void
  rateCard(quality: number): Promise<void>  // SM-2
  finishStudy(): Promise<void>
}
```

---

## 핵심 Hooks

| Hook | 역할 |
|------|------|
| `useAuth()` | 인증 상태, 로그인/회원가입/로그아웃 |
| `useDecks()` | 덱 목록 CRUD (TanStack Query) |
| `useCards(deckId)` | 일반 카드 CRUD |
| `useVocabCards(deckId)` | 영어단어 카드 CRUD |
| `useStudy(deckId)` | 학습 세션 (SM-2, 진도) |
| `useStudyPlan(deckId)` | 학습 계획 관리 |
| `usePdfUpload()` | PDF 업로드 + 파싱 |
| `useTts()` | Web Speech API TTS |
| `useAI()` | AI API 호출 (카드생성, 퀴즈, 채팅) |
| `useGameification()` | XP, 레벨, 뱃지, 미션 |
| `useReviewCards()` | 오늘 복습할 카드 목록 |
