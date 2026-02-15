# vocab-card-redesign Design

> **Feature**: 영어단어 카드 구조 리디자인
> **Level**: Dynamic
> **Plan 참조**: `docs/01-plan/features/vocab-card-redesign.plan.md`
> **상태**: Design

---

## 1. DB 마이그레이션

### 1.1 마이그레이션 파일

**파일**: `supabase/migrations/002_vocab_redesign.sql`

```sql
-- ================================================
-- 002: vocab_cards 리디자인 - 복수 뜻 구조
-- ================================================

-- Step 1: 새 컬럼 추가
ALTER TABLE vocab_cards
  ADD COLUMN IF NOT EXISTS meanings JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS derivatives JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS tips TEXT;

-- Step 2: 기존 데이터 → meanings JSONB 마이그레이션
UPDATE vocab_cards
SET meanings = jsonb_build_array(
  jsonb_build_object(
    'pos', COALESCE(part_of_speech, ''),
    'meaning', meaning,
    'synonyms', COALESCE(
      (SELECT jsonb_agg(s) FROM unnest(synonyms) AS s),
      '[]'::jsonb
    )
  )
)
WHERE meanings = '[]'::jsonb OR meanings IS NULL;

-- Step 3: antonyms TEXT[] → JSONB 변환
-- 3a. 임시 컬럼 생성
ALTER TABLE vocab_cards ADD COLUMN IF NOT EXISTS antonyms_new JSONB DEFAULT '[]';

-- 3b. 기존 antonyms TEXT[] → JSONB 마이그레이션 (word만, meaning 없음)
UPDATE vocab_cards
SET antonyms_new = COALESCE(
  (SELECT jsonb_agg(jsonb_build_object('word', a, 'meaning', ''))
   FROM unnest(antonyms) AS a),
  '[]'::jsonb
)
WHERE array_length(antonyms, 1) > 0;

-- 3c. 기존 antonyms 삭제, 신규로 교체
ALTER TABLE vocab_cards DROP COLUMN antonyms;
ALTER TABLE vocab_cards RENAME COLUMN antonyms_new TO antonyms;

-- Step 4: 레거시 컬럼 삭제
ALTER TABLE vocab_cards DROP COLUMN IF EXISTS meaning_sub;
ALTER TABLE vocab_cards DROP COLUMN IF EXISTS part_of_speech;
ALTER TABLE vocab_cards DROP COLUMN IF EXISTS synonyms;

-- Step 5: meanings JSONB GIN 인덱스 (검색 성능)
CREATE INDEX IF NOT EXISTS idx_vocab_cards_meanings
  ON vocab_cards USING GIN(meanings);
```

### 1.2 JSONB 구조 스펙

#### meanings

```jsonc
[
  {
    "pos": "v",                              // 품사 (v, n, adj, adv, prep 등)
    "meaning": "여기다, 간주하다",             // 한국어 뜻
    "synonyms": ["consider", "think of", "see"]  // 영어 동의어
  },
  {
    "pos": "n",
    "meaning": "평가, 존경, 관심",
    "synonyms": ["appreciation", "respect"]
  }
]
```

#### antonyms (JSONB)

```jsonc
[
  { "word": "disregard", "meaning": "무시하다" }
]
```

#### derivatives (JSONB)

```jsonc
[
  { "word": "regardless", "meaning": "상관없이" },
  { "word": "regarding", "meaning": "~에 관하여" }
]
```

---

## 2. TypeScript 타입 정의

**파일**: `src/types/database.ts`

### 2.1 신규 인터페이스

```typescript
/** 뜻 항목 (meanings JSONB 배열 요소) */
export interface VocabMeaning {
  pos: string;        // 품사 (v, n, adj, adv 등)
  meaning: string;    // 한국어 뜻
  synonyms: string[]; // 영어 동의어
}

/** 파생어/반의어 항목 (word + meaning) */
export interface VocabRelated {
  word: string;       // 영어 단어
  meaning: string;    // 한국어 뜻
}
```

