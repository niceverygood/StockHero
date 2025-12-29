# StockHero

AI 3대장(Claude, Gemini, GPT)이 종목을 두고 토론하고, 합의 기반 Top 5를 도출하며, 과거 적중률을 공개하는 금융 엔터테인먼트 웹앱입니다.

---

## 프로젝트 개요

- AI 캐릭터 3명이 특정 종목에 대해 각자의 관점에서 분석하고 토론
- 합의 규칙(만장일치 우선, 평균 점수 및 리스크 패널티 적용)에 따라 Top 5 도출
- 과거 예측의 적중률을 투명하게 공개
- 투자 자문이 아닌 엔터테인먼트 콘텐츠로 설계

---

## 기술 스택

- Frontend/Backend: Next.js 14 (App Router), TypeScript
- Styling: Tailwind CSS
- Database: PostgreSQL (Docker), Prisma ORM
- LLM: 추상화 레이어 (기본 MockLLM, 실제 API 어댑터 인터페이스 제공)
- Chart: Recharts

---

## 디렉터리 구조

```
/app
  /(public)
    page.tsx              # 랜딩 페이지
    battle/[symbol]/      # 토론 관전 페이지
    verdict/              # 오늘의 Top 5
    archive/              # 적중률/히스토리
    report/[id]/          # 프리미엄 리포트
  /api                    # API Route Handlers

/components               # UI 컴포넌트
  DisclaimerBar, MessageBubble, CharacterBadge,
  VerdictCard, AccuracyChart, AdSlot, PaywallModal 등

/lib
  /llm                    # LLM 어댑터 및 오케스트레이터
  /market-data            # 시장 데이터 프로바이더
  /scoring                # 합의 규칙, 랭킹, 백테스트
  /safety                 # 컴플라이언스 필터

/prisma
  schema.prisma           # DB 스키마
  seed.ts                 # 시드 데이터

/scripts
  cron-generate-daily.ts  # 일일 Verdict 생성 스크립트
```

---

## 로컬 개발 환경 설정

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example` 파일을 `.env`로 복사:

```bash
cp .env.example .env
```

`.env` 파일 내용:

```env
# Database
DATABASE_URL="postgresql://stockhero:stockhero_dev_2024@localhost:5432/stockhero?schema=public"

# LLM API Keys (선택 - 비워두면 MockLLM 사용)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 3. PostgreSQL 실행 (Docker)

```bash
docker compose up -d
```

Docker가 설치되어 있지 않은 경우, 로컬 PostgreSQL을 사용하거나 클라우드 DB를 설정합니다.

### 4. 데이터베이스 마이그레이션 및 시드

```bash
# Prisma 클라이언트 생성
npm run db:generate

# 스키마 푸시 (개발용)
npm run db:push

# 시드 데이터 생성
npm run db:seed
```

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

---

## 주요 페이지

| 경로 | 설명 |
|------|------|
| `/` | 랜딩 페이지 - 서비스 소개 및 AI 캐릭터 안내 |
| `/verdict` | 오늘의 Top 5 - AI 합의 기반 주목 종목 |
| `/battle/[symbol]` | 토론 관전 - 특정 종목에 대한 AI 토론 |
| `/archive` | 적중률 및 아카이브 - 과거 예측 성과 |
| `/report/[id]` | 프리미엄 리포트 - 상세 분석 (Paywall) |

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/symbols` | 종목 목록 조회 |
| POST | `/api/debate/start` | 토론 세션 생성 |
| POST | `/api/debate/next` | 다음 라운드 메시지 생성 |
| POST | `/api/verdict/generate` | 오늘 Top 5 생성 |
| GET | `/api/verdict/today` | 오늘의 Verdict 조회 |
| GET | `/api/archive/metrics` | 적중률 통계 조회 |
| GET | `/api/b2b/one-line` | B2B용 한 줄 코멘트 |

---

## AI 캐릭터

### Claude Lee (균형 분석가)
- 스타일: 침착, 디테일, 균형 잡힌 시각
- 분석 초점: 실적, 재무 건전성, 산업 구조, 밸류에이션

### Gemi Nine (혁신 전략가)
- 스타일: 빠른 판단, 트렌드 포착, 성장 잠재력 중시
- 분석 초점: 신사업 확장, 기술 혁신, 글로벌 경쟁력

### G.P. Taylor (거시/리스크 총괄)
- 스타일: 중후, 신중, 종합 정리
- 분석 초점: 매크로 환경, 금리/환율, 지정학적 리스크

---

## 합의 규칙

1. 1차 선별: 3명 모두 4점 이상인 종목 우선
2. 2차 보충: 평균 점수 상위 + 리스크 패널티 적용
3. 최종 Top 5는 합의 근거 요약과 함께 저장

리스크 패널티: Claude Lee, G.P. Taylor가 플래그한 리스크가 많을수록 감점

---

## 규제 리스크 대응

1. 모든 페이지 상/하단에 면책 문구 표시
2. "매수해라/팔아라" 등 직접 지시 표현 금지 (컴플라이언스 필터)
3. 모든 분석에 리스크 요인 명시
4. 데이터 출처 표기 구조 마련
5. 과거 적중률은 미래 수익 보장 아님을 명시

---

## 수익화 훅 (UI 준비)

- 광고 슬롯 (AdSlot 컴포넌트): banner, sidebar, inline 타입
- 거래 연결 버튼: 외부 증권사 링크 자리
- 프리미엄 구독 Paywall: 상세 리포트 잠금/해제
- B2B API: 한 줄 코멘트 엔드포인트

모든 결제는 모의(샘플) 처리입니다.

---

## 환경 변수 설명

| 변수 | 설명 | 필수 |
|------|------|------|
| DATABASE_URL | PostgreSQL 연결 문자열 | 예 |
| OPENAI_API_KEY | OpenAI API 키 (GPT 실제 호출용) | 아니오 |
| ANTHROPIC_API_KEY | Anthropic API 키 (Claude 실제 호출용) | 아니오 |
| GOOGLE_AI_API_KEY | Google AI API 키 (Gemini 실제 호출용) | 아니오 |
| NEXT_PUBLIC_APP_URL | 앱 URL | 아니오 |
| NODE_ENV | 환경 (development/production) | 아니오 |

API 키가 없으면 MockLLM이 자동으로 사용됩니다.

---

## 배포

### Vercel 배포

```bash
vercel deploy
```

### 환경 변수 설정

Vercel 대시보드에서 환경 변수를 설정합니다.

### 데이터베이스

프로덕션 환경에서는 Vercel Postgres, Supabase, 또는 AWS RDS를 권장합니다.

### Cron Job

일일 Verdict 생성을 위해 Vercel Cron 또는 외부 스케줄러를 설정합니다.

---

## 면책 조항

본 서비스는 투자 자문이 아닌 엔터테인먼트 목적의 콘텐츠입니다. 제공되는 정보는 AI 모델의 분석 결과이며, 투자 판단의 책임은 전적으로 이용자 본인에게 있습니다. 실제 투자 결정 시에는 공인된 투자 자문사와 상담하시기 바랍니다. 과거 적중률은 미래 수익을 보장하지 않습니다.

---

## 라이선스

MIT License






