# Execution Plan

## Task Title
- localhost 프론트 반영 불일치 문서화

## Request Summary
- 같은 URL에서 Codex 검증 화면과 사용자 Chrome 화면이 다르게 보인 이유를 문서화한다.
- 앞으로 비슷한 상황이 생기면 먼저 확인할 수 있는 문서와 체크리스트를 셋팅한다.

## Goal
- `docs/runtime-run-modes.md`에 localhost/포트/번들/서버 프로세스 불일치 진단 절차를 추가한다.
- `AGENTS.md`와 `docs/README.md`에는 상세 규칙을 복제하지 않고 해당 source-of-truth 링크만 추가한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 문서 체계: `docs/doc-governance.md`
  - 실행계획: `docs/exec-plans/README.md`
  - 서버 실행 모드: `docs/runtime-run-modes.md`
- [x] 운영 DB 변경 없음
- [x] 검증 방법: 문서 링크/중복 여부와 diff 확인

## Initial Hypothesis
- 새 문서를 만들기보다 서버 실행 모드 source-of-truth인 `docs/runtime-run-modes.md`에 운영 체크리스트를 추가하는 것이 중복을 줄인다.

## Initial Plan
1. `docs/runtime-run-modes.md`에 "프론트 반영 불일치/예전 UI" 진단 섹션을 추가한다.
2. `AGENTS.md` Source Map/Start Checklist에 런타임 문제 진입점을 추가한다.
3. `docs/README.md` Task Map에 로컬 실행/프론트 반영 문제 라우팅을 추가한다.
4. diff와 링크를 확인한다.

## Progress Updates
### Update 1
- Time: 2026-05-27
- Change: 기존 문서 검토 후 새 문서가 아니라 `docs/runtime-run-modes.md`에 흡수하기로 결정
- Reason: 서버 실행 모드 source-of-truth가 이미 존재하므로 같은 규칙을 분산하지 않기 위함

## Result
- `docs/runtime-run-modes.md`에 `프런트 반영이 안 되거나 예전 UI가 보일 때` 섹션을 추가했다.
- 새 섹션에 원인, 확인 순서, 새 포트 분리 방법, 상황별 해결 절차, UI 작업 검증 기본값을 정리했다.
- `AGENTS.md` Source Map/Start Checklist에 로컬 실행과 프론트 반영 문제 진입점을 추가했다.
- `docs/README.md` Task Map에 로컬 실행/프론트 반영 불일치 작업 라우팅을 추가했다.

## Verification
- Checked:
  - `rg`로 `AGENTS.md`, `docs/README.md`, `docs/runtime-run-modes.md`에 새 진입점과 섹션이 들어간 것 확인
  - `git diff --check` 통과
- Not checked:
  - 문서 링크 렌더링 UI는 별도 브라우저 확인하지 않음

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 이전 UI 반영 문제에서 캐시, 빌드, 라우트, 포트 프로세스, WSL/Windows localhost 차이를 한 번에 분리하는 고정 체크리스트가 없었다.

### Why
- `docs/runtime-run-modes.md`에는 실행 모드 차이는 있었지만 "같은 URL인데 서로 다른 UI가 보이는" 상황의 진단 절차가 명시되어 있지 않았다.

### Next Time
- 프론트 반영 불일치가 나오면 `docs/runtime-run-modes.md`의 해당 섹션을 먼저 따라 실제 URL, 번들 파일명, 서버 프로세스, Playwright 캡처, 필요 시 새 포트 분리까지 확인한다.

## Related Documents
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [docs/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/runtime-run-modes.md](/mnt/c/Users/user/workspace/2.0-modular/docs/runtime-run-modes.md)
- [docs/doc-governance.md](/mnt/c/Users/user/workspace/2.0-modular/docs/doc-governance.md)
