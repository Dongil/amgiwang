# vocab-card-redesign Plan

> **Feature**: 영어단어 카드 구조 리디자인
> **Level**: Dynamic
> **Priority**: P0 (Phase 2 전 필수)
> **상태**: Plan

---

## 1. 배경 및 목적

현재 `vocab_cards` 테이블은 단어당 하나의 뜻(`meaning`)과 하나의 품사(`part_of_speech`)만 저장한다.
실제 수능 영어단어장(PDF 참조)에서는 하나의 단어에 **여러 품사별 뜻**이 있고, 각 뜻마다 **동의어**가 매핑된다.

### 참조 PDF 구성 (단어pdf샘플.png)

```
regard [rigɑ́ːrd]
  v  consider, think of, see    여기다, 간주하다
  n  appreciation, respect       평가, 존경, 관심

  예문: She was worried that her fans would still regard her...
  파생어: regardless (상관없이), regarding (~에 관하여)
  반의어: disregard (무시하다)
  Tips: with regard to ~에 관해서 / regard A as B
```

### 현재 구조의 한계

| 항목 | 현재 | 필요 |
|------|------|------|
| 뜻 | `meaning` TEXT (1개) | 품사별 복수 뜻 |
| 품사 | `part_of_speech` TEXT (1개) | 뜻마다 개별 품사 |
| 동의어 | `synonyms` TEXT[] (글로벌) | 뜻마다 개별 동의어 |
| 반의어 | `antonyms` TEXT[] (단어만) | `{word, meaning}` 구조 |
| 파생어 | 없음 | `{word, meaning}` 구조 |
| Tips | 없음 | 시험 출제 패턴 |

---

## 2. 요구사항

### 2.1 DB 스키마 변경

#### vocab_cards 테이블 컬럼 변경

| 컬럼 | 변경 | AS-IS | TO-BE |
|------|------|-------|-------|
| `meaning` | 유지 (대표 뜻) | TEXT | TEXT (첫 번째 뜻의 한국어) |
| `meaning_sub` | 삭제 | TEXT | - (meanings JSONB로 대체) |
| `part_of_speech` | 삭제 | TEXT | - (meanings JSONB로 대체) |
| `synonyms` | 삭제 | TEXT[] | - (meanings JSONB로 대체) |
| `meanings` | **신규** | - | JSONB (복수 뜻 배열) |
| `antonyms` | 타입변경 | TEXT[] | JSONB (word+meaning 배열) |
| `derivatives` | **신규** | - | JSONB (파생어 배열) |
| `tips` | **신규** | - | TEXT (시험 Tips) |

#### meanings JSONB 구조

```jsonc
// meanings: 품사별 뜻 + 동의어
[
  {
    "pos": "v",           // 품사
    "meaning": "여기다, 간주하다",  // 한국어 뜻
    "synonyms": ["consider", "think of", "see"]  // 영어 동의어
  },
  {
    "pos": "n",
    "meaning": "평가, 존경, 관심",
    "synonyms": ["appreciation", "respect", "attention"]
  }
]
```

#### antonyms JSONB 구조 (기존 TEXT[] → JSONB)

```jsonc
// antonyms: 반의어 + 한국어 뜻
[
  { "word": "disregard", "meaning": "무시하다" }
]
```

#### derivatives JSONB 구조 (신규)

```jsonc
// derivatives: 파생어 + 한국어 뜻
[
  { "word": "regardless", "meaning": "상관없이" },
  { "word": "regarding", "meaning": "~에 관하여" }
]
```

### 2.2 마이그레이션 전략

1. 새 컬럼 추가 (meanings, derivatives, tips, antonyms를 JSONB로)
2. 기존 데이터 마이그레이션 (meaning + part_of_speech + synonyms → meanings JSONB)
3. 기존 antonyms TEXT[] → JSONB 변환
4. 레거시 컬럼 삭제 (meaning_sub, part_of_speech, synonyms)
5. `meaning` 컬럼은 유지 (대표 뜻, 검색/정렬용)

### 2.3 카드 추가 폼 (단어추가.png 기준)

