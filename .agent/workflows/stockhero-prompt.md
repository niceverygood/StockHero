---
description: StockHero 국내 주식 AI 분석 시스템 전체 구현 프롬프트. 다른 프로젝트에 동일 기능을 적용할 때 사용.
---

# StockHero 국내 주식 AI 분석 시스템 — 구현 프롬프트

이 프롬프트는 StockHero에 구현된 **국내 주식 AI 멀티모델 합의 추천 시스템**의 전체 아키텍처와 구현 세부사항입니다.
다른 프로젝트(머니시그널 등)에 동일 기능을 적용할 때 이 프롬프트를 사용하세요.

---

## 📋 시스템 개요

### 핵심 컨셉
- **3개 AI 모델**(Claude, Gemini, GPT)이 각자 독립적으로 한국 주식을 분석
- 3개 AI의 점수를 **합산/평균**하여 **Top 5 종목**을 매일 자동 선정
- **시장 센티먼트**(공포-탐욕 지수)를 계산하여 AI 점수에 **가중치 보정** 적용
- 최종적으로 **투자 판정 라벨**(적극매수/분할매수/관망/매수금지)을 부여

### 기술 스택
- **프레임워크**: Next.js (App Router)
- **DB**: Supabase (PostgreSQL)
- **AI**: OpenRouter API (Claude Opus 4, Gemini 2.5 Pro, GPT-4.1)
- **시장 데이터**: 네이버 금융 API + Yahoo Finance API
- **실시간 주가**: 한국투자증권 KIS API
- **스타일링**: Tailwind CSS
- **배포**: Vercel

---

## 🏗️ 아키텍처 (5개 핵심 모듈)

### 모듈 1: AI 멀티모델 합의 시스템 (daily-verdict)

**역할**: 매일 3개 AI가 독립적으로 한국 주식을 분석하고, 합의로 Top 5 선정

#### 분석 대상 종목 데이터 구조
```typescript
const ANALYSIS_STOCKS = [
  {
    symbol: '012450',           // 종목코드 (6자리)
    name: '한화에어로스페이스',   // 종목명
    sector: '방산',              // 섹터
    per: 25.0,                  // PER (주가수익비율)
    pbr: 3.0,                   // PBR (주가순자산비율)
    roe: 18.0,                  // ROE (자기자본이익률)
    dividend: 0.5,              // 배당수익률 (%)
    growth: 55.0,               // 예상 성장률 (%)
    theme: ['방산', '우주', '엔진', 'AI'],  // 테마 태그
  },
  // ... 40+개 종목 (방산, 반도체, AI/로봇, 바이오, 자동차, IT/플랫폼, 2차전지, 금융, 전력기기, 엔터)
];
```

#### 요일별 분석 테마 시스템
```typescript
const DAY_THEMES = {
  0: { name: '종합 밸런스', emoji: '⚖️', filterFn: () => true },
  1: { name: '성장주 포커스', emoji: '🚀', filterFn: (s) => s.growth >= 15 },
  2: { name: '배당 투자', emoji: '💰', filterFn: (s) => s.dividend >= 2.0 },
  3: { name: '가치 투자', emoji: '💎', filterFn: (s) => s.per <= 15 || s.pbr <= 1.0 },
  4: { name: '테마 & 트렌드', emoji: '🔥', filterFn: (s) => s.theme?.some(t => 핫테마.includes(t)) },
  5: { name: '블루칩', emoji: '🏆', filterFn: (s) => 대형주.includes(s.name) },
  6: { name: '하이 그로스', emoji: '🚀', filterFn: (s) => s.growth >= 30 },
};
```

#### AI별 프롬프트 설계 (각각 다른 관점)
```
[Claude - 펀더멘털 분석가]
"PER, PBR, ROE 등 재무지표를 기반으로 저평가 종목을 발굴하세요."
→ 제공 데이터: 현재가, PER, PBR, ROE, 배당률, 성장률, 테마

[Gemini - 성장주 전문가]
"혁신과 미래 성장 잠재력을 중심으로 분석하세요."
→ 제공 데이터: 현재가, 성장률, 섹터, 테마

[GPT - 안정성 중시 투자자]
"리스크와 수익의 균형, 안정적인 현금흐름이 있는 종목을 선정하세요."
→ 제공 데이터: 현재가, 배당률, PER, 섹터
```

#### AI 응답 포맷 (JSON)
```json
{
  "top5": [
    { "rank": 1, "symbol": "012450", "name": "한화에어로스페이스", "score": 4.8, "reason": "K9 자주포 수주잔고 60조원..." }
  ]
}
```

