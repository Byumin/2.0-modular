# Repository Instructions

## First Rule
모든 요청은 작업 종류와 무관하게 시작 전에 이 `AGENTS.md`를 먼저 확인한다.
이 문서는 토큰 절약용 상위 지도이며, 상세 규칙은 아래 source-of-truth 문서로 이동해 관리한다.

## Project Snapshot
- 앱: FastAPI 백엔드 + React SPA 관리자/수검자 화면
- 운영 엔트리포인트: `app/main.py` (`main.py`는 호환 shim)
- 로컬 고정 포트: FastAPI `8120`, Vite dev `5120`
- 운영 DB: RDS PostgreSQL (`.env`의 `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`)
- React browser route: `/`, `/admin/*`, `/assessment/custom/{token}`, `/report/{submissionId}?token={accessToken}`, `/admin/report/{submissionId}`
- 정적 자원: `static/`은 운영 React SPA가 아니라 보고서/레거시 보조 자원 용도
- 레거시 정적 HTML/JS 화면은 운영 기준에서 제외한다.

## Source Map
- 구조/계층/폴더/DB/도메인 기준: [ARCHITECTURE.md](ARCHITECTURE.md)
- 문서 체계와 중복 방지: [docs/doc-governance.md](docs/doc-governance.md)
- 설명/흐름 추적/디버깅 응답: [docs/debug/explanation-rule.md](docs/debug/explanation-rule.md)
- `코드 정리` 인터랙션 웹 산출물: [docs/code-cleanup/README.md](docs/code-cleanup/README.md)
- 실행 계획/회고 문서: [docs/exec-plans/README.md](docs/exec-plans/README.md)
- UI 검증과 스크린샷 기준: [QUALIT_SCORE.md](QUALIT_SCORE.md)
- 디자인/폰트/UI/UX/테마 기준: [DESIGN.md](DESIGN.md)

## Start Checklist
모든 작업은 아래 순서로 확인한다. 상세 규칙은 링크된 source-of-truth 문서에서만 관리한다.

1. 항상 이 `AGENTS.md`를 먼저 읽는다.
2. 코드 수정/리팩토링/DB/문서 체계 변경이면 `docs/exec-plans/`에 실행계획을 만든다.
3. 작업 종류별 source 문서를 확인한다.
   - 구조/DB/엔트리포인트: `ARCHITECTURE.md`, `docs/database/runtime-db.md`
   - UI/디자인: `DESIGN.md`, `QUALIT_SCORE.md`
   - 기능 흐름 설명/디버깅: `docs/debug/explanation-rule.md`
   - 문서 추가/정리: `docs/doc-governance.md`
   - 코드 정리 산출물: `docs/code-cleanup/README.md`
4. 검증은 작업 종류에 맞춰 실행계획 문서에 결과와 미검증 항목을 남긴다.

## Working Rules
- 기능 설명이나 디버깅 흐름 추적은 `docs/debug/explanation-rule.md`를 먼저 따른다.
- 새 문서/새 경로/새 규칙 추가 전에는 기존 문서에 흡수 가능한지 `docs/doc-governance.md` 기준으로 판단한다.
- 코드 수정, 리팩토링, 버그 수정, 구조 변경, 문서 체계 변경은 가능한 한 `docs/exec-plans/`에 실행 계획을 먼저 만들고 작업 중 갱신한다.
- 디자인, 폰트, UI, UX, 테마, 스타일, 프런트 시각 변경과 관련된 요청은 작업 전에 루트 `DESIGN.md`를 먼저 확인한다.
- UI나 프런트엔드 디버깅/수정은 수정 전 스크린샷 확인 -> 수정 -> 수정 후 스크린샷 재확인 -> 전후 비교 순서를 따른다.
- `코드 정리해줘`처럼 흐름을 사람이 이해하기 쉽게 재구성하는 요청의 기본 산출물은 `docs/code-cleanup/` 규칙에 따른 인터랙션 웹이다.
