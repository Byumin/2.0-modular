# Execution Plan

## Task Title
- selected_scales_json informant별 분리 (child_test.sub_test_json은 합침 유지)

## Request Summary
- child_test.sub_test_json → informant 합친 채 유지 (인적사항 필드 감지용)
- child_test.selected_scales_json → informant별 분리 (라우팅 표지판 역할)

## Goal
- PAT-2 기준 selected_scales_json이 6개 → 18개 (6 age_range × 3 informant)
- sub_test_json은 6개 그대로
- 프로필 매칭 시 informant가 실질적으로 variant 선택에 영향
- fetch_parent_item_bundle/fetch_parent_scale_struct가 informant-specific 조회 가능

## Preflight Checklist
- [x] AGENTS.md 확인
- [x] exec-plan 먼저 작성
- [x] 관련 코드 탐색 완료 (parent_test_repository.py, custom_tests.py, schema_migrations.py)
- [ ] UI 수정 없음 → 스크린샷 불필요
- [x] 검증 방법 정의

## Initial Plan
1. `app/repositories/parent_test_repository.py` - `_condition_group_key`: informant를 key에 포함
2. `app/services/admin/custom_tests.py` - `_build_structured_sub_test_json`: informant 재병합

## Result
- `app/repositories/parent_test_repository.py` - `_condition_group_key`: informant 포함
- `app/services/admin/custom_tests.py` - `_build_structured_sub_test_json`: informant 재병합

## Verification
- Checked:
  - `_build_records_for_test("PAT-2")` → 18개 (informant별 분리) ✓
  - `_build_structured_sub_test_json` → 6개 (informant 재병합) ✓
- Not checked:
  - E2E 실시 흐름 (PAT-2 아직 app.db에 없음)
  - startup migration 후 기존 child_test 행 갱신 여부

## Related Documents
- [AGENTS.md](/Users/mac/insight_/2.0-modular/AGENTS.md)
- [docs/exec-plans/README.md](/Users/mac/insight_/2.0-modular/docs/exec-plans/README.md)
