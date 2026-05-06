# Execution Plan

## Task Title
- TD-008: 매칭 실패 에러 메시지에 원인 검사명 포함

## Request Summary
- 번들 검사 실시 중 매칭 실패 시 어느 검사 때문인지 알 수 없음
- test_id를 에러 detail에 포함

## Goal
- "입력한 인적정보와 일치하는 검사 구간이 없습니다." → "(PAT-2) 입력한 인적정보와 일치하는 검사 구간이 없습니다."

## Preflight Checklist
- [x] AGENTS.md 확인
- [x] exec-plan 먼저 작성
- [x] 관련 코드 탐색 완료
- [x] UI 수정 없음 → 스크린샷 불필요

## 변경 대상

**파일**: `app/services/admin/assessment_links.py`

`_select_sub_test_variant_for_profile`에 `test_id` 파라미터 추가:
```python
def _select_sub_test_variant_for_profile(variants, profile, *, test_id: str = "") -> dict:
    prefix = f"({test_id}) " if test_id else ""
    if not variants:
        raise HTTPException(status_code=400, detail=f"{prefix}실시 가능한 검사 구간이 없습니다.")
    ...
    if not matches:
        raise HTTPException(status_code=400, detail=f"{prefix}입력한 인적정보와 일치하는 검사 구간이 없습니다.")
```

`_resolve_active_variants`에서 호출 시 test_id 전달:
```python
active_variant = _select_sub_test_variant_for_profile(variants, profile or {}, test_id=test_id)
```

## Related Documents
- [docs/technical-debt.md](/Users/mac/insight_/2.0-modular/docs/technical-debt.md)
- [AGENTS.md](/Users/mac/insight_/2.0-modular/AGENTS.md)
