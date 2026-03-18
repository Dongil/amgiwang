# 암기왕 (AmgiWang) - 기획안 v2.5

> **상태**: 확정
> **최종 수정**: 2026-03-16
> **변경 이력**:
> - v1.0 초안
> - v1.1 영어단어 전용 시스템, PDF 업로드, 진도 관리 추가
> - v2.5 덱 공유 시스템 (public/private), UI 리디자인 (에메랄드 그린 OKLCH 테마), 탐색 페이지, 5탭 네비게이션

---

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **앱 이름** | 암기왕 (AmgiWang) |
| **대상 사용자** | 고등학생 (딸) - 추후 확장 가능 |
| **목적** | 효율적인 암기 학습 + AI 기반 심화 학습 |
| **플랫폼** | PWA (모바일/데스크톱 모두 지원) |
| **언어** | 한국어 전용 (UI) |

---

## 기술 스택

| 영역 | 기술 | 선택 이유 |
|------|------|-----------|
| **프레임워크** | Next.js 16 (App Router, TypeScript) | RSC, Turbopack, 최신 React 19 |
| **DB/Auth** | Supabase (PostgreSQL, Auth, Storage) | RLS, Realtime, 무료 티어 넉넉 |
| **UI** | Tailwind CSS v4 + shadcn/ui | OKLCH 컬러, 에메랄드 그린 테마 |
| **PWA** | next-pwa | 오프라인 지원, 홈 화면 설치 |
| **TTS** | Web Speech API | 브라우저 내장, 무료 |
| **AI** | 멀티 프로바이더 (Gemini / OpenAI / Claude) | 사용자가 API키 등록, 선택 사용 |
| **AI (MVP)** | Google Gemini API | 무료 티어 넉넉, MVP 우선 구현 |
| **PDF 파싱** | pdf-parse + AI 멀티모달 | PDF 텍스트 추출 → AI 카드 변환 |
| **상태관리** | Zustand | 가볍고 직관적 |
| **데이터페칭** | TanStack Query | 캐싱, 자동 리프레시 |
| **배포** | Vercel | Next.js 최적 배포, 무료 티어 |

---

## 핵심 결정 사항

| 항목 | 결정 | 비고 |
|------|------|------|
| **AI API** | 멀티 프로바이더 (사용자 API키 등록) | MVP는 Gemini 우선 |
| **인증** | 이메일 로그인만 (Supabase Auth) | 심플하게 |
| **게임화** | 풍성하게 (스트릭+XP+뱃지+미션) | 동기부여 극대화 |
| **공유** | public/private 공유 + 탐색/복제 | v2.5: 전체 공유, 비공개 공유(사용자 지정), 덱 탐색/미리보기/복제 |
| **비용** | 사용자 본인 API키 → 서버 AI 비용 0원 | Route Handler 경유 |
| **덱 타입** | 영어단어 / 일반과목 분리 | 별도 테이블 (cards + vocab_cards) |
| **카드 모델** | 분리 테이블 방식 | 영어단어 전용 필드 최적화 |
| **PDF 업로드** | Phase 1 MVP 포함 | 덱 구성의 핵심 방법 |
| **진도 관리** | 일일 학습 분량 설정 + 매일 진도 체크 | study_plans 테이블 |

---

## 핵심 기능

### 1. 덱 타입 시스템 (v1.1 신규)

덱은 **영어단어 덱**과 **일반과목 덱** 두 가지로 구분됩니다.

| 구분 | 영어단어 덱 | 일반과목 덱 |
|------|------------|------------|
| **deck_type** | `english_vocab` | `general` |
| **카드 테이블** | `vocab_cards` (전용) | `cards` (앞면/뒷면) |
| **대상 과목** | 영어 | 국어, 수학, 과학, 사회, 한국사 등 |
| **학습 UI** | 단어 전용 카드 (발음기호, 예문 등) | 일반 플래시카드 (앞/뒤) |
| **TTS** | 영어 발음 재생 (필수) | 한국어 읽기 (선택) |
| **퀴즈** | 영→한, 한→영, 빈칸(예문), 발음 | 객관식, O/X, 빈칸, 주관식 |

### 2. 영어단어 학습 시스템 (v1.1 신규) - 핵심 차별화

고등학생 영어 학습에 최적화된 6가지 요소를 제공합니다.

#### 2-1. 기본 4요소 (필수)
- **영단어 (word)**: 영어 단어
- **한글 뜻 (meaning)**: 대표 뜻 + 보조 뜻
- **발음기호 (phonetic)**: IPA 발음기호 표시
- **예문 (example_sentence)**: 단어가 사용된 예문 + 한글 해석

#### 2-2. 품사 & 관련어
- **품사 (part_of_speech)**: n. / v. / adj. / adv. / prep. 등
- **동의어 (synonyms)**: 비슷한 뜻의 단어 목록
- **반의어 (antonyms)**: 반대 뜻의 단어 목록