### 2.2 VocabCard 인터페이스 변경

```typescript
export interface VocabCard {
  id: string;
  deck_id: string;
  word: string;
  meaning: string;              // 대표 뜻 유지 (첫 번째 meaning.meaning)
  // meaning_sub 삭제
  phonetic: string | null;
  // part_of_speech 삭제 (→ meanings[].pos)
  example_sentence: string | null;
  example_translation: string | null;
  // synonyms 삭제 (→ meanings[].synonyms)
  meanings: VocabMeaning[];     // 신규: 품사별 복수 뜻
  antonyms: VocabRelated[];     // 변경: TEXT[] → VocabRelated[]
  derivatives: VocabRelated[];  // 신규: 파생어
  root: string | null;
  prefix: string | null;
  suffix: string | null;
  etymology_note: string | null;
  mnemonic: string | null;
  mnemonic_user: string | null;
  tips: string | null;          // 신규: 시험 Tips
  difficulty_level: number;
  tags: string[];
  position: number;
  created_at: string;
  updated_at: string;
}
```

### 2.3 삭제 필드 정리

| 삭제 필드 | 대체 |
|-----------|------|
| `meaning_sub` | `meanings[1+].meaning` |
| `part_of_speech` | `meanings[].pos` |
| `synonyms: string[]` | `meanings[].synonyms` |
| `antonyms: string[]` | `antonyms: VocabRelated[]` |

---

## 3. 컴포넌트 설계

### 3.1 VocabCardForm 리디자인

**파일**: `src/components/card/vocab-card-form.tsx`

#### 데이터 인터페이스

```typescript
interface VocabCardFormData {
  word: string;
  meaning: string;           // 자동: meanings[0].meaning
  meanings: VocabMeaning[];  // 동적 배열
  phonetic?: string;
  example_sentence?: string;
  example_translation?: string;
  derivatives?: VocabRelated[];
  antonyms?: VocabRelated[];
  root?: string;
  prefix?: string;
  suffix?: string;
  etymology_note?: string;
  mnemonic?: string;
  tips?: string;
  tags?: string[];
}
```

#### 상태 관리

```typescript
// 기본 필드
const [word, setWord] = useState("");
const [phonetic, setPhonetic] = useState("");

// 동적 뜻 배열 (최소 1개)
const [meanings, setMeanings] = useState<VocabMeaning[]>([
  { pos: "", meaning: "", synonyms: [] }
]);

// 파생어/반의어 (쉼표구분 텍스트 입력)
const [derivativesInput, setDerivativesInput] = useState("");  // "word:뜻, word:뜻"
const [antonymsInput, setAntonymsInput] = useState("");        // "word:뜻, word:뜻"

// 기타 필드
const [exampleSentence, setExampleSentence] = useState("");
const [exampleTranslation, setExampleTranslation] = useState("");
const [root, setRoot] = useState("");
const [prefix, setPrefix] = useState("");
const [suffix, setSuffix] = useState("");
const [etymologyNote, setEtymologyNote] = useState("");
const [mnemonic, setMnemonic] = useState("");
const [tips, setTips] = useState("");
const [tagsInput, setTagsInput] = useState("");
```

#### 뜻 배열 조작 함수

```typescript
function addMeaning() {
  setMeanings([...meanings, { pos: "", meaning: "", synonyms: [] }]);
}

function removeMeaning(index: number) {
  if (meanings.length <= 1) return; // 최소 1개
  setMeanings(meanings.filter((_, i) => i !== index));
}

function updateMeaning(index: number, field: keyof VocabMeaning, value: string | string[]) {
  setMeanings(meanings.map((m, i) =>
    i === index ? { ...m, [field]: value } : m
  ));
}
```

#### 파생어/반의어 파싱 함수

```typescript
/** "word:뜻, word:뜻" → VocabRelated[] */
function parseRelated(input: string): VocabRelated[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [word, meaning] = s.split(":").map((p) => p.trim());
      return { word: word || s, meaning: meaning || "" };
    });
}
```

