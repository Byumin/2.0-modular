# Execution Plan

## Task Title
- SEAT/PCS RDS 업로드 데이터 기반 검사 생성 및 실시 시뮬레이션

## Request Summary
- SEAT와 PCS 검사 데이터가 RDS에 업로드된 상태에서 관리자 검사 생성부터 수검자 검사 실시/제출까지 문제가 없는지 검증한다.

## Goal
- RDS 기준으로 SEAT/PCS 원본 데이터가 생성 API와 실시 API에서 필요한 형태로 조회되는지 확인한다.
- 실제 커스텀 검사 생성, 접근 링크 생성, 프로필 검증, 문항 로딩, 제출 저장 흐름을 가능한 범위에서 시뮬레이션한다.
- 확인 결과와 미검증 항목을 남긴다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: `ARCHITECTURE.md`
  - DB: `docs/database/runtime-db.md`, `docs/database/schema-overview.md`
  - UI/디자인: 해당 없음
  - 문서 체계: 해당 없음
  - 설명/디버깅: 해당 없음
  - 코드 정리 산출물: 해당 없음
- [x] 운영/실행 서버 DB가 필요한 작업이면 `docs/database/runtime-db.md`의 DB 조회 전 확인 규칙 적용
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- SEAT/PCS가 parent item/scale/norm 계열 테이블에 `test_id` 기준으로 정상 적재되어 있고, `scale_struct`와 `sub_test_json` 조건이 생성 서비스의 정규화 로직과 호환되면 생성과 실시 문항 로딩은 통과한다.
- 현재 채점 엔진 registry에 SEAT/PCS scorer가 없으면 제출 저장은 가능해도 제출 후 채점까지는 별도 구현이 필요할 수 있다.

## Initial Plan
1. 생성/실시 라우터와 서비스 코드에서 필요한 데이터 계약을 확인한다.
2. RDS 연결 기준을 명시하고 SEAT/PCS 원본 데이터 존재, 조건/척도/문항 번들 조회 가능 여부를 확인한다.
3. 테스트 관리자 세션을 사용해 SEAT/PCS 커스텀 검사 생성, 접근 링크 생성, 프로필 검증, 문항 로딩, 제출 저장을 시뮬레이션한다.
4. 생성된 검증용 row와 제출 row를 정리하거나, 정리하지 못한 경우 ID를 기록한다.
5. 결과와 미검증 항목을 정리한다.

## Progress Updates
### Update 1
- Time: 2026-06-22
- Change: 초기 문서와 핵심 라우터/스키마를 확인했다.
- Reason: 생성/실시 시뮬레이션의 API 계약을 먼저 확정하기 위해서다.

## Result
- 진행 중

## Verification
- Checked: 진행 중
- Not checked: 진행 중

## Retrospective
### Classification
- 진행 중

### What Was Wrong
- 진행 중

### Why
- 진행 중

### Next Time
- 진행 중

## Related Documents
- [AGENTS.md](../../AGENTS.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [docs/database/runtime-db.md](../database/runtime-db.md)
- [docs/database/schema-overview.md](../database/schema-overview.md)