#### 2-3. 어원 분석 (Etymology)
- **어근 (root)**: 단어의 핵심 어근 (e.g., "spect" = 보다)
- **접두사 (prefix)**: un-, re-, pre-, dis- 등
- **접미사 (suffix)**: -tion, -ment, -able, -ness 등
- **어원 설명**: AI가 어원을 통한 암기법 제공
- **같은 어근 단어**: 관련 단어 그룹 자동 연결

#### 2-4. AI 연상 니모닉 (Mnemonic)
- AI가 기억하기 쉬운 **연상법** 자동 생성
- 한국어 발음 유사성 활용 (e.g., "abundant → 아빠 던져 → 풍부하게 던져")
- 이미지/상황 연상 (e.g., "diligent → 개미처럼 부지런한 학생 장면")
- 사용자가 직접 니모닉 추가/수정 가능

#### 2-5. 수능 기출 연계 (Phase 4 이후)
- 해당 단어가 출제된 **수능/모의고사 기출 지문** 연결
- 기출 지문 내에서 단어 하이라이트
- "이 단어가 나온 시험" 목록 표시
- 기출 지문 기반 독해 연습 모드

#### 영어단어 학습 모드
```
[ 영어단어 플래시카드 UI ]

┌─────────────────────────────┐
│  📖 abundant                │  ← 단어
│  /əˈbʌndənt/  🔊           │  ← 발음기호 + TTS
│                             │
│  adj. 풍부한, 많은           │  ← 품사 + 뜻
│                             │
│  💡 "아빠 던져 → 풍부하게"    │  ← AI 니모닉
│                             │
│  📝 예문:                    │
│  Water is abundant in       │
│  this region.               │
│  (이 지역은 물이 풍부하다)    │
│                             │
│  🌱 어원: ab-(강조) +        │
│     und-(파도) + -ant        │
│     = 넘쳐나는               │
│                             │
│  ↔ 동의어: plentiful, ample  │
│  ↔ 반의어: scarce, rare      │
│                             │
│  [모름] [어려움] [좋음] [완벽] │  ← SM-2 평가
└─────────────────────────────┘
```

### 3. PDF 업로드 & 덱 자동 구성 (v1.1 신규) - MVP 포함

PDF를 업로드하면 AI가 내용을 분석해서 카드를 자동 생성합니다.

#### PDF 업로드 플로우
```
PDF 업로드 → 텍스트 추출 (pdf-parse)
    → AI 분석 (Gemini)
    → 카드 자동 생성 제안
    → 사용자 검토/편집
    → 덱에 카드 저장
```

#### 덱 타입별 PDF 처리

| 덱 타입 | PDF 예시 | AI 추출 결과 |
|---------|---------|-------------|
| **영어단어** | 영단어 교재, 단어 리스트 PDF | word, meaning, phonetic, example 등 자동 추출 |
| **일반과목** | 교과서 요약, 프린트물 | 핵심 개념 → front/back 카드 변환 |

#### PDF 관련 기능
- **Supabase Storage**에 원본 PDF 저장
- **페이지 범위 선택**: "10~15페이지만 카드 생성"
- **카드 미리보기**: AI 생성 결과 검토 후 확정
- **재생성**: 불만족 시 프롬프트 조정 후 재생성
- **원본 참조**: 카드에서 원본 PDF 해당 페이지로 이동

### 4. 일일 학습 진도 관리 (v1.1 신규)

#### 학습 계획 설정
- 덱 생성 시 **일일 학습 분량** 설정 (e.g., "하루 30단어")
- **학습 기간** 설정 (e.g., "2주 안에 완료")
- 자동으로 일별 분량 배분
- 진도에 따라 분량 자동 조절

#### 일일 진도 체크
```
[ 오늘의 학습 현황 ]

📚 영어 수능필수단어 Day 5/14
━━━━━━━━━━━━━━━━ 35%
오늘 분량: 30단어 중 12단어 완료

📖 한국사 근현대사 Day 3/7
━━━━━━━━━━━━━━━━ 42%
오늘 분량: 15카드 중 6카드 완료

[학습 계속하기]
```

#### 진도 관리 기능
- **오늘 할 분량** 대시보드에 표시
- **밀린 분량** 자동 재배분
- **진도율** 퍼센트 표시
- **예상 완료일** 계산
- **알림**: "오늘 분량 아직 안 했어요!"

### 5. 암기카드 (Flashcards) - 일반과목

- **카드 생성**: 앞면(질문/용어) + 뒷면(답/설명)
- **이미지 첨부**: 카드에 이미지 추가 가능 (Supabase Storage)
- **과목별 덱(Deck) 관리**: 국어, 수학, 과학, 사회, 한국사 등
- **태그 시스템**: #중간고사 #1단원 #중요 등으로 필터링
- **대량 입력**: 텍스트/CSV 붙여넣기로 한번에 카드 다수 생성
- **AI 자동 생성**: 텍스트/PDF 넣으면 AI가 카드 자동 생성

### 6. 간격 반복 학습 (Spaced Repetition)

- **SM-2 알고리즘 기반**: 기억 강도에 따라 복습 간격 자동 조절
- **난이도 평가**: 학습 후 "완벽 / 좋음 / 어려움 / 모름" 4단계
- **오늘의 복습**: 매일 복습해야 할 카드 자동 추천 + 신규 학습 분량
- **학습 통계**: 암기율, 복습 진도, 예상 암기 완료일
- **영어/일반 동일 적용**: 두 카드 타입 모두 SM-2 사용

