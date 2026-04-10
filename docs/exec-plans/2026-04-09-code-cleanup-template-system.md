# Execution Plan

## Task Title
- 인터랙티브 코드 정리 레퍼런스 템플릿과 운영 문서 체계화

## Request Summary
- 현재 관리자 로그인 인터랙션 웹 시범본을 하나의 레퍼런스 템플릿 소스로 두고, 이후 `코드 정리` 작업이 같은 기준으로 반복될 수 있도록 관련 문서를 체계적으로 만들어 달라는 요청.

## Goal
- 재사용 가능한 인터랙션 웹 템플릿 소스 위치와 용도를 명확히 한다.
- `코드 정리` 작업의 목적, 산출물, 진행 순서, 검증 기준을 한 문서에서 찾을 수 있게 정리한다.
- 기존 `interactive-flow-spec`과 실제 시범본, 템플릿, 운영 문서가 서로 연결되도록 만든다.

## Initial Hypothesis
- 현재는 `interactive-flow-spec`이 원칙 문서 역할은 하지만, 실제로 어떤 템플릿을 복제해 시작해야 하는지와 작업 체크리스트가 분리돼 있지 않다.
- 템플릿 HTML과 운영 가이드를 분리해 두면 이후 Codex/Claude가 더 일관되게 `코드 정리` 산출물을 만들 수 있다.

## Initial Plan
1. 관리자 로그인 시범본을 기준으로 재사용 가능한 템플릿 HTML을 만든다.
2. `코드 정리` 운영 문서를 추가해 목적, 절차, 산출물, 검증 기준을 정리한다.
3. `docs/interactive-flow-spec.md`, `docs/README.md`, `AGENTS.md`와 연결한다.

## Progress Updates
### Update 1
- Time: 2026-04-09 16:33 KST
- Change: 실행 계획 문서 작성
- Reason: 문서 체계 변경과 템플릿 추가 작업 전 계획을 먼저 남긴다.

### Update 2
- Time: 2026-04-09 16:42 KST
- Change: 템플릿 소스와 운영 플레이북 문서를 실제로 추가하고 관련 허브 문서에 연결
- Reason: 원칙 문서만으로는 새 작업 시작점이 모호해서, 레퍼런스 구현과 템플릿, 운영 절차를 분리해줘야 재사용성이 높아진다.

### Update 3
- Time: 2026-04-09 16:49 KST
- Change: 코드 정리 문서들을 `docs/code-cleanup/` 아래로 재배치하고 참조 경로를 정리
- Reason: 템플릿과 운영 문서를 한 디렉터리로 모아야 구조가 더 직관적이고 탐색 비용이 줄어든다.

### Update 4
- Time: 2026-04-09 16:56 KST
- Change: 허브/원칙/플레이북 문서의 역할 구분을 더 선명하게 보이도록 링크와 읽기 순서를 보강
- Reason: 경로만 옮겨도 충분하지 않고, 사용자가 어느 문서를 먼저 봐야 하는지까지 문서 안에서 드러나야 한다.

## Result
- 재사용용 템플릿 소스로 `docs/code-cleanup/templates/interactive-flow-template.html`을 추가했다.
- `코드 정리` 작업 운영 문서로 `docs/code-cleanup/playbook.md`를 추가했다.
- `docs/code-cleanup/README.md`를 추가해 코드 정리 문서 허브를 만들었다.
- 템플릿 소스는 `docs/code-cleanup/templates/interactive-flow-template.html`로 옮겼다.
- `interactive-flow-spec.md`에 템플릿 소스와 운영 문서를 연결했다.
- `docs/README.md`와 `AGENTS.md`에 코드 정리 작업의 템플릿 시작점과 운영 문서 경로를 반영했다.
- 현재 관리자 로그인 시범본은 계속 레퍼런스 구현으로 사용한다.
- 추가로 `docs/code-cleanup/README.md`, `docs/interactive-flow-spec.md`, `docs/debug/explanation-rule.md`, `docs/README.md`에 읽기 순서와 레퍼런스 구현 링크를 보강했다.

## Verification
- Checked:
- `docs/code-cleanup/README.md`, `docs/code-cleanup/playbook.md`, `docs/code-cleanup/templates/interactive-flow-template.html`, `docs/interactive-flow-spec.md`, `docs/README.md`, `AGENTS.md` 사이 연결 문구를 수동 점검했다.
- 레퍼런스 구현 경로와 템플릿 소스 경로가 명확히 구분되는지 확인했다.
- Not checked:
- 템플릿 HTML을 복제해 실제 두 번째 기능 흐름 산출물까지 만드는 검증은 이번 작업 범위에 포함하지 않았다.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 기존 규칙은 산출물 원칙은 있었지만, 새 작업을 어디서 시작하고 어떤 문서를 따라야 하는지 한 번에 보이지 않았다.

### Why
- 레퍼런스 구현과 템플릿 소스, 운영 절차가 분리돼 있지 않으면 이후 작업마다 해석 비용이 다시 발생한다.

### Next Time
- 다음에는 `custom test create`나 `assessment submit` 흐름 하나를 템플릿에서 실제로 새로 만들어 템플릿 재사용성을 검증한다.

## Related Documents
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [docs/interactive-flow-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/interactive-flow-spec.md)
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
