# Execution Plan

## Task Title
- DB 런타임 확인 반복 실수 방지 문서화

## Request Summary
- 로컬 DB와 운영/실행 서버 DB를 혼동해 같은 확인 실수를 반복하지 않도록 규칙을 문서에 반영한다.

## Goal
- DB 조회 전 실행 서버의 실제 DB와 셸 명령의 DB 설정을 분리해서 확인하도록 source-of-truth에 명시한다.
- 신규 문서를 늘리지 않고 기존 DB 운영 문서에 흡수한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - [x] DB: `docs/database/runtime-db.md`
  - [x] 문서 체계: `docs/doc-governance.md`
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- DB 운영 기준의 source-of-truth는 `docs/database/runtime-db.md`이므로 반복 실수 방지 규칙도 이 문서에 두는 것이 중복을 줄인다.

## Initial Plan
1. `docs/database/runtime-db.md`에 DB 조회 전 확인 절차와 금지 패턴을 추가한다.
2. 필요 시 허브 문서는 링크만 유지하고 본문 중복은 만들지 않는다.
3. 문서 변경 diff를 확인한다.

## Progress Updates
### Update 1
- Time: 2026-06-08
- Change: `AGENTS.md`, `docs/doc-governance.md`, `docs/database/runtime-db.md` 확인.
- Reason: 문서 체계와 source-of-truth 위치를 먼저 확정하기 위해.

### Update 2
- Time: 2026-06-08
- Change: DB 런타임 확인 규칙을 `docs/database/runtime-db.md`에 추가.
- Reason: 로컬 셸의 `APP_ENV`와 실행 중인 서버의 DB가 다를 수 있음을 명시해 반복 실수를 막기 위해.

### Update 3
- Time: 2026-06-08
- Change: `docs/exec-plans/_template.md`의 오래된 `modular.db` 기준 문구를 DB 조회 전 확인 규칙 적용으로 교체.
- Reason: 새 실행계획 작성 시 같은 오판이 반복되지 않게 하기 위해.

## Result
- DB 조회 전 확인 규칙과 금지 패턴을 `docs/database/runtime-db.md`에 추가했다.
- 실행계획 템플릿의 운영 DB 확인 문구를 현재 RDS 기준 규칙에 맞게 수정했다.

## Verification
- Checked: 문서 diff 확인.
- Not checked: 코드 동작 변경 없음.

## Retrospective
### Classification
- `Execution Judgment Problem`

### What Was Wrong
- 실행 중인 서버가 보는 DB와 로컬 셸 명령이 보는 DB를 같은 것으로 추정했다.

### Why
- `/health`의 DB 종류 확인과 셸의 `APP_ENV` 선택이 별도 런타임이라는 점을 충분히 강제 확인하지 않았다.

### Next Time
- DB 조회 전에는 실행 서버 API로 확인할지, 셸에서 직접 DB에 붙을지 먼저 정하고, 셸 직접 조회는 `APP_ENV`, env 파일, 포트/터널, 실행 위치를 확인한 뒤 수행한다.

## Related Documents
- [AGENTS.md](../../AGENTS.md)
- [docs/doc-governance.md](../doc-governance.md)
- [docs/database/runtime-db.md](../database/runtime-db.md)
