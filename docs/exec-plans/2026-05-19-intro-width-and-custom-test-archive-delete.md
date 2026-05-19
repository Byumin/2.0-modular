# Execution Plan

## Task Title
- 검사 안내 화면 폭 확장 및 커스텀 검사 보존형 삭제

## Request Summary
- 수검자 검사 안내 화면의 글래스 카드 좌우 폭을 더 넓힌다.
- 검사 관리 화면에서 생성한 검사를 삭제 가능하게 하되, 해당 검사로 실시했던 결과, 제출 원본, 내담자, 동의 기록, 동일인 검토 기록은 삭제하지 않는다.

## Goal
- 안내 화면 content/card 폭을 기존보다 넓혀 문구 영역을 여유 있게 보이게 한다.
- 검사 삭제는 hard delete가 아니라 `child_test` soft delete로 처리한다.
- 삭제된 검사는 관리자 검사 목록과 운영 목록에서 제외한다.
- 기존 실시 결과/제출/동의/내담자/검토 기록은 보존한다.
- 삭제된 검사의 active 실시 링크는 비활성화해 새 실시 진입을 막는다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: `ARCHITECTURE.md`, 관련 소스 직접 확인
  - DB: `docs/database/runtime-db.md`
  - UI/디자인: `DESIGN.md`, `QUALIT_SCORE.md`
  - 문서 체계: 기존 실행계획 규칙 확인
  - 설명/디버깅: 해당 없음
  - 코드 정리 산출물: 해당 없음
- [x] 운영 DB가 필요한 작업이면 루트 `modular.db` 기준 확인: 운영 DB는 RDS PostgreSQL 기준이며 startup 보정으로 컬럼 추가
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- 안내 화면 폭은 `IntroStep`의 `max-w-[620px]`가 제한하고 있으므로 `760px` 수준으로 확장하면 된다.
- 현재 삭제가 안 되는 이유는 `child_test` hard delete가 제출/링크/동의/채점 등 FK 참조와 충돌하기 때문이다.
- 데이터 보존 요구사항에 맞게 `child_test.is_deleted`, `child_test.deleted_at`를 추가하고 목록 조회에서 제외하는 방식이 가장 안전하다.

## Initial Plan
1. `IntroStep`의 header/main max width와 설명 max width를 확장한다.
2. `AdminCustomTest` 모델에 `is_deleted`, `deleted_at`를 추가한다.
3. startup schema migration에 `child_test` soft delete 컬럼 보정 함수를 추가한다.
4. 검사 목록 조회 repository에서 `is_deleted = false`만 반환한다.
5. 삭제 서비스는 `child_test` row 삭제 대신 soft delete 처리하고 active link를 비활성화한다.
6. 프론트 삭제 확인 문구와 실패 처리 UX를 보완한다.
7. 빌드/py_compile/Playwright/API 검증을 실행하고 결과를 기록한다.

## Progress Updates
### Update 1
- Time: 2026-05-19
- Change: 실행계획 작성.
- Reason: UI 변경과 DB/삭제 정책 변경이 함께 있으므로 작업 전 기준을 명확히 남긴다.

### Update 2
- Time: 2026-05-19
- Change: `IntroStep`의 header/main 최대 폭을 `760px`로 늘리고 설명 문단 폭도 확장했다.
- Reason: 검사 안내 화면의 글래스 카드 문구 영역을 더 넓게 보이게 하기 위해서다.

### Update 3
- Time: 2026-05-19
- Change: `child_test`에 `is_deleted`, `deleted_at` 모델/마이그레이션을 추가하고, 검사 목록 조회에서 삭제된 검사를 제외하도록 했다.
- Reason: 제출/결과/동의/내담자/검토 기록을 보존하면서 관리 목록에서는 삭제된 것처럼 처리하기 위해서다.