#### 제출 로직

```typescript
function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  onSubmit({
    word,
    meaning: meanings[0]?.meaning || "",  // 대표 뜻 = 첫 번째
    meanings,
    phonetic: phonetic || undefined,
    example_sentence: exampleSentence || undefined,
    example_translation: exampleTranslation || undefined,
    derivatives: parseRelated(derivativesInput),
    antonyms: parseRelated(antonymsInput),
    root: root || undefined,
    prefix: prefix || undefined,
    suffix: suffix || undefined,
    etymology_note: etymologyNote || undefined,
    mnemonic: mnemonic || undefined,
    tips: tips || undefined,
    tags: tagsInput.split(",").map(t => t.trim()).filter(Boolean),
  });
  // 폼 리셋 (initialData 없을 때)
}
```

#### 폼 UI 구조

```
┌─────────────────────────────────────────┐
│ 영단어 *              발음기호           │
│ [word]               [phonetic]         │
│                                         │
│ ── 뜻 #1 ──────────────────────────     │
│ 뜻 *        품사        동의어           │
│ [meaning]   [pos]      [syn,syn]        │
│                        [+ 뜻 추가]      │
│ ── 뜻 #2 ──────────────────────────     │
│ 뜻          품사        동의어           │
│ [meaning]   [pos]      [syn,syn]        │
│                        [- 삭제]         │
│                                         │
│ 파생어 (word:뜻, word:뜻)               │
│ [derivativesInput]                      │
│                                         │
│ 반의어 (word:뜻, word:뜻)               │
│ [antonymsInput]                         │
│                                         │
│ 예문                                    │
│ [exampleSentence]                       │
│ 예문 해석                               │
│ [exampleTranslation]                    │
│                                         │
│ 접두사       어근        접미사           │
│ [prefix]    [root]     [suffix]         │
│                                         │
│ 어원 설명                               │
│ [etymologyNote]                         │
│                                         │
│ 연상법 (암기 힌트)                       │
│ [mnemonic]                              │
│                                         │
│ Tips (시험 패턴)                         │
│ [tips]                                  │
│                                         │
│ 태그 (쉼표 구분)                         │
│ [tagsInput]                             │
│                                         │
│          [단어 추가]                     │
└─────────────────────────────────────────┘
```

#### 뜻 행 렌더링 (핵심 UI)

```tsx
{meanings.map((m, i) => (
  <div key={i} className="space-y-2 rounded-lg border p-3">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-muted-foreground">뜻 #{i + 1}</span>
      {i > 0 && (
        <Button type="button" variant="ghost" size="sm" onClick={() => removeMeaning(i)}>
          삭제
        </Button>
      )}
    </div>
    <div className="grid grid-cols-[1fr_80px] gap-2">
      <div className="space-y-1">
        <Label>뜻 {i === 0 && "*"}</Label>
        <Input
          placeholder="여기다, 간주하다"
          value={m.meaning}
          onChange={(e) => updateMeaning(i, "meaning", e.target.value)}
          required={i === 0}
        />
      </div>
      <div className="space-y-1">
        <Label>품사</Label>
        <Input
          placeholder="v"
          value={m.pos}
          onChange={(e) => updateMeaning(i, "pos", e.target.value)}
        />
      </div>
    </div>
    <div className="space-y-1">
      <Label>동의어 (쉼표 구분)</Label>
      <Input
        placeholder="consider, think of, see"
        value={m.synonyms.join(", ")}
        onChange={(e) => updateMeaning(i, "synonyms",
          e.target.value.split(",").map(s => s.trim()).filter(Boolean)
        )}
      />
    </div>
  </div>
))}
<Button type="button" variant="outline" size="sm" onClick={addMeaning}>
  + 뜻 추가
</Button>
```

### 3.2 VocabCardView 리디자인

**파일**: `src/components/study/vocab-card-view.tsx`

