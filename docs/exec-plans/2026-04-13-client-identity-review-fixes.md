# Execution Plan

## Task Title
- 내담자 검증/신규 생성/병합 리뷰 후 수정

## Request Summary
- 내담자 검증, 신규 생성, 동명이인, 여러 명 선택 시나리오를 DB 쓰기 기반으로 코드 리뷰한 뒤 발견된 문제를 수정한다.

## Goal
- 제출 API에서 선택된 `client_id`가 인적사항 전체와 다시 일치하는지 검증한다.
- 동명이인 신규 선택 후 사후 검토에서 기존 내담자로 병합할 때 임시 내담자의 배정/실시 로그가 고아 데이터로 남지 않게 한다.

## Initial Hypothesis
- validate-profile 단계는 주요 분기를 처리하지만, submit 단계에서 `client_id`를 신뢰하는 분기가 일부 검증을 생략하고 있다.
- identity review 병합은 submission/scoring 재링크만 처리하고, 기존 내담자 삭제 경로의 cleanup을 재사용하지 않아 관련 행이 남는다.

## Initial Plan
1. 제출 서비스에서 선택된 내담자의 이름, 성별, 생년월일을 profile과 다시 비교한다.
2. 동명이인 기존 선택이면 제출 payload의 후보 목록 안에 `client_id`가 있는지도 확인한다.
3. identity review merge에서 임시 내담자를 삭제하기 전에 임시 내담자 배정/로그를 정리한다.
4. compile과 DB 쓰기 시나리오로 회귀 검증한다.

## Progress Updates
### Update 1
- Time: 2026-04-13
- Change: 제출 단계와 병합 단계의 수정 범위를 서비스 레이어로 제한한다.
- Reason: 문제 재현 지점이 API 입력 처리 이후 서비스 로직에 있고, UI 수정 없이 서버에서 방어하는 것이 우선이다.

### Update 2
- Time: 2026-04-13
- Change: 제출 시 선택된 내담자의 이름/성별/생년월일을 profile과 다시 비교하고, 동명이인 기존 선택이면 후보 목록 안의 `client_id`인지도 확인한다.
- Reason: validate-profile을 통과한 뒤 submit payload만 조작해도 잘못된 배정 내담자로 제출될 수 있는 경로를 막기 위해서다.

### Update 3
- Time: 2026-04-13
- Change: identity review merge에서 임시 내담자 삭제 전에 임시 내담자의 실시 로그와 검사 배정을 삭제한다.
- Reason: submission/scoring은 target으로 재링크되지만 배정/로그 FK cascade가 없어 고아 데이터가 남는 것을 DB 시나리오로 확인했기 때문이다.

## Result
- `submit_custom_test_by_access_link`의 `client_id` 분기에서 선택된 내담자와 입력 profile을 다시 검증하도록 수정했다.
- `resolve_identity_review_merge`에서 임시 내담자 관련 로그/배정을 정리한 뒤 임시 내담자를 삭제하도록 수정했다.

## Verification
- Checked: `.venv/bin/python -m compileall app/services/admin/assessment_links.py app/services/admin/identity_reviews.py`
- Checked: 이름은 같지만 성별/생년월일이 다른 배정 내담자 `client_id` 제출 시 403으로 차단되고 submission/scoring/log가 생성되지 않음을 확인했다.
- Checked: 동명이인 기존 선택에서 후보 목록 밖 `client_id` 제출 시 403으로 차단되고 submission/scoring/log가 생성되지 않음을 확인했다.
- Checked: identity review merge 후 임시 내담자는 삭제되고 submission/scoring은 target client로 재링크되며, 임시 내담자의 assignment/log 고아 행이 0건임을 확인했다.
- Checked: 테스트용 `제출검증수정*`, `후보검증수정*`, `리뷰병합수정*` 행과 토큰 잔여가 0건임을 확인했다.
- Not checked: 브라우저 UI 스크린샷 검증은 수행하지 않았다. 이번 변경은 서버 서비스 검증 로직에 한정된다.

## Retrospective
### Classification
- `Execution Judgment Problem`

### What Was Wrong
- 동명이인/신규 내담자 흐름을 validate-profile 단계 위주로 보면서 submit 단계의 방어 검증이 부족했다.
- 병합 처리에서 submission/scoring 재링크는 했지만, 임시 내담자 삭제 전 관련 배정/로그 정리를 누락했다.

### Why
- validate-profile 응답값을 클라이언트가 그대로 보낼 것이라는 흐름 가정에 의존했다.
- 직접 `AdminClient`를 삭제하는 병합 경로가 기존 `delete_admin_client`의 cleanup 순서를 재사용하지 않았다.

### Next Time
- 단계별 검증 API가 있어도 최종 쓰기 API에서 동일한 검증을 다시 적용한다.
- 클라이언트 삭제 또는 병합 경로는 기존 삭제 서비스의 관련 행 cleanup 목록을 먼저 대조한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