#### 점수 합산 알고리즘
```typescript
// 3개 AI의 점수를 합산하여 총점 계산
const totalScore = claudeScore + geminiScore + gptScore;
const avgScore = totalScore / 3;

// 만장일치 판정: 3개 AI 모두 해당 종목을 Top 5에 넣었는가
const isUnanimous = votedBy.length === 3;

// 총점 기준 정렬 → 상위 5개 = 최종 Top 5
```

#### Supabase DB 스키마
```sql
CREATE TABLE verdicts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  slot TEXT,  -- 'morning' | 'afternoon'
  top5 JSONB NOT NULL,           -- 합의 Top 5
  claude_top5 JSONB,             -- Claude 개별 Top 5
  gemini_top5 JSONB,             -- Gemini 개별 Top 5
  gpt_top5 JSONB,               -- GPT 개별 Top 5
  consensus_summary TEXT,        -- 합의 요약
  debate_log JSONB,              -- 토론 로그
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  verdict_id UUID REFERENCES verdicts(id),
  symbol_code TEXT NOT NULL,
  symbol_name TEXT NOT NULL,
  predicted_direction TEXT,  -- 'up' | 'hold' | 'down'
  avg_score NUMERIC,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 모듈 2: 시장 센티먼트 분석 (market-sentiment)

**역할**: 공포-탐욕 지수를 계산하여 AI 점수에 시장 가중치를 적용

#### 데이터 소스 (6개 지표)
```
1. KOSPI (네이버 금융 API) - 가중치 30%
2. KOSDAQ (네이버 금융 API) - 가중치 15%
3. S&P 500 (Yahoo Finance API) - 가중치 20%
4. NASDAQ (Yahoo Finance API) - 가중치 15%
5. VIX 공포지수 (Yahoo Finance API) - 가중치 10%
6. USD/KRW 환율 (네이버 → Yahoo 폴백) - 가중치 10%
```

#### 점수 계산 공식
```typescript
// 각 지표: 일간변동률 60% + 52주 위치 40% 혼합
const combined = calcDailyChangeScore(changePercent) * 0.6 + calc52WeekPosition(data) * 0.4;

// 52주 위치: 0(저점) ~ 100(고점)
function calc52WeekPosition(data) {
  return ((price - low52w) / (high52w - low52w)) * 100;
}

// 일간 변동률: -3%=0점, 0%=50점, +3%=100점
function calcDailyChangeScore(changePercent) {
  return (changePercent + 3) / 6 * 100;
}

// VIX: VIX 10=100점(탐욕), VIX 30+=0점(공포)
const vixScore = ((30 - vixPrice) / 20) * 100;

// 환율: 환율 상승 = 외자 유출 = 매도 우위
const fxScore = 50 - (changePercent * 40);

// 최종: 가중 합산 → 0~100점
```

#### 시장 레벨 판정 (7단계)
```typescript
function getMarketLevel(score: number) {
  if (score <= 15) return { level: 'extreme_fear', label: '극도의 공포', buyWeight: 1.0, sellWeight: 0.0 };
  if (score <= 30) return { level: 'fear', label: '공포', buyWeight: 0.8, sellWeight: 0.1 };
  if (score <= 40) return { level: 'caution', label: '경계', buyWeight: 0.6, sellWeight: 0.2 };
  if (score <= 60) return { level: 'neutral', label: '중립', buyWeight: 0.5, sellWeight: 0.5 };
  if (score <= 70) return { level: 'optimistic', label: '낙관', buyWeight: 0.4, sellWeight: 0.5 };
  if (score <= 85) return { level: 'greed', label: '탐욕', buyWeight: 0.2, sellWeight: 0.7 };
  return { level: 'extreme_greed', label: '극도의 탐욕', buyWeight: 0.0, sellWeight: 1.0 };
}
```

#### 가중 매수 점수 공식
```
가중 매수 점수 = AI 평균 점수 × 시장 buyWeight

예시) 시장 점수 47 (중립, buyWeight=0.5)
  - 만점(5.0) 종목 → 가중 2.5
  - 4.0점 종목 → 가중 2.0
  - 3.0점 종목 → 가중 1.5