#### 앞면 (isFlipped = false)

```
┌─────────────────────────┐
│       regard            │  ← word (3xl bold)
│     /rigɑ́ːrd/ 🔊       │  ← phonetic + TTS
└─────────────────────────┘
```

변경사항: `part_of_speech` 배지 제거 (앞면에서 품사 안보여줌)

#### 뒷면 (isFlipped = true)

표시 순서 (위→아래):

```
┌─────────────────────────────────────┐
│ regard  /rigɑ́ːrd/                   │ 1. 영단어 + 발음기호
│                                     │
│ v  여기다, 간주하다                   │ 2. 뜻 목록 (품사별)
│    = consider, think of, see        │    동의어
│ n  평가, 존경, 관심                   │
│    = appreciation, respect          │
│                                     │
│ 파생어: regardless (상관없이)         │ 3. 파생어
│         regarding (~에 관하여)        │
│                                     │
│ 반의어: disregard (무시하다)          │ 4. 반의어
│                                     │
│ "She was worried that her fans..."  │ 5. 예문 + 해석
│  그녀는 그녀의 팬들이 여전히...       │
│                                     │
│ 연상법: 리가드 → 리 가드 → ...       │ 6. 연상법
│                                     │
│ Tips: with regard to ~에 관해서      │ 7. Tips
│       regard A as B                 │
└─────────────────────────────────────┘
```

#### 뒷면 렌더링 코드

```tsx
// 2. 뜻 목록
{card.meanings && card.meanings.length > 0 && (
  <div className="space-y-2">
    {card.meanings.map((m, i) => (
      <div key={i}>
        <div className="flex items-baseline gap-2">
          {m.pos && (
            <span className="inline-block rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
              {m.pos}
            </span>
          )}
          <span className="font-medium">{m.meaning}</span>
        </div>
        {m.synonyms.length > 0 && (
          <p className="ml-6 text-xs text-muted-foreground">
            = {m.synonyms.join(", ")}
          </p>
        )}
      </div>
    ))}
  </div>
)}

// 3. 파생어
{card.derivatives && card.derivatives.length > 0 && (
  <div className="text-sm">
    <span className="font-medium">파생어: </span>
    {card.derivatives.map((d, i) => (
      <span key={i}>
        {i > 0 && ", "}
        {d.word}
        {d.meaning && <span className="text-muted-foreground"> ({d.meaning})</span>}
      </span>
    ))}
  </div>
)}

// 4. 반의어
{card.antonyms && card.antonyms.length > 0 && (
  <div className="text-sm">
    <span className="font-medium">반의어: </span>
    {card.antonyms.map((a, i) => (
      <span key={i}>
        {i > 0 && ", "}
        {a.word}
        {a.meaning && <span className="text-muted-foreground"> ({a.meaning})</span>}
      </span>
    ))}
  </div>
)}

// 7. Tips
{card.tips && (
  <div className="rounded-lg bg-amber-50 p-2 text-sm dark:bg-amber-950/30">
    <span className="font-medium">Tips: </span>
    {card.tips}
  </div>
)}
```

---

## 4. handleVocabSubmit 수정

**파일**: `src/app/(main)/decks/[id]/cards/new/page.tsx`

### 4.1 파라미터 타입 변경

```typescript
async function handleVocabSubmit(card: {
  word: string;
  meaning: string;
  meanings: VocabMeaning[];
  phonetic?: string;
  example_sentence?: string;
  example_translation?: string;
  derivatives?: VocabRelated[];
  antonyms?: VocabRelated[];
  root?: string;
  prefix?: string;
  suffix?: string;
  etymology_note?: string;
  mnemonic?: string;
  tips?: string;
  tags?: string[];
}) {
```

### 4.2 supabaseMutate 호출 변경

