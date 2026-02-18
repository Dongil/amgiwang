# Plan: 덱 카드 리스트 & 학습 네비게이션

## 개요

두 가지 기능을 하나의 피처로 통합:
1. **덱 상세 페이지 카드 리스트**: 하단에 테이블 형태로 전체 카드 목록 표시 + CRUD
2. **학습 페이지 네비게이션**: 상단에 Day/페이지/단어 빠른 이동 UI

## 현재 상태 분석

### 덱 상세 페이지 (`src/app/(main)/decks/[id]/page.tsx`)
- 암기율, 액션 버튼(학습/퀴즈/카드추가/PDF), 학습계획, 카드 수만 표시
- "총 1000장의 카드" 텍스트만 있고, 개별 카드 목록 없음
- 카드 수정/삭제 기능이 개별 카드 편집 페이지 없이는 불가

### 학습 페이지 (`src/app/(main)/decks/[id]/study/page.tsx`)
- `2 / 1000` 형태의 진행률만 표시
- 카드를 순서대로만 넘길 수 있음 (nextCard/prevCard)
- Day별 필터링, 페이지 점프, 특정 단어 검색 기능 없음
- 1,743장 중 원하는 카드로 바로 이동 불가

### 기존 인프라
- `useVocabCards(deckId)` 훅: 전체 카드 fetch (position 순서)
- `useUpdateVocabCard()`, `useDeleteVocabCard()` 훅: CRUD 준비됨
- `VocabCardForm`: 카드 추가/편집 폼 컴포넌트 존재
- `study-store.ts`: `setCards`, `nextCard`, `prevCard` 있음 (하지만 인덱스 직접 지정 메서드 없음)
- 카드 tags 필드에 "Day1", "Day2" 등 Day 태그 존재 (시딩 시 추가됨)

## 기능 1: 덱 카드 리스트

### 요구사항
- 덱 상세 페이지 하단에 카드 테이블 표시
- 컬럼: No | Day | 단어 | 발음기호 | 뜻 | 유의어 | ...
- 1,743장 대응 → 페이지네이션 필요 (50장/페이지)
- Day 필터 드롭다운
- 검색 (단어 필터)
- 행 선택 → 추가/수정/삭제 기능

### 구현 계획

#### 1-1. 카드 리스트 컴포넌트 (`src/components/deck/card-list-table.tsx`)

```
┌─────────────────────────────────────────────────┐
│ [검색: ______] [Day: ▼ All] [+ 카드 추가]        │
├────┬─────┬──────────┬────────┬────────┬─────────┤
│ No │ Day │ 단어     │ 발음기호│ 뜻     │ 유의어  │
├────┼─────┼──────────┼────────┼────────┼─────────┤
│  1 │  1  │ mean     │[miːn]  │의미하다 │signify  │
│  2 │  1  │ regard   │[rɪˈɡɑː│여기다   │consider │
│ ...│     │          │        │        │         │
├────┴─────┴──────────┴────────┴────────┴─────────┤
│ [◀ 이전] 1 2 3 ... 35 [다음 ▶]  50장/페이지     │
└─────────────────────────────────────────────────┘
```

- **모바일 반응형**: 좁은 화면에서는 No/Day/단어/뜻 4컬럼만 표시
- **행 클릭 → 수정 모달**: 기존 `VocabCardForm`을 모달/시트로 재활용
- **삭제**: 행 우측 ... 메뉴 또는 스와이프로 삭제 확인
- **추가**: 상단 "+ 카드 추가" 버튼 → 모달로 `VocabCardForm` 열기

#### 1-2. 서버 사이드 페이지네이션

현재 `useVocabCards`는 전체 카드를 한번에 fetch → 1,743장은 무거움

- 새 훅 `useVocabCardsPaginated(deckId, { page, pageSize, dayFilter, search })`
- Supabase `.range()` 사용하여 서버사이드 페이지네이션
- 검색: `.ilike("word", `%${search}%`)`
- Day 필터: `.contains("tags", ["Day1"])` 또는 position 범위

```typescript
// src/hooks/use-vocab-cards-paginated.ts
export function useVocabCardsPaginated(
  deckId: string,
  options: { page: number; pageSize: number; day?: number; search?: string }
) {
  return useQuery({
    queryKey: queryKeys.vocabCards.paginated(deckId, options),
    queryFn: async () => {
      let query = supabase
        .from("vocab_cards")
        .select("id, word, phonetic, meaning, meanings, tags, position", { count: "exact" })
        .eq("deck_id", deckId)
        .order("position");

      if (options.day) query = query.contains("tags", [`Day${options.day}`]);
      if (options.search) query = query.ilike("word", `%${options.search}%`);
      query = query.range(offset, offset + pageSize - 1);

      return { cards, totalCount };
    },
  });
}
```

#### 1-3. 카드 편집 모달 (`src/components/deck/card-edit-sheet.tsx`)