### 7. 퀴즈 모드 - AI 연동

#### 일반과목 퀴즈
- **객관식 퀴즈**: AI가 보기 자동 생성 (오답 포함)
- **빈칸 채우기**: 핵심 키워드를 빈칸으로 자동 변환
- **O/X 퀴즈**: 참/거짓 판별
- **주관식**: 직접 입력 → AI가 채점 및 피드백
- **시험 모드**: 시간제한 + 랜덤 출제 + 점수 산출

#### 영어단어 전용 퀴즈 (v1.1 신규)
- **영→한**: 영단어 보고 뜻 맞추기 (객관식/주관식)
- **한→영**: 한글 뜻 보고 영단어 맞추기 (타이핑)
- **예문 빈칸**: 예문에서 단어 빈칸 채우기
- **발음 듣기**: TTS로 단어 듣고 뜻/스펠링 맞추기
- **어원 퀴즈**: 접두사/접미사/어근의 뜻 맞추기

#### 범위 지정 퀴즈 (v1.1 신규)
- **PDF 업로드 내용 범위**에서 출제
- **일일 학습 분량** 범위에서 출제
- **오답 모아풀기**: 틀린 문제만 재출제
- **Day별 퀴즈**: "Day 3 범위 퀴즈" 등 진도 기반 출제

### 8. AI 심층 질문 (Deep Dive) - 차별화

- **소크라테스식 질문**: "왜 그렇게 생각해?" → 사고력 강화
- **개념 연결**: "이 개념과 관련된 다른 개념은?"
- **오답 분석**: 틀린 문제 → AI가 왜 틀렸는지 설명
- **난이도 조절**: AI가 학생 수준에 맞게 질문 수준 조절
- **대화형 학습**: 챗봇 형태로 자유롭게 질문/답변

### 9. TTS 음성 학습

- **영어 단어 발음**: TTS로 원어민 발음 재생 (영어단어 덱 필수)
- **카드 읽어주기**: 앞면/뒷면 음성 재생
- **듣기 모드**: 화면 안 보고 음성으로만 학습 (이동 중 활용)
- **속도 조절**: 0.5x ~ 2.0x 재생 속도
- **영어 예문 읽기**: 예문 전체를 TTS로 재생

### 10. 게임화 시스템 (풍성하게)

- **학습 스트릭**: 연속 학습일 표시 + 스트릭 보호권
- **XP 포인트**: 카드 학습, 퀴즈 정답, 복습 완료 시 XP 획득
- **레벨 시스템**: XP 누적으로 레벨업 (Lv.1 초보 → Lv.50 암기왕)
- **뱃지/업적**: "첫 100장 암기", "7일 연속", "퀴즈 만점" 등
- **일일 도전 미션**: "오늘 30장 복습하기", "퀴즈 5회 도전" 등
- **대시보드 꾸미기**: 레벨에 따라 프로필 테마 해금

### 11. 덱 공유 시스템 (v2.5 대폭 개선)

#### 공유 모드 (3단계)
- **none**: 비공유 (기본값)
- **public**: 전체 공유 — 탐색 페이지에 노출, 누구나 복제 가능
- **private**: 비공개 공유 — 지정한 사용자만 덱에 접근 가능 (최대 20명)

#### 공유 기능
- **ShareDialog**: 공유 모드 전환 + 비공개 사용자 검색/추가/삭제
- **nanoid 기반 share_id**: 공유 링크용 짧은 ID 자동 생성
- **deck_shares 테이블**: 비공개 공유 대상 사용자 관리

#### 탐색 & 복제 (v2.5 신규)
- **Explore 페이지**: 공유된 덱 검색, 타입 필터, 정렬 (최신/인기/카드수)
- **Preview 페이지**: 덱 정보 + 카드 미리보기 (최대 10장) + 복제 버튼
- **Clone API**: 덱 + 카드 전체 복제 (최대 500장), 중복 복제 방지
- **import_count**: 복제 횟수 표시

#### 덱 목록 탭
- **[내 덱] / [공유받은 덱]**: 소유 덱과 복제해온 덱 분리 표시
- source_deck_id 기반 필터링

### 12. PWA 특화 기능

- **오프라인 학습**: 다운받은 카드는 인터넷 없이 학습 가능
- **푸시 알림**: "복습 시간이에요!" 학습 리마인더
- **홈 화면 설치**: 앱처럼 사용

---

## 화면 구성

