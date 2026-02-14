-- =====================
-- Badge Seed Data
-- =====================
INSERT INTO badges (id, name, description, icon, condition_type, condition_value) VALUES
  ('first_card', '첫 카드', '첫 번째 카드를 만들었어요', 'sparkles', 'cards_created', 1),
  ('cards_10', '카드 수집가', '카드 10장을 만들었어요', 'collection', 'cards_created', 10),
  ('cards_100', '카드 마스터', '카드 100장을 만들었어요', 'trophy', 'cards_created', 100),
  ('cards_500', '카드 킹', '카드 500장을 만들었어요', 'crown', 'cards_created', 500),
  ('streak_3', '3일 연속', '3일 연속 학습했어요', 'fire', 'streak', 3),
  ('streak_7', '일주일 연속', '7일 연속 학습했어요', 'flame', 'streak', 7),
  ('streak_30', '한 달 연속', '30일 연속 학습했어요', 'volcano', 'streak', 30),
  ('streak_100', '100일 도전', '100일 연속 학습했어요', 'star', 'streak', 100),
  ('quiz_perfect', '퀴즈 만점', '퀴즈에서 만점을 받았어요', 'check-circle', 'quiz_perfect', 1),
  ('quiz_10', '퀴즈 도전자', '퀴즈 10회 도전했어요', 'zap', 'quiz_count', 10),
  ('level_5', 'Lv.5 달성', '레벨 5에 도달했어요', 'award', 'level', 5),
  ('level_10', 'Lv.10 달성', '레벨 10에 도달했어요', 'medal', 'level', 10),
  ('level_25', 'Lv.25 달성', '레벨 25에 도달했어요', 'gem', 'level', 25),
  ('level_50', '암기왕', '최고 레벨에 도달했어요!', 'king', 'level', 50),
  ('first_deck', '첫 덱', '첫 번째 덱을 만들었어요', 'book-open', 'decks_created', 1),
  ('pdf_upload', 'PDF 학습자', 'PDF를 업로드해서 카드를 만들었어요', 'file-text', 'pdf_uploaded', 1),
  ('vocab_100', '단어 100개', '영어단어 100개를 학습했어요', 'book', 'vocab_studied', 100),
  ('plan_complete', '계획 달성', '학습 계획을 100% 완료했어요', 'target', 'plan_completed', 1),
  ('share_deck', '나눔 학습', '덱을 친구와 공유했어요', 'share', 'deck_shared', 1),
  ('mission_7', '미션 클리어', '일일 미션 7회 완료했어요', 'flag', 'missions_completed', 7);
