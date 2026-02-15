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

-- 3b. 기존 antonyms TEXT[] → JSONB 마이그레이션
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

-- Step 5: meanings JSONB GIN 인덱스
CREATE INDEX IF NOT EXISTS idx_vocab_cards_meanings
  ON vocab_cards USING GIN(meanings);