```

---

### 모듈 3: 투자 판정 라벨 시스템

**역할**: 가중 매수 점수를 기반으로 사용자에게 직관적 투자 행동 지침 제공

```typescript
function getInvestmentVerdict(weightedScore: number) {
  if (weightedScore >= 3.5) return { label: '적극 매수', emoji: '🟢', color: 'emerald' };
  if (weightedScore >= 2.5) return { label: '분할 매수', emoji: '🔵', color: 'blue' };
  if (weightedScore >= 1.5) return { label: '관망', emoji: '🟡', color: 'yellow' };
  return { label: '매수 금지', emoji: '🔴', color: 'red' };
}
```

| 가중 매수 점수 | 판정 | 의미 |
|:---:|:---:|:---|
| 3.5+ | 🟢 적극 매수 | AI 만장일치 + 시장 우호적 |
| 2.5~3.4 | 🔵 분할 매수 | 좋은 종목이나 시장 부담, 나눠 매수 |
| 1.5~2.4 | 🟡 관망 | 투자 보류, 지켜보기 |
| 1.5 미만 | 🔴 매수 금지 | 시장 과열 또는 종목 매력 부족 |

---

### 모듈 4: AI 토론 시스템 (debate)

**역할**: 각 AI가 왜 이 종목을 추천했는지 채팅 형식으로 토론

#### 종목별 상세 메타데이터 (STOCK_DB)
```typescript
interface StockMeta {
  name: string;
  sector: string;
  thesis: string;      // 핵심 투자논리: "왜 이 종목을 사야 하는가"
  whyNow: string;      // 타이밍: "지금 왜 사야 하는가"
  drivers: string[];    // 핵심 성장 동력 (2-3개)
  risks: string[];      // 주요 리스크 (2개)
  catalysts: string[];  // 최근 카탈리스트 (2-3개)
  valuation: string;    // 밸류에이션 특성 (예: "PER 25배이나 수주잔고 60조 감안 시 적정")
  moat: string;         // 경쟁 우위/해자 (예: "K9 자주포 세계 점유율 50%")
}
```

#### 예시: 한화에어로스페이스
```typescript
{
  name: '한화에어로스페이스',
  sector: '방산/우주',
  thesis: 'NATO 방산 지출 확대와 폴란드 무장 현대화의 최대 수혜주. K9 자주포 세계 점유율 50%에 항공엔진까지 만드는 국내 유일 방산 종합 기업. 수주잔고 60조원으로 향후 수년간 매출 확보',
  whyNow: '유럽 방산 지출이 GDP 3%+로 확대되는 구조적 전환기. 폴란드 K9 1,000문 수주 확정 시 수주잔고 80조원+ 급증',
  drivers: ['K9 자주포 수출', '항공엔진', '우주발사체'],
  risks: ['방산 수주 변동성', '원자재 가격'],
  catalysts: ['폴란드 K9 1,000문 수주', '누리호 4차 발사', 'NATO 방산 지출 확대'],
  valuation: 'PER 25배이나 수주잔고 60조원 감안 시 적정',
  moat: '국내 유일 항공엔진 제조, K9 자주포 세계 시장 점유율 50%',
}
```

#### 3라운드 토론 구조

**Round 1 — 핵심 투자논리 제시** (각자 독립 분석)
- 클로드 📊: 밸류에이션/재무 관점에서 thesis + valuation + moat 분석
- 제미나인 🚀: 성장 모멘텀 관점에서 thesis + whyNow + catalysts 분석
- G.P. 테일러 🌍: 거시경제/매크로 관점에서 thesis + drivers + 글로벌 트렌드 분석

**Round 2 — 진짜 디베이트** (서로의 분석을 인용/반박)
- 클로드: "제미 나인이 폴란드 K9 수주를 강조했는데, 맞지만 주가에 얼마나 반영될지가 중요..."
- 제미나인: "클로드가 밸류에이션 우려를 했는데, 이런 해자 가진 기업에 싼 가격은 없어요..."
- G.P.: "클로드는 밸류에이션, 제미는 모멘텀. 두 관점 모두 맞고, 제가 보충할 건 수급 관점..."

**Round 3 — 최종 합의** (순위 확정 + 핵심 이유 요약)
- "✅ 1위 확정. 3명 만장일치. 추천 핵심 이유: [thesis]. 타이밍: [whyNow]"

#### 채팅 UI 구현 (DebateChat 컴포넌트)
- 타이핑 애니메이션 (8ms/char)
- "다음 대화 보기" 버튼으로 라운드별 진행
- 자동 스크롤
- AI 캐릭터 아바타 + 이름 + 역할 뱃지

---

### 모듈 5: AI 캐릭터 시스템

**역할**: 3개 AI에게 개성있는 캐릭터를 부여하여 사용자 경험 향상

```typescript
const AI_CHARACTERS = {
  claude: {
    name: '클로드 리',
    englishName: 'Claude Lee',
    role: '수석 밸류에이션 애널리스트',
    badges: ['밸류에이션', '재무분석', '리스크'],
    personality: '데이터 기반, 보수적, PER/PBR/ROE 수치에 집착',
    accuracy: '67.3%',
    totalAnalyses: 1467,
  },
  gemini: {
    name: '제미 나인',
    englishName: 'Gemi Nine',
    role: 'AI & 성장주 리서치 총괄',
    badges: ['AI', '성장주', '테크'],
    personality: '낙관적, 트렌드 중시, 기술 혁신에 열광',
    accuracy: '64.8%',
    totalAnalyses: 3891,
  },
  gpt: {
    name: 'G.P. 테일러',
    englishName: 'G.P. Taylor',
    role: '수석 장기전략 리스크 총괄',
    badges: ['매크로', '리스크', '최종 결정권'],
    personality: '신중, 거시경제 중심, 리스크-리턴 밸런스 중시',
    accuracy: '71.2%',
    totalAnalyses: 3891,
  },
};
```

---

## 🔌 API 엔드포인트

### 1. `/api/cron/daily-verdict` (GET)
- **역할**: 매일 자동으로 AI 합의 Top 5 생성
- **파라미터**: `date`, `slot` (morning/afternoon), `force`
- **프로세스**: 테마 선정 → 종목 필터링 → 실시간 가격 → 3 AI 병렬 분석 → 합산 → DB 저장

### 2. `/api/verdict` (GET)
- **역할**: 프론트엔드에서 오늘의 Top 5 조회
- **파라미터**: `date`
- **응답**: top5 (순위, 점수, 만장일치 여부), 실시간 가격 병합

### 3. `/api/market/sentiment` (GET)
- **역할**: 시장 공포-탐욕 지수 계산
- **데이터소스**: 네이버(KOSPI/KOSDAQ/환율) + Yahoo(S&P500/NASDAQ/VIX)
- **응답**: compositeScore(0-100), level, buyWeight, indicators[]

### 4. `/api/debate/history` (GET)
- **역할**: 종목별 AI 토론 내용 조회
- **파라미터**: `symbol`, `date`
- **응답**: 3라운드 토론 (실제 debate_log 또는 종목 메타데이터 기반 생성)

---

## 📱 프론트엔드 UI 구성

### 메인 페이지 레이아웃 (위→아래)
1. **AI 캐릭터 카드** (3장) — 프로필 사진, 이름, 역할, 적중률
2. **오늘의 테마** + **분석 날짜** 배지
3. **시장 타이밍 시그널** — 공포-탐욕 게이지, 매수/매도 구간, 가중 매수 점수 예시
4. **Top 5 종목 카드** — 순위, 종목명, 만장일치 뱃지, AI별 점수, 가중매수점수, 투자판정 라벨
5. **AI Pick 캘린더** — 월별 추천 내역 달력 표시
6. **AI 일일 추천** — 전체 요약, 각 종목 간단 분석

### 종목 상세 모달
1. **헤더** — 순위, 종목명, 코드, 평균 점수
2. **만장일치 뱃지** (3명 모두 선정 시)
3. **각 AI별 초기 분석** — 클로드/제미/GPT 각각의 분석 코멘트
4. **AI 토론 과정** — 채팅 스타일 3라운드 디베이트
5. **점수 산정 기준** + **투자 판정 범례**

### 모바일 최적화
- Top 5 카드: 2행 레이아웃 (종목+뱃지 / AI점수+가중매수)
- 모달: 하단 슬라이드업 진입
- 안드로이드 뒤로가기: history.pushState로 모달 상태 관리

---

## 🔐 환경변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI (OpenRouter - 3개 모델 한 곳에서 호출)
OPENROUTER_API_KEY=sk-or-...

# 실시간 주가 (한국투자증권)
KIS_APP_KEY=...
KIS_APP_SECRET=...
KIS_ACCOUNT_NO=...

# 보안
CRON_SECRET=...
```

