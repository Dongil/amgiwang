-- 005_deck_sharing.sql
-- 덱 공유 기능: share_mode, deck_shares 테이블, RLS 정책

-- 1. decks 테이블 컬럼 추가
ALTER TABLE decks ADD COLUMN IF NOT EXISTS share_mode TEXT DEFAULT 'none'
  CHECK (share_mode IN ('none', 'public', 'private'));
ALTER TABLE decks ADD COLUMN IF NOT EXISTS import_count INT DEFAULT 0;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS source_deck_id UUID REFERENCES decks(id) ON DELETE SET NULL;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS source_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- is_shared와 share_mode 동기화: is_shared=true → share_mode='public'
UPDATE decks SET share_mode = 'public' WHERE is_shared = TRUE AND share_mode = 'none';

-- 2. deck_shares 테이블 (특정 사용자 공유)
CREATE TABLE IF NOT EXISTS deck_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shared_with_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(deck_id, shared_with_id)
);

CREATE INDEX IF NOT EXISTS idx_deck_shares_shared_with ON deck_shares(shared_with_id);
CREATE INDEX IF NOT EXISTS idx_deck_shares_deck ON deck_shares(deck_id);

-- 3. RLS 정책
ALTER TABLE deck_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages shares" ON deck_shares
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Shared user can view" ON deck_shares
  FOR SELECT USING (shared_with_id = auth.uid());

-- 4. 공유 덱 조회 정책 업데이트
DROP POLICY IF EXISTS "Shared decks are viewable" ON decks;

CREATE POLICY "Public shared decks viewable" ON decks
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND share_mode = 'public'
  );

CREATE POLICY "Private shared decks viewable" ON decks
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND share_mode = 'private'
    AND id IN (SELECT deck_id FROM deck_shares WHERE shared_with_id = auth.uid())
  );

-- 5. 탐색용 인덱스
CREATE INDEX IF NOT EXISTS idx_decks_share_mode ON decks(share_mode) WHERE share_mode = 'public';
CREATE INDEX IF NOT EXISTS idx_decks_import_count ON decks(import_count DESC) WHERE share_mode = 'public';
CREATE INDEX IF NOT EXISTS idx_decks_source ON decks(source_deck_id, user_id);

-- 6. import_count 증가 함수 (원자적)
CREATE OR REPLACE FUNCTION increment_import_count(deck_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE decks SET import_count = import_count + 1 WHERE id = deck_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
