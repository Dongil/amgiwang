-- ================================================
-- 암기왕 (AmgiWang) - Initial Database Schema
-- ================================================

-- =====================
-- 1. profiles
-- =====================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  grade SMALLINT CHECK (grade BETWEEN 1 AND 3),
  daily_goal INT NOT NULL DEFAULT 30,
  xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  streak_count INT NOT NULL DEFAULT 0,
  streak_last_date DATE,
  ai_provider TEXT NOT NULL DEFAULT 'gemini' CHECK (ai_provider IN ('gemini', 'openai', 'claude')),
  ai_api_key_encrypted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 신규 유저 자동 프로필 생성
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- updated_at 자동 갱신 (공통 함수)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- =====================
-- 2. decks
-- =====================
CREATE TABLE decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deck_type TEXT NOT NULL CHECK (deck_type IN ('english_vocab', 'general')),
  title TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '기타',
  description TEXT DEFAULT '',
  color TEXT DEFAULT '#6366f1',
  card_count INT NOT NULL DEFAULT 0,
  mastered_count INT NOT NULL DEFAULT 0,
  share_id TEXT UNIQUE,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_decks_user_id ON decks(user_id);
CREATE INDEX idx_decks_share_id ON decks(share_id) WHERE share_id IS NOT NULL;

CREATE TRIGGER decks_updated_at
  BEFORE UPDATE ON decks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own decks"
  ON decks FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Shared decks are viewable"
  ON decks FOR SELECT USING (is_shared = TRUE);

-- =====================
-- 3. cards (일반과목)
-- =====================
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  front_text TEXT NOT NULL,
  back_text TEXT NOT NULL,
  front_image_url TEXT,
  back_image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cards_deck_id ON cards(deck_id);
CREATE INDEX idx_cards_tags ON cards USING GIN(tags);

CREATE TRIGGER cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own cards"
  ON cards FOR ALL
  USING (
    EXISTS (SELECT 1 FROM decks WHERE decks.id = cards.deck_id AND decks.user_id = auth.uid())
  );

CREATE POLICY "Shared deck cards are viewable"
  ON cards FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM decks WHERE decks.id = cards.deck_id AND decks.is_shared = TRUE)
  );

-- =====================
-- 4. vocab_cards (영어단어)
-- =====================
CREATE TABLE vocab_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  meaning TEXT NOT NULL,
  meaning_sub TEXT,
  phonetic TEXT,
  part_of_speech TEXT,
  example_sentence TEXT,
  example_translation TEXT,
  synonyms TEXT[] DEFAULT '{}',
  antonyms TEXT[] DEFAULT '{}',
  root TEXT,
  prefix TEXT,
  suffix TEXT,
  etymology_note TEXT,
  mnemonic TEXT,
  mnemonic_user TEXT,
  difficulty_level SMALLINT DEFAULT 3 CHECK (difficulty_level BETWEEN 1 AND 5),
  tags TEXT[] DEFAULT '{}',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vocab_cards_deck_id ON vocab_cards(deck_id);
CREATE INDEX idx_vocab_cards_word ON vocab_cards(word);
CREATE INDEX idx_vocab_cards_tags ON vocab_cards USING GIN(tags);

CREATE TRIGGER vocab_cards_updated_at
  BEFORE UPDATE ON vocab_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE vocab_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own vocab_cards"
  ON vocab_cards FOR ALL
  USING (
    EXISTS (SELECT 1 FROM decks WHERE decks.id = vocab_cards.deck_id AND decks.user_id = auth.uid())
  );

CREATE POLICY "Shared deck vocab_cards are viewable"
  ON vocab_cards FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM decks WHERE decks.id = vocab_cards.deck_id AND decks.is_shared = TRUE)
  );

-- =====================
-- 5. pdf_uploads
-- =====================
CREATE TABLE pdf_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INT NOT NULL,
  page_count INT DEFAULT 0,
  processed_pages TEXT,
  status TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'completed', 'failed')),
  extracted_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pdf_uploads_deck_id ON pdf_uploads(deck_id);

ALTER TABLE pdf_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own pdf_uploads"
  ON pdf_uploads FOR ALL USING (auth.uid() = user_id);

-- =====================
-- 6. study_plans
-- =====================
CREATE TABLE study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  total_cards INT NOT NULL,
  daily_amount INT NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  current_day INT NOT NULL DEFAULT 1,
  total_days INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(deck_id, user_id)
);

CREATE TRIGGER study_plans_updated_at
  BEFORE UPDATE ON study_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own study_plans"
  ON study_plans FOR ALL USING (auth.uid() = user_id);

