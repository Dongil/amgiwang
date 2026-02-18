# AmgiWang (암기왕)

한국 학생을 위한 AI 기반 플래시카드 학습 PWA

## 주요 기능

### Phase 1 - MVP

- **인증**: Supabase Auth (이메일/비밀번호)
- **덱 관리**: 영어단어 / 일반과목 덱 CRUD
- **카드 관리**: 영어 단어 카드 (multi-meaning JSONB), 일반 카드 (앞/뒤)
- **플래시카드 학습**: 카드 넘기기, 정답/오답 평가
- **SM-2 간격반복**: 복습 주기 자동 계산 (easeFactor, interval, repetitions)
- **학습 플랜**: 일일 학습량 설정, Day별 진도 관리
- **대시보드**: 학습 현황, 오늘의 복습 카드, 최근 활동

### Phase 2 - AI & 퀴즈

- **AI 멀티 프로바이더**: Gemini, OpenAI, Claude 3종 지원 (설정에서 선택)
- **AI 카드 자동 생성**: PDF 업로드 → pdfjs-dist 텍스트 추출 → AI 변환 → 카드 생성
  - 스마트 페이지 분류 (목차/단어/퀴즈/학습플랜/기타)
  - Day 단위 배치 처리 (대용량 PDF 대응)
  - 텍스트 직접 입력 → AI 카드 생성
- **AI 영어 보강**: 어원 분석 (root/prefix/suffix), 니모닉 연상법 자동 생성
- **퀴즈 시스템**: 6종 퀴즈 유형
  - 영어: 영→한 (4지선다), 한→영 (타이핑), 빈칸 채우기, 듣기 (TTS)
  - 일반: 객관식, O/X
  - Day별 출제 범위 선택, 경과 타이머, AI 오답 보기 생성
- **학습 통계 대시보드**: 일별 학습량 차트, 암기율 추이, 퀴즈 정답률, 덱별 진도, 취약 카드 TOP 10

### Phase 3 - 카드 리스트 & 학습 네비게이션

- **덱 카드 리스트 테이블**: 덱 상세 페이지 하단에 전체 카드 테이블 표시
  - 서버사이드 페이지네이션 (50장/페이지, Supabase `.range()`)
  - Day 필터 드롭다운 (Day 1~50)
  - 단어 검색 (debounce 300ms)
  - 행 클릭 → Sheet 모달로 카드 편집 (VocabCardForm 재활용)
  - 행 ⋯ 메뉴 → 수정/삭제/여기 앞에 추가 (카드 삽입)
  - 삭제 확인 Dialog, 모바일 반응형 (컬럼 축소)
- **학습 네비게이션**: 학습 페이지 상단 네비게이션 바
  - Day 드롭다운 → 해당 Day 카드만 학습
  - 카드 번호 클릭 → 번호 입력 다이얼로그 → 직접 점프
  - 단어 검색 → 해당 카드로 이동
  - `?day=N` URL 파라미터 지원 (딥링크)
  - Progress 바, 좌우 화살표 네비게이션
- **카드 삽입 기능**: PDF 자동 인식 누락 단어를 원하는 위치에 삽입
  - PostgreSQL RPC `shift_vocab_positions` (position 시프트)
- **UX 개선**: 편집 모드 placeholder "(입력 없음)" 표시, 카드 수정 저장 버그 수정

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui (Radix) |
| Backend | Supabase (Auth, PostgreSQL, Storage) |
| State | Zustand (client) + TanStack React Query (server) |
| AI | Gemini (`@google/generative-ai`), OpenAI, Claude (`@anthropic-ai/sdk`) |
| PDF | pdfjs-dist |
| Charts | Recharts |
| PWA | next-pwa |

## 프로젝트 구조