```typescript
const { error } = await supabaseMutate("vocab_cards", "POST", {
  deck_id: deckId,
  word: card.word,
  meaning: card.meaning,
  meanings: card.meanings,                    // JSONB
  phonetic: card.phonetic || null,
  example_sentence: card.example_sentence || null,
  example_translation: card.example_translation || null,
  derivatives: card.derivatives || [],        // JSONB
  antonyms: card.antonyms || [],              // JSONB (VocabRelated[])
  root: card.root || null,
  prefix: card.prefix || null,
  suffix: card.suffix || null,
  etymology_note: card.etymology_note || null,
  mnemonic: card.mnemonic || null,
  tips: card.tips || null,                    // 신규
  tags: card.tags || [],
  position: cardCount + 1,
});
```

### 4.3 삭제 필드

- `meaning_sub` (제거)
- `part_of_speech` (제거)
- `synonyms` (제거)

---

## 5. 하위 호환성

### 5.1 meaning 컬럼 유지

- `meaning` TEXT 컬럼은 삭제하지 않음
- 항상 `meanings[0].meaning` 값으로 동기화
- 기존 `study_records`, SM-2 알고리즘에서 `meaning` 직접 참조하므로 유지 필수

### 5.2 마이그레이션 안전성

- 기존 단어 카드는 meanings JSONB에 1개 항목으로 자동 변환
- 기존 antonyms TEXT[] → VocabRelated[] (meaning은 빈 문자열)
- 임시 컬럼(`antonyms_new`)을 경유하여 안전하게 전환

### 5.3 RLS 정책

- 변경 없음: 기존 `vocab_cards` RLS 정책은 컬럼 변경에 영향받지 않음

---

## 6. 변경 파일 요약

| # | 파일 | 변경 | 크기 |
|---|------|------|------|
| 1 | `supabase/migrations/002_vocab_redesign.sql` | 신규 | 중 |
| 2 | `src/types/database.ts` | 수정: VocabMeaning, VocabRelated 추가, VocabCard 변경 | 소 |
| 3 | `src/components/card/vocab-card-form.tsx` | 전체 리디자인: 동적 뜻 배열, 파생어/반의어 word:뜻 포맷 | 대 |
| 4 | `src/components/study/vocab-card-view.tsx` | 수정: 뒷면 표시 순서, meanings/derivatives/antonyms/tips | 중 |
| 5 | `src/app/(main)/decks/[id]/cards/new/page.tsx` | 수정: handleVocabSubmit 파라미터, import VocabMeaning/VocabRelated | 소 |

### 변경하지 않는 것

- `cards` 테이블 (일반 카드)
- `study_records` 테이블 (SM-2)
- `src/components/card/general-card-form.tsx`
- `src/components/study/general-card-view.tsx`
- 인증, 덱 CRUD, 학습 계획, 대시보드

---

## 7. 구현 순서

| # | 단계 | 의존성 | 예상 |
|---|------|--------|------|
| 1 | `002_vocab_redesign.sql` 마이그레이션 작성 | 없음 | 소 |
| 2 | `database.ts` 타입 수정 (VocabMeaning, VocabRelated, VocabCard) | 1 | 소 |
| 3 | `vocab-card-form.tsx` 전체 리디자인 | 2 | 대 |
| 4 | `cards/new/page.tsx` handleVocabSubmit 수정 | 2, 3 | 소 |
| 5 | `vocab-card-view.tsx` 뒷면 표시 리디자인 | 2 | 중 |
| 6 | Supabase에 마이그레이션 적용 + 테스트 | 1~5 | 소 |

---

## 8. 리스크 및 대응

| 리스크 | 대응 |
|--------|------|
| 기존 데이터 손실 | 마이그레이션에서 기존 데이터를 JSONB로 변환 후 레거시 컬럼 삭제 |
| antonyms 타입 변경 중 다운타임 | 임시 컬럼 경유 방식으로 무중단 전환 |
| JSONB 검색 성능 | GIN 인덱스 추가 |
| PDF 파싱 호환 | Phase 2에서 이 구조에 맞게 AI 프롬프트 설계 (현 단계에서는 미구현) |