```
 암기왕 화면 구조

[Bottom Navigation: 홈 | 덱 | 탐색 | 통계 | 설정]    ← v2.5: 5탭 (탐색 추가)

1. 홈 (대시보드)
   ├── 오늘의 학습 진도 (일일 분량 진행률 바)
   ├── 오늘의 복습 카드 수 & 시작 버튼
   ├── 학습 스트릭 (불꽃 아이콘 + 연속일)
   ├── 레벨 & XP 진행 바
   ├── 일일 미션 리스트
   ├── 최근 학습 덱 (빠른 접근)
   └── 주간 학습 히트맵

2. 덱 관리
   ├── 소유 탭 [내 덱 | 공유받은 덱]                     ← v2.5
   ├── 타입별 탭 [전체 | 영어단어 | 일반과목]
   ├── 과목별 필터 (전체/국어/영어/수학/...)
   ├── 덱 카드 (제목, 카드수, 진도율, 공유 뱃지)
   ├── + 새 덱 만들기
   │   ├── 덱 타입 선택 (영어단어 / 일반과목)
   │   ├── PDF 업로드 → AI 카드 생성
   │   ├── 직접 입력
   │   ├── 텍스트 → AI 자동 생성
   │   └── CSV 대량 입력
   ├── 덱 상세
   │   ├── 카드 목록/편집
   │   ├── 학습 계획 설정 (일일 분량, 기간)
   │   ├── 진도 현황 (Day별 진행률)
   │   └── 공유 설정 (ShareDialog)                       ← v2.5
   └── 공유 모드 관리 (none/public/private)               ← v2.5

2.5. 탐색 (Explore)                                       ← v2.5 신규
   ├── 검색바 (덱 이름/과목 검색)
   ├── 타입 필터 [전체 | 영어단어 | 일반과목]
   ├── 정렬 (최신순 / 인기순 / 카드 많은순)
   ├── 공유 덱 카드 리스트 (제목, 소유자, 카드수, 복제수)
   └── 덱 미리보기 (Preview)
       ├── 덱 정보 (제목, 소유자, 과목, 카드수, 복제수)
       ├── 카드 미리보기 (최대 10장)
       └── [내 덱에 추가] 복제 버튼

3. 학습 모드 (덱 선택 후)
   ├── 오늘의 분량 표시 (Day N: XX장)
   ├── [영어단어 덱]
   │   ├── 단어 카드 모드 (전용 UI)
   │   │   ├── 단어 + 발음기호 + TTS 🔊
   │   │   ├── 뜻 + 품사
   │   │   ├── 예문 + 해석
   │   │   ├── 어원 분석
   │   │   ├── AI 니모닉
   │   │   └── 동의어/반의어
   │   ├── 영어 퀴즈 모드
   │   │   ├── 영→한 / 한→영
   │   │   ├── 예문 빈칸
   │   │   ├── 발음 듣기 퀴즈
   │   │   └── 어원 퀴즈
   │   └── 듣기 모드 (TTS 자동 재생)
   │
   ├── [일반과목 덱]
   │   ├── 플래시카드 모드
   │   │   ├── 카드 넘기기 (스와이프)
   │   │   ├── 난이도 평가 (4단계)
   │   │   └── TTS 재생 버튼
   │   ├── 퀴즈 모드
   │   │   ├── 유형 선택 (객관식/OX/빈칸/주관식)
   │   │   ├── 범위 선택 (Day별/전체/오답)
   │   │   ├── 시험 모드 (시간제한)
   │   │   └── 결과 & AI 오답 분석
   │   └── AI 심층 질문 모드
   │       └── 챗봇 형태 대화
   │
   └── 학습 완료 → 진도 업데이트 + XP 획득

4. 통계
   ├── 학습 그래프 (일/주/월)
   ├── 암기율 추이 차트
   ├── 과목별/덱별 진도율
   ├── 영어단어 전용 통계 (암기율, 오답 단어 TOP 10)
   ├── 뱃지/업적 컬렉션
   └── XP & 레벨 히스토리

5. 설정
   ├── 프로필 (닉네임, 학년)
   ├── AI 설정 (API키 등록, 프로바이더 선택)
   ├── 알림 설정 (복습 리마인더 시간)
   ├── TTS 설정 (속도, 음성)
   ├── 테마 (라이트/다크)
   └── 데이터 관리 (내보내기/가져오기)
```

---

## 데이터 모델

### profiles (사용자 프로필)
```sql
- id: uuid (PK, = auth.users.id)
- display_name: text
- grade: smallint (학년: 1~3)
- daily_goal: int (일일 목표 카드 수, default: 30)
- xp: int (총 경험치, default: 0)
- level: int (현재 레벨, default: 1)
- streak_count: int (연속 학습일)
- streak_last_date: date (마지막 학습일)
- ai_provider: text ('gemini' | 'openai' | 'claude')
- ai_api_key: text (encrypted, 사용자 API키)
- created_at: timestamptz
- updated_at: timestamptz
```

### decks (덱/카드묶음) - v2.5 수정
```sql
- id: uuid (PK)
- user_id: uuid (FK → profiles)
- deck_type: text NOT NULL ('english_vocab' | 'general')   ← v1.1 신규
- title: text
- subject: text (과목: 영어/국어/수학/과학/사회/한국사/기타)
- description: text
- color: text (덱 색상 코드)
- card_count: int (카드 수, 캐시)
- mastered_count: int (암기 완료 카드 수, 캐시)
- share_id: text (unique, nullable, nanoid(12) 공유용 짧은 ID)
- share_mode: text ('none' | 'public' | 'private', default: 'none')  ← v2.5
- import_count: int (복제 횟수, default: 0)                            ← v2.5
- source_deck_id: uuid (nullable, 복제 원본 덱 ID)                     ← v2.5
- source_user_id: uuid (nullable, 복제 원본 소유자 ID)                  ← v2.5
- created_at: timestamptz
- updated_at: timestamptz
```

