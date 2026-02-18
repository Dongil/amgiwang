-- ================================================
-- AI Settings: per-provider API keys + model selection
-- ================================================

-- ai_settings JSONB 컬럼 추가
-- 구조: { "gemini": { "apiKey": "...", "model": "gemini-2.0-flash" }, ... }
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 기존 데이터 마이그레이션: ai_api_key_encrypted → ai_settings
UPDATE profiles
SET ai_settings = jsonb_build_object(
  ai_provider,
  jsonb_build_object('apiKey', ai_api_key_encrypted, 'model',
    CASE ai_provider
      WHEN 'gemini' THEN 'gemini-2.0-flash'
      WHEN 'openai' THEN 'gpt-4o-mini'
      WHEN 'claude' THEN 'claude-sonnet-4-5-20250929'
    END
  )
)
WHERE ai_api_key_encrypted IS NOT NULL AND ai_api_key_encrypted != '';

-- 기존 컬럼 삭제
ALTER TABLE profiles DROP COLUMN IF EXISTS ai_api_key_encrypted;
