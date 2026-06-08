# Execution Plan

## Task Title
- 테스트 내담자 hard purge 기준 수립 및 정리

## Request Summary
- 테스트 실시 과정에서 쌓인 불필요한 내담자와 응답 데이터를 RDS에서 hard purge한다.
- 삭제 전 연쇄 영향 테이블을 확인하고, dry-run으로 대상과 건수를 먼저 검증한다.

## Goal
- `admin_client` 기준 hard purge 시 영향을 받는 테이블을 명시한다.
- 삭제 후보 내담자를 RDS에서 확인한다.
- 확정된 대상에 대해 dry-run count를 산출한 뒤, 사용자 확인 후 실제 삭제한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] DB 기준 문서 확인: `docs/database/runtime-db.md`
- [x] RDS 연결 확인
- [ ] 삭제 대상 기준 확정
- [ ] dry-run 결과 확인
- [ ] 실제 purge 실행
- [ ] purge 후 잔여 참조 검증

## Initial Hypothesis
- 현재 RDS FK는 대부분 `ON DELETE NO ACTION`이므로 DB 자동 cascade에 맡기면 안 된다.
- `submission_scoring_result`, `admin_client_identity_review` 등 제출/채점 관련 테이블을 먼저 정리해야 한다.
- 테스트 데이터는 최근 생성 내담자, 테스트성 이름, 특정 검사 링크/검사 ID 기준으로 식별할 수 있을 가능성이 높다.

## Initial Plan
1. 최근 내담자/응답 데이터를 조회해 삭제 후보를 제시한다.
2. 사용자가 삭제할 `client_id` 목록 또는 조건을 확정한다.
3. 확정 조건으로 dry-run count를 산출한다.
4. 사용자 확인 후 transaction으로 delete를 실행한다.
5. 관련 테이블 잔여 참조를 확인한다.

## Progress Updates
### Update 1
- Time: 2026-06-04
- Change: hard purge는 실제 삭제 전 dry-run으로 대상 건수를 확인해야 한다는 원칙을 정했다.
- Reason: RDS hard delete는 되돌리기 어렵고 FK가 자동 cascade로 설정되어 있지 않기 때문이다.

### Update 2
- Time: 2026-06-04
- Change: 실시링크 토큰 기준으로 1차 purge를 실행했으나 제출 완료 내담자가 누락된 것을 확인했다.
- Reason: `admin_custom_test_submission.access_token`은 실시링크 토큰이 아니라 결과 조회용 토큰으로 저장되기 때문이다.

### Update 3
- Time: 2026-06-04
- Change: 링크의 `admin_custom_test_id=29`와 자동 생성 source(`assessment_link_auto`, `assessment_link_secondary`) 기준으로 남은 20명을 추가 hard purge했다.
- Reason: 관리자 내담자 관리 화면에 남아 있던 `TEST`, `부유민`, `부일한` 등은 제출 완료 내담자라 token 직접 조회 기준에서 빠졌기 때문이다.

### Update 4
- Time: 2026-06-04
- Change: 삭제 과정, 실패 원인, dry-run 의미, 실시링크 기준 대상 산정, 삭제 순서, 검증 쿼리를 `docs/database/client-hard-purge.md`로 문서화했다.
- Reason: 같은 유형의 RDS hard purge를 반복할 때 submission token과 실시링크 token을 혼동하지 않도록 하기 위함이다.

## Result
- 실시링크 `Gl2LASqVIs9NoOFZQKACPeAD8CHHFe5r`의 자동 생성/보조 생성 내담자를 hard purge했다.
- 1차 삭제: draft 중심 대상 14명 삭제.
- 2차 삭제: 제출 완료/배정 잔여 대상 20명 삭제.
- 기존 수동 내담자 `id=1 부유민`은 자동 생성 대상이 아니므로 삭제하지 않았다.
- hard purge 가이드를 `docs/database/client-hard-purge.md`에 저장했다.

## Verification
- Checked:
  - RDS 연결 가능
  - FK `ON DELETE NO ACTION` 확인
  - 1차 purge 후 대상 client/draft/submission 잔여 0 확인
  - 2차 purge 후 자동 생성/보조 생성 내담자 잔여 0 확인
  - `custom_test_id=29` 제출 잔여 0 확인
  - 문서 허브 `docs/database/README.md`에 hard purge 가이드 링크 추가
- Not checked:
  - 관리자 화면 브라우저 새로고침 후 목록 시각 확인

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 1차 purge 기준을 실시링크 토큰과 `admin_custom_test_submission.access_token`의 동일성으로 잡았는데, 실제 제출 row에는 결과 조회용 토큰이 저장된다.

### Why
- 실시링크 토큰은 access link와 draft에는 남지만, 제출 완료 시 submission에는 별도 report access token이 저장된다.

### Next Time
- 특정 실시링크 데이터 정리는 link token으로 `admin_custom_test_id`를 먼저 찾고, 이후 `admin_custom_test_id`와 자동 생성 source/배정/제출 기준으로 target client를 산정한다.

## Related Documents
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [docs/database/runtime-db.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/runtime-db.md)
- [docs/database/client-hard-purge.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/client-hard-purge.md)