### deck_shares (비공개 공유 대상) - v2.5 신규
```sql
- id: uuid (PK)
- deck_id: uuid (FK → decks)
- shared_with_id: uuid (FK → profiles)
- created_at: timestamptz
- UNIQUE(deck_id, shared_with_id)
```

### cards (일반과목 암기 카드) - 기존 유지
```sql
- id: uuid (PK)
- deck_id: uuid (FK → decks WHERE deck_type = 'general')
- front_text: text (앞면 - 질문/용어)
- back_text: text (뒷면 - 답/설명)
- front_image_url: text (nullable)
- back_image_url: text (nullable)
- tags: text[] (태그 배열)
- position: int (카드 순서)
- created_at: timestamptz
- updated_at: timestamptz
```

### vocab_cards (영어단어 전용 카드) - v1.1 신규
```sql
- id: uuid (PK)
- deck_id: uuid (FK → decks WHERE deck_type = 'english_vocab')
- word: text NOT NULL (영단어)
- meaning: text NOT NULL (한글 뜻 - 대표)
- meaning_sub: text (보조 뜻)
- phonetic: text (IPA 발음기호, e.g., /əˈbʌndənt/)
- part_of_speech: text (품사: n./v./adj./adv./prep./conj.)
- example_sentence: text (영어 예문)
- example_translation: text (예문 한글 해석)
- synonyms: text[] (동의어 배열)
- antonyms: text[] (반의어 배열)
- root: text (어근, e.g., "spect")
- prefix: text (접두사, e.g., "re-")
- suffix: text (접미사, e.g., "-tion")
- etymology_note: text (어원 설명/암기 팁)
- mnemonic: text (AI 연상 니모닉)
- mnemonic_user: text (사용자 직접 입력 니모닉)
- difficulty_level: smallint (난이도: 1-5)
- tags: text[] (태그 배열)
- position: int (카드 순서)
- created_at: timestamptz
- updated_at: timestamptz
```

### pdf_uploads (PDF 업로드 관리) - v1.1 신규
```sql
- id: uuid (PK)
- user_id: uuid (FK → profiles)
- deck_id: uuid (FK → decks)
- file_name: text (원본 파일명)
- file_url: text (Supabase Storage URL)
- file_size: int (파일 크기 bytes)
- page_count: int (총 페이지 수)
- processed_pages: text (처리된 페이지 범위, e.g., "1-15")
- status: text ('uploading' | 'processing' | 'completed' | 'failed')
- extracted_text: text (추출된 텍스트, nullable)
- created_at: timestamptz
```

### study_plans (학습 계획/진도 관리) - v1.1 신규
```sql
- id: uuid (PK)
- user_id: uuid (FK → profiles)
- deck_id: uuid (FK → decks)
- total_cards: int (전체 카드 수)
- daily_amount: int (일일 학습 분량)
- start_date: date (학습 시작일)
- end_date: date (목표 완료일)
- current_day: int (현재 진행 Day)
- total_days: int (전체 Day 수)
- status: text ('active' | 'completed' | 'paused')
- created_at: timestamptz
- updated_at: timestamptz
```

### daily_progress (일일 진도 기록) - v1.1 신규
```sql
- id: uuid (PK)
- study_plan_id: uuid (FK → study_plans)
- user_id: uuid (FK → profiles)
- day_number: int (Day N)
- target_card_ids: uuid[] (오늘 학습할 카드 ID 목록)
- completed_card_ids: uuid[] (완료된 카드 ID 목록)
- progress_rate: real (진행률 0.0~1.0)
- studied_at: date
- is_completed: boolean (default: false)
- created_at: timestamptz
```

### study_records (학습 기록 - SM-2) - 기존 유지, 참조 확장
```sql
- id: uuid (PK)
- user_id: uuid (FK → profiles)
- card_id: uuid (cards 또는 vocab_cards의 ID)
- card_type: text ('general' | 'english_vocab')   ← v1.1 신규
- quality: smallint (0-5, SM-2 평가)
- ease_factor: real (난이도 계수, default: 2.5)
- interval: int (복습 간격 일수)
- repetitions: int (반복 횟수)
- next_review_date: date (다음 복습 예정일)
- reviewed_at: timestamptz
```

### quiz_results (퀴즈 결과) - 기존 유지
```sql
- id: uuid (PK)
- user_id: uuid (FK → profiles)
- deck_id: uuid (FK → decks)
- quiz_type: text ('multiple_choice' | 'ox' | 'fill_blank' | 'subjective'
                   | 'eng_to_kor' | 'kor_to_eng' | 'listening' | 'etymology')  ← v1.1 확장
- score: int (정답 수)
- total_questions: int (총 문제 수)
- time_spent_sec: int (소요 시간)
- answers: jsonb (문제별 상세 기록)
- day_number: int (nullable, 진도 기반 퀴즈 시 Day 번호)   ← v1.1 신규
- created_at: timestamptz
```

