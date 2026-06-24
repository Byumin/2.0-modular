# Execution Plan

## Task Title
- RDS restructure analysis TODO documentation

## Request Summary
- 실제 RDS 데이터 기반 재구조화 제안을 나중에 확인하고 계속 TODO 체크할 수 있게 문서화한다.

## Goal
- RDS 재구조화 분석 결과를 `docs/database/`에 추적 가능한 체크리스트 문서로 남긴다.
- 기존 DB 문서 허브에서 새 문서를 찾을 수 있게 링크만 추가한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - [ ] 코드/구조: `ARCHITECTURE.md`
  - [ ] DB: `docs/database/runtime-db.md`, `docs/database/schema-overview.md`
  - [ ] UI/디자인: `DESIGN.md`, `QUALIT_SCORE.md`
  - [x] 문서 체계: `docs/doc-governance.md`
  - [ ] 설명/디버깅: `docs/debug/explanation-rule.md`
  - [ ] 코드 정리 산출물: `docs/code-cleanup/README.md`
- [x] 운영/실행 서버 DB가 필요한 작업이면 `docs/database/runtime-db.md`의 DB 조회 전 확인 규칙 적용
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- 새 기준 문서가 아니라 분석 결과와 실행 추적용 문서가 필요하다.
- `docs/database/rds-restructure-agent.md`는 작업 원칙 문서로 유지하고, 이번 산출물은 별도 분석/TODO 문서로 두는 편이 중복이 적다.

## Initial Plan
1. `docs/database/rds-restructure-analysis-todo.md`를 추가한다.
2. 실제 RDS 조회 결과 수치와 그 수치가 뒷받침하는 설계 제안을 기록한다.
3. 제안별 TODO 체크박스, 검증 SQL/API, 마이그레이션 단계 체크리스트를 포함한다.
4. `docs/database/README.md`에 새 문서 링크만 추가한다.

## Progress Updates
### Update 1
- Time: 2026-06-24
- Change: 문서 역할을 분석 결과/추적용 TODO로 확정했다.
- Reason: `rds-restructure-agent.md`는 운영 원칙 source-of-truth이고, 이번 문서는 특정 RDS 분석 결과이므로 역할이 다르다.

## Result
- Added `docs/database/rds-restructure-analysis-todo.md`.
- Updated `docs/database/README.md` with a link and reading order entry.
- The new analysis document includes actual observed RDS data signals, prioritized proposals, proposal-level TODOs, migration checklist, verification SQL, API regression checklist, and open questions.

## Verification
- Checked:
  - 문서 체계 규칙 확인
  - DB 문서 허브 위치 확인
  - `rg`로 새 문서 링크와 주요 섹션 확인
  - `rg`로 추적 가능한 TODO 체크박스 확인
- Not checked:
  - 실제 RDS 재조회는 수행하지 않음. 이전 Zeno read-only 분석 결과를 문서화 대상으로 사용한다.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- N/A

### Why
- N/A

### Next Time
- 분석 문서가 실행 계획/운영 원칙/source-of-truth와 섞이지 않도록 문서 역할을 먼저 확정한다.

## Related Documents
- [Documentation Hub](../README.md)
- [docs/exec-plans/README.md](README.md)
- [AGENTS.md](../../AGENTS.md)
- [docs/doc-governance.md](../doc-governance.md)
- [docs/database/README.md](../database/README.md)