-- =====================
-- 7. daily_progress
-- =====================
CREATE TABLE daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_plan_id UUID NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  target_card_ids UUID[] NOT NULL DEFAULT '{}',
  completed_card_ids UUID[] NOT NULL DEFAULT '{}',
  progress_rate REAL NOT NULL DEFAULT 0.0,
  studied_at DATE NOT NULL DEFAULT CURRENT_DATE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(study_plan_id, day_number)
);

CREATE INDEX idx_daily_progress_plan ON daily_progress(study_plan_id);
CREATE INDEX idx_daily_progress_user_date ON daily_progress(user_id, studied_at);

ALTER TABLE daily_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own daily_progress"
  ON daily_progress FOR ALL USING (auth.uid() = user_id);

-- =====================
-- 8. study_records (SM-2)
-- =====================
CREATE TABLE study_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_id UUID NOT NULL,
  card_type TEXT NOT NULL CHECK (card_type IN ('general', 'english_vocab')),
  quality SMALLINT NOT NULL CHECK (quality BETWEEN 0 AND 5),
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval INT NOT NULL DEFAULT 0,
  repetitions INT NOT NULL DEFAULT 0,
  next_review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, card_id, card_type)
);

CREATE INDEX idx_study_records_user_review ON study_records(user_id, next_review_date);
CREATE INDEX idx_study_records_card ON study_records(card_id, card_type);

ALTER TABLE study_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own study_records"
  ON study_records FOR ALL USING (auth.uid() = user_id);

-- =====================
-- 9. quiz_results
-- =====================
CREATE TABLE quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  quiz_type TEXT NOT NULL CHECK (quiz_type IN (
    'multiple_choice', 'ox', 'fill_blank', 'subjective',
    'eng_to_kor', 'kor_to_eng', 'listening', 'etymology'
  )),
  score INT NOT NULL,
  total_questions INT NOT NULL,
  time_spent_sec INT DEFAULT 0,
  answers JSONB DEFAULT '[]',
  day_number INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quiz_results_user ON quiz_results(user_id, created_at DESC);
CREATE INDEX idx_quiz_results_deck ON quiz_results(deck_id);

ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own quiz_results"
  ON quiz_results FOR ALL USING (auth.uid() = user_id);

-- =====================
-- 10. ai_conversations
-- =====================
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deck_id UUID REFERENCES decks(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '새 대화',
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id, updated_at DESC);

CREATE TRIGGER ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own ai_conversations"
  ON ai_conversations FOR ALL USING (auth.uid() = user_id);

-- =====================
-- 11. badges (시드 데이터)
-- =====================
CREATE TABLE badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  condition_type TEXT NOT NULL,
  condition_value INT NOT NULL
);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges are viewable by all"
  ON badges FOR SELECT USING (TRUE);

-- =====================
-- 12. user_badges
-- =====================
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges"
  ON user_badges FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert badges"
  ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================
-- 13. daily_missions
-- =====================
CREATE TABLE daily_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mission_type TEXT NOT NULL CHECK (mission_type IN (
    'review_cards', 'quiz_count', 'study_time', 'new_cards', 'perfect_quiz'
  )),
  target_value INT NOT NULL,
  current_value INT NOT NULL DEFAULT 0,
  xp_reward INT NOT NULL DEFAULT 10,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_daily_missions_user_date ON daily_missions(user_id, mission_date);

ALTER TABLE daily_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own missions"
  ON daily_missions FOR ALL USING (auth.uid() = user_id);

-- =====================
-- Card count sync function
-- =====================
CREATE OR REPLACE FUNCTION sync_deck_card_count()
RETURNS TRIGGER AS $$
DECLARE
  cnt INT;
  deck_row decks%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT * INTO deck_row FROM decks WHERE id = OLD.deck_id;
  ELSE
    SELECT * INTO deck_row FROM decks WHERE id = NEW.deck_id;
  END IF;

  IF deck_row.deck_type = 'general' THEN
    SELECT COUNT(*) INTO cnt FROM cards WHERE deck_id = deck_row.id;
  ELSE
    SELECT COUNT(*) INTO cnt FROM vocab_cards WHERE deck_id = deck_row.id;
  END IF;

  UPDATE decks SET card_count = cnt WHERE id = deck_row.id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER cards_count_sync
  AFTER INSERT OR DELETE ON cards
  FOR EACH ROW EXECUTE FUNCTION sync_deck_card_count();

CREATE TRIGGER vocab_cards_count_sync
  AFTER INSERT OR DELETE ON vocab_cards
  FOR EACH ROW EXECUTE FUNCTION sync_deck_card_count();

-- =====================
-- Storage Buckets
-- =====================
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', FALSE);

INSERT INTO storage.buckets (id, name, public)
VALUES ('card-images', 'card-images', TRUE);

CREATE POLICY "Users can upload own PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own PDFs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload card images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'card-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Card images are public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'card-images');