```
src/
├── app/
│   ├── (main)/              # 인증 후 메인 레이아웃
│   │   ├── page.tsx          # 대시보드 (홈)
│   │   ├── decks/            # 덱 목록/생성
│   │   │   └── [id]/         # 덱 상세
│   │   │       ├── cards/new/ # 카드 추가
│   │   │       ├── edit/      # 덱 편집
│   │   │       ├── study/     # 플래시카드 학습
│   │   │       ├── study-plan/# 학습 플랜
│   │   │       ├── quiz/      # 퀴즈
│   │   │       └── upload-pdf/# PDF 업로드
│   │   ├── stats/            # 학습 통계
│   │   └── settings/         # 설정
│   │       └── ai/           # AI 프로바이더 설정
│   ├── api/
│   │   ├── ai/               # AI API Routes
│   │   │   ├── validate-key/  # API 키 검증
│   │   │   ├── generate-vocab/# 단어 카드 생성
│   │   │   ├── generate-cards/# 일반 카드 생성
│   │   │   ├── generate-etymology/ # 어원 분석
│   │   │   ├── generate-mnemonic/  # 니모닉 생성
│   │   │   └── generate-quiz/ # 퀴즈 보기 생성
│   │   └── pdf/parse/        # PDF 파싱
│   ├── login/                # 로그인
│   └── signup/               # 회원가입
├── components/
│   ├── card/                 # 카드 관련 (vocab-card-form 등)
│   ├── deck/                 # 덱 관련 (card-list-table, card-edit-sheet)
│   ├── quiz/                 # 퀴즈 (session, question, result)
│   ├── pdf/                  # PDF (uploader, card-preview, text-generator)
│   ├── stats/                # 통계 (study-chart, weak-cards)
│   ├── study/                # 학습 (vocab-card-view, study-nav)
│   └── ui/                   # shadcn/ui 컴포넌트
├── hooks/                    # 커스텀 훅 (use-quiz, use-vocab-cards, use-vocab-cards-paginated 등)
├── lib/
│   ├── ai/                   # AI 클라이언트 (provider, prompts, get-ai-client)
│   ├── supabase/             # Supabase 클라이언트 (client, server)
│   └── sm2.ts                # SM-2 간격반복 알고리즘
├── stores/                   # Zustand 스토어 (auth, study)
└── types/
    └── database.ts           # TypeScript 인터페이스 (18개)
```

## 데이터베이스 (Supabase)

| 테이블 | 설명 |
|--------|------|
| profiles | 사용자 프로필 + AI 설정 |
| decks | 덱 (영어단어/일반) |
| vocab_cards | 영어 단어 카드 (meanings JSONB) |
| cards | 일반 카드 (앞/뒤) |
| study_records | SM-2 학습 기록 |
| study_plans | 학습 플랜 |
| quiz_results | 퀴즈 결과 |
| pdf_uploads | PDF 업로드 기록 |
| daily_progress | 일일 학습 진도 |
| daily_missions | 일일 미션 |
| badges | 배지 정의 |
| user_badges | 사용자 배지 획득 |

## 시작하기

### 요구사항

- Node.js 18+
- Supabase 프로젝트 (Auth + PostgreSQL + Storage)

### 설치

```bash
git clone https://github.com/Dongil/amgiwang.git
cd amgiwang
npm install
```

### 환경 변수

`.env.local` 파일 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 실행

```bash
npm run dev       # 개발 서버 (http://localhost:3000)
npm run build     # 프로덕션 빌드
npm run start     # 프로덕션 서버
```

## 개발 이력

| Phase | 기능 | Match Rate | 커밋 |
|-------|------|:----------:|------|
| MVP | 인증, 덱/카드 CRUD, 플래시카드, SM-2, 대시보드 | 92% | `a42a85d` |
| Vocab Redesign | Multi-meaning JSONB 구조 | 100% | `4be11fe` |
| Phase 2 | AI 멀티 프로바이더, 퀴즈 6종, 통계 대시보드 | 99% | `ced7c86` |
| **Phase 3** | **카드 리스트 테이블, 학습 네비게이션, 카드 삽입** | **98%** | **latest** |

## 라이선스

Private
