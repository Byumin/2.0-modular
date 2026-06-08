# Execution Plan

## Task Title
- 실시링크 검수 에이전트 역할 문서화

## Request Summary
- 실시링크 검수 작업을 케이스 생성, 실제 제출, 관점별 검수 에이전트 구조로 운영한다.
- 각 에이전트의 역할과 책임, 입출력, 실행 순서를 문서화한다.

## Goal
- 검수 에이전트 역할을 `docs/operations/assessment-link-verification-agents.md`에 저장한다.
- 제출 전/후 어떤 에이전트가 무엇을 확인하는지 명확히 한다.
- DB 변경 권한과 금지 작업을 역할별로 분리한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] `docs/doc-governance.md` 확인
- [x] 문서 위치 결정: `docs/operations`
- [x] 운영 문서 작성
- [x] 실행계획 결과 갱신

## Initial Hypothesis
- 본 주제는 DB schema source가 아니라 실제 검수 운영 절차이므로 `docs/operations` 문서가 적합하다.
- DB 삭제/정리 규칙은 `docs/database/client-hard-purge.md`로 연결만 한다.

## Initial Plan
1. 에이전트 운영 순서를 정의한다.
2. 케이스 생성/제출 실행/관점별 검수 역할을 분리한다.
3. 에이전트별 입력, 출력, 금지 작업을 문서화한다.
4. 관련 문서 링크를 추가한다.

## Progress Updates
### Update 1
- Time: 2026-06-04
- Change: 작업 문서 위치를 `docs/operations/assessment-link-verification-agents.md`로 결정했다.
- Reason: 실시링크 검수는 운영 절차이며 DB 구조 문서와 역할이 다르기 때문이다.

### Update 2
- Time: 2026-06-04
- Change: 케이스 생성 에이전트 결과를 받아 실제 제출 실행 에이전트에 전달했다.
- Reason: 검수 순서를 케이스 생성 → 실제 제출 → 관점별 검수로 운영하기 위함이다.

## Result
- 실시링크 검수 에이전트 역할과 실행 순서를 `docs/operations/assessment-link-verification-agents.md`에 문서화했다.
- 케이스 생성 → 실제 제출 → 관점별 검수 순서로 운영 기준을 정리했다.
- 각 에이전트별 입력, 출력, 정상 기준, 금지 작업을 명시했다.
- 실제 제출 실행 에이전트에 `A_main_3_7_mother` 케이스와 선택 번호 생성 규칙을 전달했다.

## Verification
- Checked:
  - `docs/operations/assessment-link-verification-agents.md` 작성
  - 케이스 생성/제출 실행/관점별 검수 에이전트 역할 구분
  - data handoff 예시 포함
- Not checked:
  - 실제 제출 실행 결과
  - 제출 후 관점별 검수 결과

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 기존에는 검수 항목이 대화에 흩어져 있었고, 어떤 에이전트가 어떤 책임을 갖는지 문서화되어 있지 않았다.

### Why
- 실제 제출과 RDS 검증은 관점이 많아 역할 분리가 필요하지만, 고정 운영 문서가 없었다.

### Next Time
- 실시링크 검수 전 이 문서를 기준으로 에이전트를 생성하고, 제출 결과 payload를 관점별 검수 에이전트에게 전달한다.

## Related Documents
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [docs/doc-governance.md](/mnt/c/Users/user/workspace/2.0-modular/docs/doc-governance.md)
- [docs/database/client-hard-purge.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/client-hard-purge.md)
- [docs/operations/assessment-link-verification-agents.md](/mnt/c/Users/user/workspace/2.0-modular/docs/operations/assessment-link-verification-agents.md)
