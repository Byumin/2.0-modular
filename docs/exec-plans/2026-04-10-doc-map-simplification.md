# Execution Plan

## Task Title
- 문서 허브/원칙/운영/템플릿 역할 분리 및 중복 축소

## Request Summary
- 프로젝트 문서들을 지도처럼 단순화하고, 서로 겹치는 내용은 요약하거나 제거하며, 레퍼런스 템플릿 소스와 문서의 중복도 정리해달라는 요청

## Goal
- 문서 간 역할을 명확히 나눈다.
- 같은 규칙이 여러 문서에 반복되는 부분은 허브 문서에서는 요약하고 상세 문서로 위임한다.
- 템플릿 소스도 현재 문서 기준과 맞지 않는 중복/구식 요소를 줄인다.

## Initial Hypothesis
- `docs/interactive-flow-spec.md`와 `docs/code-cleanup/playbook.md`가 원칙과 절차를 함께 담고 있어 중복이 발생한다.
- `docs/code-cleanup/README.md`와 `docs/README.md`도 코드 정리 문서군을 안내하지만 역할 구분이 아직 충분히 단순하지 않다.
- 템플릿에는 현재 문서 기준과 어긋나는 줌 컨트롤 기본값 같은 구식 요소가 남아 있다.

## Initial Plan
1. 관련 허브 문서, 원칙 문서, 운영 문서, 템플릿 소스를 비교한다.
2. 역할 분리 기준에 따라 어떤 내용을 남기고 어떤 내용을 다른 문서로 위임할지 정한다.
3. `docs/README.md`, `docs/code-cleanup/README.md`, `docs/interactive-flow-spec.md`, `docs/code-cleanup/playbook.md`를 단순화한다.
4. `docs/code-cleanup/templates/interactive-flow-template.html`도 현재 기준에 맞게 정리한다.
5. 변경 결과를 검토하고 실행 계획 문서에 반영한다.

## Progress Updates
### Update 1
- Time: 2026-04-10
- Change: 실행 계획 문서 생성
- Reason: 저장소의 Execution Plan Rule 준수

### Update 2
- Time: 2026-04-10
- Change: 관련 문서와 템플릿 구조 비교 진행 중
- Reason: 역할 중복과 구식 템플릿 요소를 식별하기 위해서

### Update 3
- Time: 2026-04-10
- Change: `docs/code-cleanup/README.md`, `docs/interactive-flow-spec.md`, `docs/code-cleanup/playbook.md`, `docs/README.md`를 역할 분리 관점으로 정리
- Reason: 허브는 지도, spec은 원칙, playbook은 운영, docs hub는 읽기 순서 안내 역할만 남기기 위해서

### Update 4
- Time: 2026-04-10
- Change: `docs/code-cleanup/templates/interactive-flow-template.html`에서 구식 줌 컨트롤과 기본 edge 방향 표시를 현재 규칙에 맞게 정리
- Reason: 문서 기준과 템플릿 기본 골격이 어긋나지 않게 하기 위해서

## Result
- `docs/code-cleanup/README.md`를 상세 규칙 요약본이 아니라 문서 지도 형태로 단순화했다.
- `docs/interactive-flow-spec.md`는 원칙 문서 역할을 더 분명히 하고, 절차/체크리스트는 `playbook`으로 위임하도록 정리했다.
- `docs/code-cleanup/playbook.md`는 운영 문서 역할 경계를 명시하고, spec과의 관계를 더 분명히 했다.
- `docs/README.md`의 `코드 정리 인터랙션 웹` 읽기 순서를 `README -> spec -> playbook -> explanation-rule -> template` 순서로 조정했다.
- 템플릿은 기본 줌 컨트롤을 `- / 현재 배율 / +` 형태로 바꾸고, 기본 edge에 화살표가 보이도록 정리했다.

## Verification
- Checked: 수정된 문서와 템플릿을 다시 열어 역할 분리가 의도대로 반영됐는지 확인
- Checked: `git diff`로 변경 범위를 검토
- Not checked: 새 템플릿으로 실제 신규 artifact를 하나 생성해 end-to-end로 검증하는 추가 작업

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- `코드 정리` 관련 문서군이 서로 링크는 잘 되어 있었지만, 허브/원칙/운영/템플릿의 역할 경계가 뚜렷하지 않아 같은 내용을 여러 문서에서 반복 확인해야 했다.

### Why
- 문서가 늘어날 때마다 새 기준을 기존 여러 문서에 같이 추가하는 방식이 반복되면서, 지도 문서와 규칙 문서와 운영 문서의 정보 밀도가 서로 비슷해졌다.

### Next Time
- 새 규칙을 추가할 때 먼저 어느 문서가 source of truth인지 정하고, 허브 문서에는 요약과 링크만 남기는 방식으로 유지한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/interactive-flow-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/interactive-flow-spec.md)
- [docs/code-cleanup/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/README.md)
- [docs/code-cleanup/playbook.md](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/playbook.md)
- [docs/code-cleanup/templates/interactive-flow-template.html](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/templates/interactive-flow-template.html)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