### ai_conversations (AI 대화 기록) - 기존 유지
```sql
- id: uuid (PK)
- user_id: uuid (FK → profiles)
- deck_id: uuid (FK → decks, nullable)
- title: text (대화 제목)
- messages: jsonb (대화 메시지 배열)
- created_at: timestamptz
- updated_at: timestamptz
```

### badges (뱃지 정의 - 시드 데이터) - 기존 유지
```sql
- id: text (PK, e.g., 'first_100_cards')
- name: text (뱃지 이름)
- description: text (달성 조건 설명)
- icon: text (아이콘)
- condition_type: text ('cards_studied' | 'streak' | 'quiz_perfect' | ...)
- condition_value: int (달성 기준값)
```

### user_badges (사용자 획득 뱃지) - 기존 유지
```sql
- id: uuid (PK)
- user_id: uuid (FK → profiles)
- badge_id: text (FK → badges)
- earned_at: timestamptz
```

### daily_missions (일일 미션) - 기존 유지
```sql
- id: uuid (PK)
- user_id: uuid (FK → profiles)
- mission_date: date
- mission_type: text ('review_cards' | 'quiz_count' | 'study_time' | ...)
- target_value: int (목표값)
- current_value: int (현재 진행값)
- xp_reward: int (보상 XP)
- is_completed: boolean (default: false)
- created_at: timestamptz
```

---

## ER 다이어그램 (관계)

```
profiles (1) ──┬── (N) decks ──┬── (N) cards          [일반과목]
               │               ├── (N) vocab_cards     [영어단어]
               │               ├── (N) pdf_uploads
               │               ├── (N) deck_shares     [v2.5 비공개 공유]
               │               └── (1) study_plans ── (N) daily_progress
               │
               ├── (N) deck_shares (shared_with_id)    [v2.5 공유받은]
               ├── (N) study_records
               ├── (N) quiz_results
               ├── (N) ai_conversations
               ├── (N) user_badges ── badges
               └── (N) daily_missions
```

---

## AI 멀티 프로바이더 아키텍처

### 지원 프로바이더

| 프로바이더 | 모델 | 특징 |
|-----------|------|------|
| **Gemini** (기본) | gemini-2.0-flash | 무료 티어 넉넉, 빠른 응답, PDF 멀티모달 |
| **OpenAI** | gpt-4o-mini | 가성비 좋음, 안정적 |
| **Claude** | claude-sonnet-4-6 | 심층 분석/설명에 강점 |

### API키 관리
- 사용자가 설정에서 직접 API키 입력
- Supabase DB에 암호화 저장 (pgcrypto)
- Next.js Route Handler에서 복호화 후 API 호출
- 서버 사이드 호출로 API키 노출 방지

### AI 기능별 프롬프트 전략

| 기능 | 입력 | 출력 |
|------|------|------|
| 일반 카드 생성 | 교과서 텍스트/PDF | JSON: [{front, back}] 카드 리스트 |
| 영어단어 카드 생성 | 단어 리스트/PDF | JSON: [{word, meaning, phonetic, ...}] 전체 필드 |
| 어원 분석 | 영단어 | root, prefix, suffix, etymology_note |
| AI 니모닉 | 영단어 + 뜻 | 연상법 텍스트 |
| 퀴즈 생성 | 카드 내용 + 유형 | 문제 + 보기 + 정답 + 해설 |
| 영어 퀴즈 생성 | vocab_cards + 유형 | 영→한/한→영/빈칸 문제 |
| 오답 분석 | 틀린 문제 + 학생 답 | 왜 틀렸는지 설명 + 올바른 개념 |
| 심층 질문 | 학습 중인 개념 | 사고력 향상 후속 질문 |
| PDF 분석 | PDF 텍스트 | 구조화된 카드 데이터 |

---

## 개발 우선순위 (Phase) - v2.5 수정

### Phase 1 - MVP (핵심 기능) ✅ 완료

| # | 기능 | 세부 | 상태 |
|---|------|------|:----:|
| 1 | 프로젝트 셋업 | Next.js 16 + Supabase + Tailwind v4 + shadcn/ui + PWA | ✅ |
| 2 | 인증 | 이메일 회원가입/로그인 (Supabase Auth) | ✅ |
| 3 | 덱 CRUD | 덱 생성(타입 선택)/조회/수정/삭제 + 과목 분류 | ✅ |
| 4 | 일반 카드 CRUD | cards 테이블 - 앞/뒤 카드 생성/편집/삭제 | ✅ |
| 5 | 영어단어 카드 CRUD | vocab_cards 테이블 - 전용 입력 폼 | ✅ |
| 6 | PDF 업로드 | PDF 업로드 → 텍스트 추출 → AI 카드 생성 | ✅ |
| 7 | 플래시카드 학습 | 일반 카드 넘기기 + 영어단어 전용 카드 UI | ✅ |
| 8 | SM-2 간격 반복 | 복습 스케줄링 + 오늘의 복습 (두 카드타입 모두) | ✅ |
| 9 | 학습 계획 & 진도 | 일일 분량 설정 + Day별 진도 추적 | ✅ |
| 10 | 기본 대시보드 | 오늘 진도, 복습 카드 수, 최근 덱 | ✅ |

