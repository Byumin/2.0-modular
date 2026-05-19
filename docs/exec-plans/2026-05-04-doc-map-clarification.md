# 문서 지도화 및 규칙 누락 방지

## Task Title
- 문서 source-of-truth 지도화와 작업별 확인 순서 명료화

## Request Summary
- 문서가 많아 작업 중 규칙을 놓치는 문제가 있으므로, 삭제보다 지도화와 명료화를 우선한다.
- 루트 `DESIGN.md`를 디자인 기준 source-of-truth로 둔다.

## Goal
- 작업 시작 시 봐야 하는 문서 순서를 `AGENTS.md`와 `docs/README.md`에서 더 명확히 한다.
- 문서 역할과 source-of-truth 매핑을 `docs/doc-governance.md`에 보강한다.
- 실행계획 템플릿에 필수 사전 확인 문서 체크를 넣어 누락을 줄인다.

## Initial Hypothesis
- 규칙 누락의 원인은 문서 부재보다 허브 문서의 읽기 순서와 역할 경계가 약한 데 있다.
- 상세 규칙을 여러 문서에 복제하기보다, 허브에는 경로와 확인 시점만 둬야 한다.

## Initial Plan
1. `AGENTS.md`, `docs/README.md`, `docs/doc-governance.md`, `docs/exec-plans/_template.md`를 확인한다.
2. 새 문서를 늘리지 않고 기존 허브/거버넌스/템플릿에 지도와 체크포인트를 추가한다.
3. `DESIGN.md` 기준 참조가 일관적인지 확인한다.
4. diff와 `rg`로 깨진 참조를 검증한다.

## Progress Updates
### Update 1
- Time: 2026-05-04
- Change: `AGENTS.md`, `docs/README.md`, `docs/doc-governance.md`, `docs/exec-plans/_template.md` 수정 예정
- Reason: 작업자가 처음 읽는 문서와 실제 source 문서 사이의 연결을 명료하게 만들기 위함

### Update 2
- Time: 2026-05-04
- Change: `AGENTS.md`에 `Start Checklist`, `docs/README.md`에 `Mandatory Reading Order`와 `Task Map`, `docs/doc-governance.md`에 `Task Routing`, 실행계획 템플릿에 `Preflight Checklist`를 추가했다.
- Reason: 작업 시작 단계에서 확인 문서가 누락되지 않도록 같은 흐름을 허브와 템플릿에 드러내기 위함

## Result
- `AGENTS.md`가 최상위 시작 문서 역할을 더 명확히 갖도록 보강했다.
- `docs/README.md`는 문서 허브로서 작업별 확인 문서를 표로 안내한다.
- `docs/doc-governance.md`는 source-of-truth 라우팅 표를 갖게 됐다.
- `docs/exec-plans/_template.md`는 실행계획 작성 시 사전 확인 체크리스트를 갖게 됐다.
- `docs/exec-plans/README.md`에 템플릿의 preflight 사용 규칙을 추가했다.

## Verification
- Checked:
  - 잘못된 디자인 문서명 참조가 남아 있지 않은지 확인했다.
  - `Mandatory Reading Order`, `Task Map`, `Task Routing`, `Preflight Checklist` 항목 위치를 확인했다.
  - `git diff`로 문서 변경 범위를 확인했다.
- Not checked:
  - 문서 링크 렌더링은 브라우저로 확인하지 않았다.

## Retrospective
### Classification
- `Execution Judgment Problem`

### What Was Wrong
- 이전 작업에서 실행계획, DB 확인, UI/문서 source 확인 같은 사전 규칙을 놓쳤다.

### Why
- 규칙이 여러 문서에 흩어져 있었고, 작업 시작 시 어떤 문서를 어떤 순서로 확인해야 하는지 허브 문서가 충분히 강하게 안내하지 못했다.

### Next Time
- `AGENTS.md` -> 실행계획 preflight -> 작업별 source-of-truth -> 검증 결과 기록 순서를 먼저 밟는다.

## Related Documents
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [docs/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/doc-governance.md](/mnt/c/Users/user/workspace/2.0-modular/docs/doc-governance.md)
- [docs/exec-plans/_template.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/_template.md)
- [DESIGN.md](/mnt/c/Users/user/workspace/2.0-modular/DESIGN.md)
