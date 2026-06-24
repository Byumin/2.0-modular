# Execution Plan

## Task Title
- RDS 정규화/조회 성능/이력 보존 재구조화 에이전트 문서 추가

## Request Summary
- 운영 RDS를 정규화하면서도 조회 성능과 이력 보존 요구를 반영해 재구조화할 때 사용할 전용 에이전트를 만들어 달라는 요청.

## Goal
- DB 재구조화 작업자가 일관된 절차로 현재 RDS/SQLAlchemy 모델을 조사하고, 1NF/2NF/3NF, 조회 성능, 이력 보존, 마이그레이션 안전성을 함께 검토하도록 하는 운영 문서를 추가한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: `ARCHITECTURE.md`
  - DB: `docs/database/runtime-db.md`, `docs/database/schema-overview.md`
  - UI/디자인: 해당 없음
  - 문서 체계: `docs/doc-governance.md`
  - 설명/디버깅: 해당 없음
  - 코드 정리 산출물: 해당 없음
- [x] 운영/실행 서버 DB가 필요한 작업이면 `docs/database/runtime-db.md`의 DB 조회 전 확인 규칙 적용
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- 새 에이전트는 코드 실행 기능이 아니라 DB 재구조화 업무를 수행할 때 따르는 역할/절차/산출물 정의 문서가 적합하다.
- DB 관련 source-of-truth는 `docs/database/runtime-db.md`와 `schema-overview.md`이므로, 새 문서는 이를 대체하지 않고 재구조화 작업용 운영 플레이북 역할을 가져야 한다.

## Initial Plan
1. 기존 DB 문서와 허브 구조를 확인한다.
2. `docs/database/rds-restructure-agent.md`를 추가한다.
3. `docs/database/README.md`에서 새 문서로 연결한다.
4. 문서 변경만 검증하고, 실제 RDS 조회/스키마 변경은 하지 않는다.

## Progress Updates
### Update 1
- Time: 00:24:55 UTC
- Change: 기존 문서 구조와 git 상태 확인.
- Reason: 진행 중인 사용자 변경을 건드리지 않고 새 문서만 추가하기 위해서.

### Update 2
- Time: 00:24:55 UTC 이후
- Change: `docs/database/rds-restructure-agent.md` 추가 및 `docs/database/README.md` 연결.
- Reason: DB 재구조화 절차는 DB 문서 허브 아래 운영 플레이북으로 두는 것이 문서 거버넌스와 가장 잘 맞기 때문.

## Result
- RDS 정규화/조회 성능/이력 보존 재구조화를 위한 전용 에이전트 문서를 추가했다.
- 새 문서에는 역할, 활성화 조건, 필수 입력, 정규화/비정규화 기준, 이력 보존 전략, 조회 성능 전략, 운영 마이그레이션 순서, 산출물 템플릿, 복사용 에이전트 프롬프트를 포함했다.
- `docs/database/README.md`에서 새 문서로 연결했다.

## Verification
- Checked: `rg`로 새 문서 링크와 주요 섹션 존재 여부 확인, `git status --short`로 변경 범위 확인.
- Not checked: 실제 RDS 조회, 스키마 변경, 애플리케이션 테스트는 수행하지 않음. 이번 작업은 문서/에이전트 정의 추가에 한정됨.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 해당 없음.

### Why
- 해당 없음.

### Next Time
- 실제 RDS 재구조화 작업에 착수할 때는 이 문서의 `Restructure Brief`와 `Table Decision Record`를 먼저 작성한 뒤 스키마 변경을 진행한다.

## Related Documents
- [Documentation Hub](../README.md)
- [docs/exec-plans/README.md](README.md)
- [AGENTS.md](../../AGENTS.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [docs/database/runtime-db.md](../database/runtime-db.md)
- [docs/database/schema-overview.md](../database/schema-overview.md)