- shadcn `Sheet` (모바일에서 하단에서 올라오는 패널)
- 기존 `VocabCardForm`에 `initialData` 전달하여 편집 모드
- 저장 시 `useUpdateVocabCard()` 호출
- 삭제 확인 다이얼로그 포함

#### 1-4. 덱 상세 페이지 수정

- 기존 "총 N장의 카드" 텍스트 대신 `<CardListTable>` 렌더링
- 현재 쿼리에서 `select("id, position")`만 하던 것 → 카드 리스트 컴포넌트가 자체 쿼리

## 기능 2: 학습 페이지 네비게이션

### 요구사항
- 학습 페이지 상단에 네비게이션 바 추가
- Day 선택 → 해당 Day 카드만 학습
- 페이지(카드 범위) 이동
- 특정 단어 검색/직접 이동

### 구현 계획

#### 2-1. 학습 네비게이션 컴포넌트 (`src/components/study/study-nav.tsx`)

```
┌─────────────────────────────────────────┐
│ [← ] 해커스 보카 수능 심화               │
│ [Day ▼ 1~50] [◀ ■■■■■■□□□□ ▶] 2/35    │
│ [🔍 단어 검색...]                        │
└─────────────────────────────────────────┘
```

- **Day 드롭다운**: Day 1~50 선택 → 해당 Day 카드만 필터링
  - tags에서 Day 목록 추출 (또는 study_plan의 daily_amount 기반)
  - "전체" 옵션 포함
- **미니 진행 바**: 현재 Day 내 진도
- **좌우 화살표**: 이전/다음 카드 (기존 prevCard/nextCard)
- **번호 클릭 → 직접 이동**: "2/35" 클릭 시 숫자 입력 팝업
- **검색**: 단어 입력 → 해당 카드로 점프

#### 2-2. study-store 확장

```typescript
// study-store.ts에 추가
goToIndex: (index: number) => void;  // 특정 인덱스로 직접 이동
setFilteredCards: (filter: { day?: number }) => void;  // Day 필터링
```

- `goToIndex`: 직접 인덱스 지정 가능하도록
- Day 필터: 전체 카드 중 해당 Day 태그가 있는 것만 `currentCards`에 설정
- 원본 카드 배열 보존 (`allCards`) + 필터된 카드 (`currentCards`) 분리

#### 2-3. 학습 페이지 수정

- 기존 헤더 영역을 `<StudyNav>` 컴포넌트로 교체
- Day 변경 시 `setCards(filteredCards)` 호출
- searchParams로 `?day=3` 지원 (덱 카드 리스트에서 Day 클릭 → 학습으로 이동)
- 카드 번호 직접 입력 시 `goToIndex(n-1)` 호출

## 파일 생성/수정 목록

### 신규 생성
| 파일 | 역할 |
|------|------|
| `src/components/deck/card-list-table.tsx` | 카드 테이블 리스트 (메인 컴포넌트) |
| `src/components/deck/card-edit-sheet.tsx` | 카드 편집 Sheet 모달 |
| `src/components/study/study-nav.tsx` | 학습 네비게이션 바 |
| `src/hooks/use-vocab-cards-paginated.ts` | 페이지네이션 훅 |

### 수정
| 파일 | 변경 내용 |
|------|-----------|
| `src/app/(main)/decks/[id]/page.tsx` | 하단에 `<CardListTable>` 추가 |
| `src/app/(main)/decks/[id]/study/page.tsx` | `<StudyNav>` 추가, Day 필터 로직 |
| `src/stores/study-store.ts` | `goToIndex`, `allCards`, Day 필터 기능 추가 |
| `src/lib/query-keys.ts` | `vocabCards.paginated` 키 추가 |
| `src/components/study/vocab-card-view.tsx` | button 중첩 hydration 에러 수정 |

## 구현 순서

1. **button 중첩 에러 수정** (vocab-card-view.tsx:20 - 스크린샷 콘솔 에러)
2. **query-keys 확장** (paginated 키)
3. **useVocabCardsPaginated 훅 생성**
4. **card-list-table.tsx 생성** (테이블 + 페이지네이션 + 필터)
5. **card-edit-sheet.tsx 생성** (편집/삭제 모달)
6. **덱 상세 페이지에 카드 리스트 통합**
7. **study-store 확장** (goToIndex, allCards/filteredCards)
8. **study-nav.tsx 생성** (Day 선택, 진행바, 검색, 번호 점프)
9. **학습 페이지에 네비게이션 통합**

## 기술 노트

- shadcn `Table` 사용 (이미 설치됨)
- shadcn `Sheet` 사용 (모바일 편집용)
- shadcn `Select` 사용 (Day 필터)
- 1,743장 → 서버사이드 페이지네이션 필수 (50장/페이지 = 35페이지)
- Day 태그 형식: `"Day1"`, `"Day2"`, ... `"Day50"` (시딩 시 설정됨)
- 검색은 단어(word) 필드만 대상 (UX 단순화)