### Phase 2 - AI & 퀴즈 ✅ 완료

| # | 기능 | 세부 | 상태 |
|---|------|------|:----:|
| 11 | AI 설정 | API키 등록, 멀티 프로바이더 선택 (Gemini/OpenAI/Claude) | ✅ |
| 12 | AI 카드 생성 | PDF/텍스트 → AI → 카드 자동 생성 (일반+영어) | ✅ |
| 13 | AI 영어 보강 | 어원 분석 + 니모닉 자동 생성 | ✅ |
| 14 | 일반 퀴즈 | 객관식 + AI 보기 생성 (카드형 선택지 UI) | ✅ |
| 15 | 영어 퀴즈 | 영→한, 한→영, 예문 빈칸, 발음 퀴즈 | ✅ |
| 16 | TTS 음성 학습 | Web Speech API + 속도 조절 + 영어 발음 | ✅ |
| 17 | 학습 통계 | 플레이스홀더 (그래프 미구현) | ⏳ |

### Phase 2.5 - 덱 공유 & UI 리디자인 ✅ 완료 (v2.5 신규)

| # | 기능 | 세부 | 상태 |
|---|------|------|:----:|
| A | UI 리디자인 | OKLCH 에메랄드 그린 팔레트, p-5/space-y-5 스페이싱 | ✅ |
| B | 로그인/회원가입 | 풀스크린 레이아웃, h-12 rounded-xl 인풋/버튼 | ✅ |
| C | 퀴즈 UI | 카드형 선택지 (rounded-xl border-2), 원형 번호 뱃지 | ✅ |
| D | 5탭 네비게이션 | 홈/덱/탐색/통계/설정 + active dot indicator | ✅ |
| E | 덱 공유 시스템 | ShareDialog (none/public/private), 사용자 검색 | ✅ |
| F | 탐색 페이지 | 검색/타입필터/정렬, 공유 덱 목록 | ✅ |
| G | 미리보기 & 복제 | Preview 페이지, Clone API (500장 제한) | ✅ |
| H | 공유받은 덱 탭 | [내 덱] / [공유받은 덱] 분리 | ✅ |
| I | DB 마이그레이션 | deck_shares, share_mode, RLS, indexes | ✅ |
| J | 6 API routes | share, share/users, users/search, clone, explore, preview | ✅ |

### Phase 3 - AI 심화 & 게임화

| # | 기능 | 세부 | 상태 |
|---|------|------|:----:|
| 18 | AI 심층 질문 | 대화형 챗봇, 소크라테스식 질문 | ⏳ |
| 19 | AI 오답 분석 | 틀린 문제 설명 + 관련 개념 추천 | ⏳ |
| 20 | 빈칸/주관식 퀴즈 | AI 채점 + 피드백 | ⏳ |
| 21 | XP & 레벨 시스템 | 포인트 획득, 레벨업 | ⏳ |
| 22 | 뱃지/업적 | 조건 달성 시 뱃지 획득 | ⏳ |
| 23 | 일일 미션 | 매일 랜덤 미션 생성 | ⏳ |

### Phase 4 - 완성도 & 수능 연계

| # | 기능 | 세부 | 상태 |
|---|------|------|:----:|
| 24 | 수능 기출 연계 | 단어별 기출 지문 연결, 지문 내 하이라이트 | ⏳ |
| 25 | 오프라인 학습 | Service Worker 카드 캐싱 | ⏳ |
| 26 | 푸시 알림 | 복습 리마인더 | ⏳ |
| 27 | 대량 입력 | CSV/텍스트 일괄 카드 생성 | ⏳ |
| 28 | 다크 모드 | 시스템 연동 + 수동 토글 (CSS 변수 준비 완료) | ⏳ |
| 29 | 데이터 내보내기 | JSON/CSV 내보내기/가져오기 | ⏳ |
| 30 | 이미지 첨부 | Supabase Storage 카드 이미지 | ⏳ |

---

## 프로젝트 구조 (v2.5 수정)

