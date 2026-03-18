-- ================================================
-- 006: vocab_cards Word Master 확장 필드
-- ================================================

-- Step 1: 신규 컬럼 추가
ALTER TABLE vocab_cards
  ADD COLUMN IF NOT EXISTS collocations JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS word_number INT,
  ADD COLUMN IF NOT EXISTS day_number INT,
  ADD COLUMN IF NOT EXISTS source_book TEXT;

-- Step 2: 인덱스
CREATE INDEX IF NOT EXISTS idx_vocab_cards_day_number ON vocab_cards(day_number);
CREATE INDEX IF NOT EXISTS idx_vocab_cards_source_book ON vocab_cards(source_book);
CREATE INDEX IF NOT EXISTS idx_vocab_cards_word_number ON vocab_cards(word_number);
