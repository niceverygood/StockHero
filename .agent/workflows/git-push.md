---
description: 작업 완료 후 자동으로 git add, commit, push 실행
---

# 작업 완료 후 Git Push

작업이 완료되면 아래 단계를 자동으로 실행합니다.

// turbo-all

1. 변경사항 확인
```bash
cd /Users/seungsoohan/StockHero && git status --short
```

2. 변경사항이 있으면 스테이징
```bash
cd /Users/seungsoohan/StockHero && git add -A
```

3. 변경 내용을 요약하여 한국어 커밋 메시지 작성 후 커밋
```bash
cd /Users/seungsoohan/StockHero && git commit -m "<변경 내용 요약>"
```

4. main 브랜치에 푸시
```bash
cd /Users/seungsoohan/StockHero && git push origin main
```

## 주의사항
- 커밋 메시지는 `feat:`, `fix:`, `refactor:` 등 conventional commit 형식을 사용
- 커밋 메시지 본문은 한국어로 작성
- 변경사항이 없으면 푸시하지 않음
- 매 작업 완료 시 자동으로 이 워크플로우를 실행
