# StockHero

## 프로젝트 개요
AI 3개(Claude, Gemini, GPT)가 교차검증하는 주식분석 서비스.
리딩방 운영자(리더)가 자기 채널에 뿌리는 화이트라벨 AI 주식 비서.

## 기술 스택
- Backend: FastAPI (Python 3.11+) + SQLAlchemy 2.0 + Celery
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- DB: PostgreSQL + Redis
- 결제: 토스페이먼츠
- 메시징: Telegram Bot API
- 배포: Docker Compose

## 핵심 기능
1. 트리플 AI 교차검증 (Claude=펀더멘탈, Gemini=데이터트렌드, GPT=시나리오)
2. 합의 등급: STRONG(만장일치) / MODERATE(2/3) / CONFLICT(충돌)
3. 4단계 구독: Free(₩0) / Lite(₩4,900) / Basic(₩14,900) / Pro(₩39,900)
4. 리더 수익쉐어 40%
5. 텔레그램 봇 연동

## 코딩 규칙
- Python: Black 포맷팅, type hints 필수
- TypeScript: strict mode
- API: RESTful, Pydantic v2 스키마
- 모든 AI 호출은 async, 비용 추적 필수
- 환경변수는 .env, 하드코딩 금지