---

## 🚀 구현 순서 (추천)

1. **DB 스키마** 생성 (verdicts, predictions 테이블)
2. **OpenRouter LLM 유틸** 구현 (3개 모델 호출 래퍼)
3. **daily-verdict API** 구현 (종목 데이터 + AI 분석 + 합산)
4. **verdict API** 구현 (프론트엔드 조회용)
5. **market-sentiment API** 구현 (공포-탐욕 지수)
6. **프론트엔드** 구현 (Top 5 카드 + 시장 시그널)
7. **debate API** 구현 (종목 메타데이터 + 토론 생성)
8. **채팅 UI** 구현 (타이핑 애니메이션 + 라운드별 진행)
9. **투자 판정 라벨** 통합
10. **모바일 최적화**

---

## 💡 핵심 설계 원칙

1. **AI 독립성**: 3개 AI는 서로의 결과를 모르고 독립 분석 → 합의에 의미 부여
2. **시장 보정**: AI 점수가 아무리 높아도 시장이 과열이면 매수 금지 → 리스크 관리
3. **투자논리 중심**: 종목을 단순 점수가 아니라 "왜 사야 하는가"를 thesis로 설명
4. **캐릭터 차별화**: 같은 종목이라도 밸류에이션/성장/매크로 3가지 관점에서 분석
5. **실시간 데이터**: 시장 지표와 개별 종목 가격을 실시간 반영
