export type DeckType = "english_vocab" | "general";
export type CardType = "general" | "english_vocab";
export type StudyPlanStatus = "active" | "completed" | "paused";
export type PdfUploadStatus =
  | "uploading"
  | "processing"
  | "completed"
  | "failed";
export type QuizType =
  | "multiple_choice"
  | "ox"
  | "fill_blank"
  | "subjective"
  | "eng_to_kor"
  | "kor_to_eng"
  | "listening"
  | "etymology";
export type AIProvider = "gemini" | "openai" | "claude";

export interface AIProviderConfig {
  apiKey: string;
  model: string;
}

/** { gemini: { apiKey, model }, openai: { apiKey, model }, claude: { apiKey, model } } */
export type AISettings = Partial<Record<AIProvider, AIProviderConfig>>;

export interface Profile {
  id: string;
  display_name: string;
  grade: number | null;
  daily_goal: number;
  xp: number;
  level: number;
  streak_count: number;
  streak_last_date: string | null;
  ai_provider: AIProvider;
  ai_settings: AISettings;
  created_at: string;
  updated_at: string;
}

export interface Deck {
  id: string;
  user_id: string;
  deck_type: DeckType;
  title: string;
  subject: string;
  description: string | null;
  color: string;
  card_count: number;
  mastered_count: number;
  share_id: string | null;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  deck_id: string;
  front_text: string;
  back_text: string;
  front_image_url: string | null;
  back_image_url: string | null;
  tags: string[];
  position: number;
  created_at: string;
  updated_at: string;
}

export interface VocabMeaning {
  pos: string;
  meaning: string;
  synonyms: string[];
}

export interface VocabRelated {
  word: string;
  meaning: string;
}

export interface VocabCard {
  id: string;
  deck_id: string;
  word: string;
  meaning: string;
  phonetic: string | null;
  example_sentence: string | null;
  example_translation: string | null;
  meanings: VocabMeaning[];
  antonyms: VocabRelated[];
  derivatives: VocabRelated[];
  root: string | null;
  prefix: string | null;
  suffix: string | null;
  etymology_note: string | null;
  mnemonic: string | null;
  mnemonic_user: string | null;
  tips: string | null;
  difficulty_level: number;
  tags: string[];
  position: number;
  created_at: string;
  updated_at: string;
}

export interface PdfUpload {
  id: string;
  user_id: string;
  deck_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  page_count: number | null;
  processed_pages: string | null;
  status: PdfUploadStatus;
  extracted_text: string | null;
  created_at: string;
}

export interface StudyPlan {
  id: string;
  user_id: string;
  deck_id: string;
  total_cards: number;
  daily_amount: number;
  start_date: string;
  end_date: string;
  current_day: number;
  total_days: number;
  status: StudyPlanStatus;
  created_at: string;
  updated_at: string;
  daily_progress?: DailyProgress[];
}

export interface DailyProgress {
  id: string;
  study_plan_id: string;
  user_id: string;
  day_number: number;
  target_card_ids: string[];
  completed_card_ids: string[];
  progress_rate: number;
  studied_at: string;
  is_completed: boolean;
  created_at: string;
}

export interface StudyRecord {
  id: string;
  user_id: string;
  card_id: string;
  card_type: CardType;
  quality: number;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: string;
  reviewed_at: string;
}

export interface QuizResult {
  id: string;
  user_id: string;
  deck_id: string;
  quiz_type: QuizType;
  score: number;
  total_questions: number;
  time_spent_sec: number;
  answers: Record<string, unknown>;
  day_number: number | null;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition_type: string;
  condition_value: number;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
}

export interface DailyMission {
  id: string;
  user_id: string;
  mission_date: string;
  mission_type: string;
  target_value: number;
  current_value: number;
  xp_reward: number;
  is_completed: boolean;
  created_at: string;
}
