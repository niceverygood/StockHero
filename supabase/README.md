# StockHero Database Setup Guide

## Supabase 데이터베이스 설정 방법

### 1. Supabase 프로젝트 설정

1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. 프로젝트 선택 또는 새 프로젝트 생성
3. Settings > API에서 다음 값 복사:
   - `Project URL` → `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `.env.local`의 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `.env.local`의 `SUPABASE_SERVICE_ROLE_KEY`

### 2. 데이터베이스 스키마 적용

1. Supabase Dashboard → SQL Editor로 이동
2. `supabase/schema.sql` 파일의 전체 내용을 복사
3. SQL Editor에 붙여넣기
4. "Run" 버튼 클릭

**또는** Supabase CLI 사용:

```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인
supabase login

# 마이그레이션 실행
supabase db push
```

### 3. Storage 버킷 설정 (포트폴리오 스크린샷용)

1. Supabase Dashboard → Storage로 이동
2. "New bucket" 클릭
3. 버킷 이름: `portfolio-screenshots`
4. Public bucket: ✅ 체크
5. "Create bucket" 클릭

### 4. 환경 변수 설정

`.env.local` 파일을 프로젝트 루트에 생성:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI APIs
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_AI_API_KEY=your_google_ai_key
```

### 5. Google OAuth 설정

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 새 프로젝트 또는 기존 프로젝트 선택
3. APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client IDs
4. Application type: Web application
5. Authorized redirect URIs 추가:
   - `https://YOUR_SUPABASE_PROJECT_URL/auth/v1/callback`
6. Client ID와 Client Secret 복사
7. Supabase Dashboard → Authentication → Providers → Google
8. Client ID와 Client Secret 입력 후 Enable

### 스키마 개요

#### 핵심 테이블

| 테이블 | 설명 |
|--------|------|
| `symbols` | 주식 종목 정보 |
| `debate_sessions` | AI 토론 세션 |
| `debate_messages` | 토론 메시지 |
| `verdicts` | 일일 Top 5 판정 |
| `predictions` | AI 예측 |
| `outcomes` | 실제 결과 |

#### 사용자 기능 테이블

| 테이블 | 설명 |
|--------|------|
| `user_portfolios` | 사용자 포트폴리오 |
| `user_portfolio_holdings` | 포트폴리오 보유종목 |
| `user_debate_history` | 토론 시청 기록 |
| `user_consultations` | AI 상담 기록 |
| `user_watchlist` | 관심종목 |
| `user_preferences` | 사용자 설정 |

#### 커뮤니티 테이블

| 테이블 | 설명 |
|--------|------|
| `user_profiles` | 사용자 프로필 |
| `user_follows` | 팔로우 관계 |
| `posts` | 게시글 |
| `post_likes` | 좋아요 |
| `post_comments` | 댓글 |
| `notifications` | 알림 |

### 문제 해결

#### RLS 정책 오류
- 서비스 역할 키가 올바르게 설정되었는지 확인
- API 라우트에서 `createClient` 함수 사용 확인

#### 인증 오류
- 쿠키가 올바르게 설정되었는지 확인
- OAuth 리다이렉트 URL 설정 확인

#### 테이블 미존재 오류
- `schema.sql` 전체를 다시 실행
- Supabase Dashboard에서 테이블 생성 확인