```
amgiwang/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx          (풀스크린 로그인)      ← v2.5 리디자인
│   │   │   └── signup/page.tsx         (풀스크린 회원가입)    ← v2.5 리디자인
│   │   ├── (main)/
│   │   │   ├── layout.tsx              (Bottom Nav 5탭)      ← v2.5 수정
│   │   │   ├── page.tsx                (대시보드/홈)
│   │   │   ├── decks/
│   │   │   │   ├── page.tsx            (덱 목록 - 내 덱/공유받은 덱 탭)  ← v2.5
│   │   │   │   ├── new/page.tsx        (덱 생성 - 타입 선택)
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx        (덱 상세 + 공유 버튼)  ← v2.5
│   │   │   │       ├── edit/page.tsx
│   │   │   │       ├── cards/new/page.tsx      (카드 추가)
│   │   │   │       ├── upload-pdf/page.tsx     (PDF 업로드)
│   │   │   │       ├── study-plan/page.tsx     (학습 계획)
│   │   │   │       ├── study/page.tsx          (학습 모드)
│   │   │   │       ├── quiz/page.tsx           (퀴즈 모드)
│   │   │   │       └── ai-chat/page.tsx        (AI 심층 질문)
│   │   │   ├── explore/                                       ← v2.5 신규
│   │   │   │   ├── page.tsx            (탐색 - 검색/필터/정렬)
│   │   │   │   └── [deckId]/page.tsx   (미리보기 + 복제)
│   │   │   ├── stats/page.tsx          (통계)
│   │   │   └── settings/
│   │   │       ├── page.tsx            (설정 메인)
│   │   │       └── ai/page.tsx         (AI 설정)
│   │   ├── api/
│   │   │   ├── ai/
│   │   │   │   ├── generate-cards/route.ts       (일반 카드 생성)
│   │   │   │   ├── generate-vocab/route.ts       (영어단어 생성)
│   │   │   │   ├── generate-etymology/route.ts   (어원 분석)
│   │   │   │   ├── generate-mnemonic/route.ts    (니모닉 생성)
│   │   │   │   ├── generate-quiz/route.ts
│   │   │   │   ├── validate-key/route.ts         (API키 검증)
│   │   │   │   └── chat/route.ts
│   │   │   ├── decks/                                          ← v2.5 신규
│   │   │   │   ├── [id]/share/route.ts           (PUT 공유 모드)
│   │   │   │   ├── [id]/share/users/route.ts     (GET/POST/DELETE 공유 사용자)
│   │   │   │   ├── [id]/clone/route.ts           (POST 덱 복제)
│   │   │   │   ├── [id]/preview/route.ts         (GET 미리보기)
│   │   │   │   └── explore/route.ts              (GET 탐색 목록)
│   │   │   ├── users/search/route.ts             (GET 사용자 검색) ← v2.5
│   │   │   └── pdf/
│   │   │       └── parse/route.ts                (PDF 파싱)
│   │   ├── layout.tsx
│   │   └── manifest.ts
│   │
│   ├── components/
│   │   ├── ui/                          (shadcn/ui 컴포넌트)
│   │   ├── auth/
│   │   ├── deck/
│   │   │   ├── deck-list.tsx
│   │   │   ├── deck-card.tsx            (공유 뱃지 표시)   ← v2.5
│   │   │   ├── deck-type-selector.tsx
│   │   │   ├── card-list-table.tsx
│   │   │   └── share-dialog.tsx         (공유 설정 다이얼로그) ← v2.5 신규
│   │   ├── card/
│   │   │   ├── general-card-form.tsx    (일반 카드 입력)
│   │   │   └── vocab-card-form.tsx      (영어단어 입력)
│   │   ├── study/
│   │   │   ├── flashcard.tsx            (일반 플래시카드)
│   │   │   ├── vocab-flashcard.tsx      (영어단어 카드)  ← v1.1
│   │   │   ├── study-progress-bar.tsx   ← v1.1
│   │   │   └── daily-progress.tsx       ← v1.1
│   │   ├── quiz/
│   │   │   ├── quiz-general.tsx
│   │   │   └── quiz-vocab.tsx           ← v1.1
│   │   ├── pdf/
│   │   │   ├── pdf-uploader.tsx         ← v1.1
│   │   │   └── pdf-card-preview.tsx     ← v1.1
│   │   ├── ai/
│   │   ├── stats/
│   │   └── gamification/
│   │
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-decks.ts
│   │   ├── use-cards.ts
│   │   ├── use-vocab-cards.ts           ← v1.1
│   │   ├── use-study.ts
│   │   ├── use-study-plan.ts            ← v1.1
│   │   ├── use-pdf-upload.ts            ← v1.1
│   │   ├── use-tts.ts
│   │   └── use-ai.ts
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── ai/
│   │   │   ├── provider.ts              (멀티 프로바이더 추상화)
│   │   │   ├── gemini.ts
│   │   │   ├── openai.ts
│   │   │   ├── claude.ts
│   │   │   └── prompts.ts               (프롬프트 템플릿)
│   │   ├── pdf/
│   │   │   └── parser.ts                (PDF 텍스트 추출)  ← v1.1
│   │   ├── sm2.ts                       (SM-2 알고리즘)
│   │   └── utils.ts
│   │
│   ├── stores/
│   │   ├── auth-store.ts
│   │   └── study-store.ts
│   │
│   └── types/
│       ├── database.ts                  (Supabase 타입)
│       ├── ai.ts
│       └── index.ts
│
├── public/
│   ├── icons/                           (PWA 아이콘)
│   └── sw.js                            (Service Worker)
│
├── supabase/
│   ├── migrations/                      (DB 마이그레이션)
│   └── seed.sql                         (뱃지 시드 데이터)
│
├── docs/
│   ├── 01-plan/
│   ├── 02-design/
│   ├── 03-analysis/
│   └── 04-report/
│
├── .env.local

├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```
