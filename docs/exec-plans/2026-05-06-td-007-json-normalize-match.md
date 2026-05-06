# Execution Plan

## Task Title
- TD-007: fetch_parent_item_bundle / fetch_parent_scale_struct exact string match 정규화

## Request Summary
- sub_test_json 비교 시 json.dumps(sort_keys=False) 의존 → key 순서 변경 시 miss → 404
- 비교 전 양쪽 모두 json.loads → json.dumps(sort_keys=True) 정규화로 안전하게 수정

## Goal
- _condition_intersection key 삽입 순서가 달라져도 조회 miss 없음
- 과거 저장 데이터와 현재 재계산 데이터 사이 직렬화 차이 무력화

## Preflight Checklist
- [x] AGENTS.md 확인
- [x] exec-plan 먼저 작성
- [x] 관련 코드 탐색 완료 (parent_test_repository.py lines 560~589)
- [x] UI 수정 없음 → 스크린샷 불필요
- [x] 검증 방법 정의

## 변경 대상

**파일**: `app/repositories/parent_test_repository.py`

`_normalize_json_for_match` 헬퍼 추가 후 두 함수에서 사용:

```python
def _normalize_json_for_match(raw: str) -> str:
    try:
        return json.dumps(json.loads(raw), sort_keys=True, ensure_ascii=False)
    except (TypeError, json.JSONDecodeError):
        return raw.strip()
```

`fetch_parent_scale_struct`, `fetch_parent_item_bundle` 비교 라인 수정:
```python
# 변경 전
if str(row.sub_test_json or "").strip() != target_json:
# 변경 후
if _normalize_json_for_match(str(row.sub_test_json or "")) != _normalize_json_for_match(target_json):
```

## 검증 방법
- key 순서가 다른 두 JSON 문자열이 동일 내용이면 매칭 성공 확인
- 정상 프로필로 PAT-2 문항 요청 → 기존과 동일하게 문항 반환 확인

## Related Documents
- [docs/technical-debt.md](/Users/mac/insight_/2.0-modular/docs/technical-debt.md)
- [AGENTS.md](/Users/mac/insight_/2.0-modular/AGENTS.md)
