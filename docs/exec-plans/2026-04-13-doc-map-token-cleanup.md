# Doc Map Token Cleanup

## Task Title
- 상위 문서 지도화 및 React 전환 문구 정리

## Request Summary
- 문서 정리 안 된 부분과 충돌 문구를 수정하고, 하위 상세문서/계획문서를 제외한 간략한 지도 형태로 요약해 토큰 사용량을 줄인다.

## Goal
- `AGENTS.md`와 상위 허브 문서는 상세 설명을 반복하지 않고 source 문서로 연결한다.
- React SPA 전환 이후 남은 정적 HTML/vanilla JS 기준 표현을 현재 구조에 맞춘다.
- 과거 실행 계획 문서는 기록으로 유지하고, 활성 source 문서만 수정한다.

## Initial Hypothesis
- 주요 충돌은 `ARCHITECTURE.md`의 `static/`, `page_router.py`, 정적 관리자 화면 표현과 `docs/design/design-system.md`의 현재 정적 HTML 표현이다.
- `AGENTS.md`는 관련 문서 목록이 길어 매 작업마다 토큰을 낭비하므로 핵심 지도와 source-of-truth 링크만 남기는 편이 낫다.

## Initial Plan
1. 상위 문서에서 충돌 문구를 수정한다.
2. `AGENTS.md`와 `docs/README.md`를 간략한 지도 형태로 압축한다.
3. 검색으로 삭제된 static 파일 직접 참조와 과거 구조 문구가 활성 문서에 남았는지 확인한다.

## Progress Updates
### Update 1
- Time: 2026-04-13
- Change: 초기 실행 계획 작성.
- Reason: 문서 체계 변경 요청이므로 실행 계획 규칙을 따른다.

### Update 2
- Time: 2026-04-13
- Change: `AGENTS.md`와 `docs/README.md`를 상세 목록 중심에서 짧은 source map 중심으로 압축했다.
- Reason: 매 작업 시작 시 읽는 상위 문서의 토큰 사용량을 줄이고, 상세 규칙은 source-of-truth 문서로 연결하기 위해서다.

### Update 3
- Time: 2026-04-13
- Change: `ARCHITECTURE.md`의 `page_router.py`, `static/`, 정적 관리자 화면 관련 문구와 `docs/design/design-system.md`의 전환 배경 문구를 현재 React SPA 기준으로 수정했다.
- Reason: 루트 `/` 전환과 레거시 정적 HTML/JS 삭제 이후 실제 구조와 충돌하는 표현이 남아 있었다.

## Result
- 상위 문서가 간략한 지도 형태로 바뀌었다.
- 활성 문서에서 삭제된 `static/admin*.html`, `static/assessment*.html`, `static/admin.js`, `static/style.css` 직접 참조는 검색되지 않는다.
- `ARCHITECTURE.md`는 `static/`을 보고서/레거시 보조 정적 자원으로 설명하고, 새 UI 수정 대상은 `frontend/src/`라고 안내한다.

## Verification
- Checked:
  - `AGENTS.md`
  - `docs/doc-governance.md`
  - `docs/exec-plans/README.md`
  - `ARCHITECTURE.md`
  - `docs/design/design-system.md`
  - `rg`로 활성 문서의 삭제된 static 파일 참조 검색
  - `rg`로 `레거시 HTML`, `정적 관리자`, `루트 정적 페이지`, `호환 또는 참고` 등 충돌 가능 문구 검색
- Not checked:
  - 과거 실행 계획 문서(`docs/exec-plans/**`)의 기록성 참조 정리

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 상위 문서가 상세 문서 목록과 요약 규칙을 과하게 반복했고, `ARCHITECTURE.md` 일부 문구가 React SPA 전환 이후 실제 파일 구성과 어긋났다.

### Why
- React 전환 작업 이후 `/` 라우트와 `static/` 정리가 진행됐지만, 상위 문서의 일부 설명은 이전 구조를 기준으로 남아 있었다.

### Next Time
- 라우팅/엔트리포인트를 정리할 때는 `AGENTS.md`, `ARCHITECTURE.md`, `docs/README.md`, `docs/design/design-system.md`만 우선 동기화하고, 과거 실행 계획 문서는 기록으로 분리한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