### Update 4
- Time: 2026-05-19
- Change: 삭제 서비스가 hard delete 대신 soft delete와 active 실시 링크 비활성화를 수행하도록 바꿨다.
- Reason: 삭제된 검사로 신규 실시가 진행되는 것은 막되 기존 데이터 참조는 유지해야 하기 때문이다.

### Update 5
- Time: 2026-05-19
- Change: startup 검증 중 `is_deleted` 컬럼이 없는 상태에서 PostgreSQL boolean 보정이 먼저 실행되는 문제를 수정했다.
- Reason: 컬럼 추가 보정 함수가 실행되기 전에는 boolean 타입 보정을 건너뛰어야 하기 때문이다.

### Update 6
- Time: 2026-05-19
- Change: 더 이상 사용하지 않는 커스텀 검사 hard delete repository 함수들을 제거했다.
- Reason: 보존형 삭제 정책과 충돌하는 삭제 경로가 남아 있지 않게 하기 위해서다.

## Result
- 검사 안내 화면의 header/main content 최대 폭을 `760px`로 확장하고 설명 문단 폭을 `640px`로 확장했다.
- `child_test`에 `is_deleted`, `deleted_at` 보존형 삭제 상태를 추가했다.
- 관리자 검사 목록/상세/내담자 배정 조회는 soft delete된 검사를 제외한다.
- 검사 삭제는 `child_test`를 실제 삭제하지 않고 `is_deleted=true`, `deleted_at=현재시각`으로 표시한다.
- 삭제 시 active 실시 링크는 비활성화한다.
- 제출 원본, 채점 결과, 내담자, 동의 기록, 동일인 검토 기록은 삭제하지 않는다.

## Verification
- Checked:
- `.venv/bin/python -m py_compile app/db/models.py app/db/schema_migrations.py app/main.py app/repositories/custom_test_repository.py app/repositories/client_repository.py app/services/admin/custom_tests.py` 통과
- `npm run build:frontend` 통과
- FastAPI startup 통과 및 `child_test.is_deleted`, `child_test.deleted_at` 컬럼 보정 확인
- 통합 검증 스크립트 통과:
  - 검사 생성
  - 실시 링크 생성
  - 프로필 등록/검증
  - 제출 생성
  - Playwright로 안내 화면 진입 및 글래스 카드 폭 확인
  - 삭제 API 실행
  - 삭제 후 관리자 검사 목록에서 제외 확인
  - 삭제 후 검사 상세 `404` 확인
  - 삭제 후 실시 링크 `404` 확인
  - 삭제 후 제출 결과 목록에 기존 submission이 남아 있음 확인
- 스크린샷: `artifacts/screenshots/intro-width-archive-delete-24.png`
- Not checked:
- 모바일 폭 화면은 별도 스크린샷으로 확인하지 않음. 변경은 max-width 확장이며 모바일 `w-full px-4` 흐름은 유지한다.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 기존 삭제는 `child_test` hard delete라 FK 참조가 있는 제출/링크/채점/동의 데이터와 충돌할 수 있고, 요구사항상 기존 결과 보존에도 맞지 않았다.
- startup 최초 실행 시 `is_deleted` 컬럼 추가 전에 PostgreSQL boolean 보정이 먼저 default 설정을 시도하는 문제가 있었다.

### Why
- 삭제 정책이 데이터 보존형 archive가 아니라 실제 row 삭제로 구현되어 있었다.
- boolean 보정 함수가 컬럼 존재 여부와 default 설정을 분리하지 않았다.

### Next Time
- 운영 데이터가 연결된 도메인의 삭제 기능은 먼저 archive/soft delete 여부와 링크 비활성화 정책을 명시한 뒤 구현한다.

## Related Documents
- [AGENTS.md](../../AGENTS.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [DESIGN.md](../../DESIGN.md)
- [QUALIT_SCORE.md](../../QUALIT_SCORE.md)
- [docs/database/runtime-db.md](../database/runtime-db.md)
- [docs/exec-plans/README.md](README.md)
