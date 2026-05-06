# Execution Plan

## Task Title
- TD-005-A: 구형 submission 채점 시 created_at fallback 적용

## Request Summary
- exam_date 추가 이전에 제출된 데이터는 profile에 exam_date 없음
- 채점 시 exam_date → submission.created_at → date.today() 순으로 fallback
- 현재 개발 중 데이터라 구형 데이터 정합성 문제 없음

## Goal
- 구형 submission 채점 시 date.today() 대신 제출 시각(created_at) 기준 나이 계산
- 신규 submission은 exam_date 그대로 사용 (변경 없음)

## Preflight Checklist
- [x] AGENTS.md 확인
- [x] exec-plan 먼저 작성
- [x] 관련 코드 탐색 완료
- [x] UI 수정 없음 → 스크린샷 불필요
- [x] 검증 방법 정의

## 변경 대상

**파일**: `app/services/scoring/submissions.py`
**함수**: `_load_submission_scoring_bundle` (line 252)

profile에서 exam_date 꺼낸 뒤, 없으면 submission.created_at.date()를 주입:

```python
profile = answers_payload.get("profile", {})
if not isinstance(profile, dict):
    profile = {}

# exam_date 없는 구형 데이터: submission.created_at을 fallback으로 주입
if not profile.get("exam_date") and getattr(submission, "created_at", None):
    profile = {**profile, "exam_date": submission.created_at.date().isoformat()}
```

## 검증 방법
- exam_date 없는 profile → submission.created_at.date()가 as_of로 사용되는지 확인
- exam_date 있는 profile → created_at 무시하고 exam_date 그대로 사용되는지 확인

## Related Documents
- [docs/technical-debt.md](/Users/mac/insight_/2.0-modular/docs/technical-debt.md)
- [AGENTS.md](/Users/mac/insight_/2.0-modular/AGENTS.md)