```
┌─────────────────────────────────────────┐
│ ← 단어 추가                              │
│    수능 필수 단어장                         │
│                                          │
│ 영단어 *          발음기호                  │
│ [regard    ]     [rigɑ́ːrd   ]            │
│                                          │
│ ── 뜻 #1 ──                              │
│ 뜻 *             품사      동의어           │
│ [여기다,간주하다]  [v  ]   [consider,think of] │
│                         [+ 뜻 추가]       │
│ ── 뜻 #2 ──                              │
│ 뜻              품사      동의어            │
│ [평가,존경,관심]  [n  ]   [appreciation,resp] │
│                         [- 삭제]          │
│                                          │
│ 파생어 (쉼표 구분 word:뜻)                  │
│ [regardless:상관없이, regarding:~에관하여]    │
│                                          │
│ 반의어 (쉼표 구분 word:뜻)                  │
│ [disregard:무시하다                    ]    │
│                                          │
│ 예문                                      │
│ [She was worried that her fans...]        │
│                                          │
│ 예문 해석                                  │
│ [그녀는 그녀의 팬들이 여전히...]              │
│                                          │
│ 접두사        어근         접미사            │
│ [re-    ]   [gard   ]    [      ]         │
│                                          │
│ 어원 설명                                  │
│ [라틴어 regarder...]                       │
│                                          │
│ 연상법 (암기 힌트)                          │
│ [리가드 → 리 가드 → ...]                    │
│                                          │
│ Tips (시험 패턴)                            │
│ [with regard to ~에 관해서]                 │
│                                          │
│ 태그 (쉼표 구분)                            │
│ [수능필수, Day1                       ]    │
│                                          │
│          [단어 추가]                        │
│          완료 (3장)                         │
└─────────────────────────────────────────┘
```

### 2.4 카드 표시 순서 (학습 모드)

**앞면**: 영단어 + 발음기호 + TTS

**뒷면 (위→아래)**:
1. 영단어 + 발음기호
2. 뜻 목록 (품사별, 동의어 포함)
3. 파생어
4. 반의어
5. 예문 + 해석
6. 연상법
7. Tips

### 2.5 PDF 임포트 호환

단어 PDF 구조 (단어pdf구성.png):
- 표제어 (headword)
- 유의어 (synonyms per meaning)
- 품성 (part of speech)
- 기출 예문 (example sentences)
- 파생어/반의어 (derivatives/antonyms)
- 본문 해석 (translations)
- Tips

→ Phase 2 AI 파싱 시 이 DB 구조에 맞춰 추출하도록 프롬프트 설계

---

## 3. 영향 범위

### 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `supabase/migrations/002_vocab_redesign.sql` | 신규: 스키마 마이그레이션 |
| `src/types/database.ts` | VocabCard 인터페이스 수정 |
| `src/components/card/vocab-card-form.tsx` | 복수 뜻 폼 UI 리디자인 |
| `src/components/study/vocab-card-view.tsx` | 뒷면 표시 순서 변경 |
| `src/app/(main)/decks/[id]/cards/new/page.tsx` | handleVocabSubmit 수정 |
| `src/hooks/use-cards.ts` (useUpdateCard) | 업데이트 로직 수정 |

### 변경하지 않는 것

- `cards` 테이블 (일반 카드 - 영향 없음)
- `study_records` 테이블 (SM-2 알고리즘 - 영향 없음)
- 인증, 덱 CRUD, 학습 계획 (영향 없음)

---

## 4. 타입 정의 (TO-BE)

```typescript
// 뜻 항목
interface VocabMeaning {
  pos: string;        // 품사 (v, n, adj, adv 등)
  meaning: string;    // 한국어 뜻
  synonyms: string[]; // 영어 동의어
}

// 파생어/반의어 항목
interface VocabRelated {
  word: string;       // 영어 단어
  meaning: string;    // 한국어 뜻
}

interface VocabCard {
  id: string;
  deck_id: string;
  word: string;
  meaning: string;          // 대표 뜻 (첫 번째 meaning.meaning)
  meanings: VocabMeaning[]; // 복수 뜻 (JSONB)
  phonetic: string | null;
  example_sentence: string | null;
  example_translation: string | null;
  derivatives: VocabRelated[];  // 파생어 (JSONB)
  antonyms: VocabRelated[];     // 반의어 (JSONB, word+meaning)
  root: string | null;
  prefix: string | null;
  suffix: string | null;
  etymology_note: string | null;
  mnemonic: string | null;
  mnemonic_user: string | null;
  tips: string | null;          // 시험 Tips (신규)
  difficulty_level: number;
  tags: string[];
  position: number;
  created_at: string;
  updated_at: string;
}
```

---

## 5. 구현 순서

| # | 단계 | 예상 |
|---|------|------|
| 1 | DB 마이그레이션 SQL 작성 + 적용 | 작음 |
| 2 | TypeScript 타입 정의 수정 | 작음 |
| 3 | VocabCardForm 리디자인 (복수 뜻 + 파생어 + 반의어) | 중간 |
| 4 | handleVocabSubmit 수정 (cards/new) | 작음 |
| 5 | VocabCardView 표시 순서 변경 | 작음 |
| 6 | 기존 데이터 호환성 테스트 | 작음 |

---

## 6. 리스크 및 고려사항

- **기존 데이터 마이그레이션**: 기존 단어 카드의 meaning + part_of_speech + synonyms를 meanings JSONB로 자동 변환 필요
- **JSONB 검색**: meanings 내부 검색 시 GIN 인덱스 필요할 수 있음
- **PDF 파싱**: Phase 2 AI 파싱 시 이 구조에 맞게 추출하도록 설계해야 함
- **하위 호환**: `meaning` 컬럼은 대표 뜻으로 유지하여 기존 학습 기록/SM-2와 호환 유지
