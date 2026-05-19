# Execution Plan

## Task Title
- 문서 거버넌스 규칙 추가

## Request Summary
- 새로운 역할, 경로, 문서를 추가할 때 같은 문서 중복/충돌 실수를 반복하지 않도록 상위 규칙을 추가해달라는 요청

## Goal
- `AGENTS.md`에는 짧은 문서 거버넌스 규칙만 둔다.
- 상세 기준은 별도 `docs/doc-governance.md`에 정리한다.
- 향후 문서 추가 시 source of truth, 문서 역할, 중복 금지 기준을 먼저 확인하게 만든다.

## Initial Hypothesis
- 지금까지의 중복은 문서 내용 자체보다, 새 문서를 만들기 전에 역할과 source of truth를 먼저 정하는 규칙이 없어서 반복된 측면이 크다.

## Initial Plan
1. 실행 계획 문서를 먼저 만든다.
2. `AGENTS.md`에 짧은 `Documentation Governance Rule`을 추가한다.
3. `docs/doc-governance.md`를 만들어 역할 분류, source of truth 규칙, 새 문서 생성 조건, 중복 금지 체크리스트를 정리한다.
4. `docs/README.md`에 새 문서를 허브 경로로 연결한다.

## Progress Updates
### Update 1
- Time: 2026-04-10
- Change: 실행 계획 문서 생성
- Reason: 저장소의 Execution Plan Rule 준수

### Update 2
- Time: 2026-04-10
- Change: `AGENTS.md`에 짧은 `Documentation Governance Rule` 추가, `docs/doc-governance.md` 신설, `docs/README.md` 허브 경로 연결
- Reason: 상위 규칙은 짧게 노출하고 상세 기준은 전담 문서로 분리하려는 목적

## Result
- `AGENTS.md`에 새 문서/새 규칙 추가 전 기존 문서 흡수 가능성, 문서 역할, source of truth를 먼저 정하라는 상위 규칙을 추가했다.
- 새 [docs/doc-governance.md](/mnt/c/Users/user/workspace/2.0-modular/docs/doc-governance.md)를 만들어 문서 역할 분류, source of truth 규칙, 새 문서/새 경로 생성 조건, 중복 금지 기준, 리뷰 체크리스트를 정리했다.
- [docs/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)에 문서 체계 변경 경로와 `doc-governance` 링크를 추가했다.

## Verification
- Checked: `AGENTS.md`, `docs/doc-governance.md`, `docs/README.md` 최종 내용 확인
- Checked: `git diff`로 변경 범위와 링크 연결 확인
- Not checked: 향후 실제 신규 문서 작성 작업에서 이 규칙이 반복적으로 지켜지는지에 대한 장기 검증

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 새 문서 추가 시점에 역할과 source of truth를 먼저 정하는 상위 규칙이 없어서, 중복 방지가 사후 정리 작업으로만 이뤄지고 있었다.

### Why
- 허브/원칙/운영/템플릿을 나누는 개념은 있었지만, 그것을 문서 추가 전에 강제하는 체크포인트가 없었다.

### Next Time
- 새 문서나 새 규칙이 생기면 먼저 `doc-governance` 기준으로 역할과 source 문서를 정한 뒤, 그 다음 실제 문서 작성으로 들어간다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
