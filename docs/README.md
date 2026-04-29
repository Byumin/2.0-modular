# Documentation Hub

이 문서는 문서 진입점만 안내하는 상위 지도다. 상세 규칙은 각 source 문서에서 관리한다.

## Start Here
- 저장소 공통 규칙: [AGENTS.md](../AGENTS.md)
- 시스템 구조와 계층: [ARCHITECTURE.md](../ARCHITECTURE.md)
- 품질/UI 검증 기준: [QUALIT_SCORE.md](../QUALIT_SCORE.md)

## Main Sources
- 기능별 가이드: [docs/features/README.md](features/README.md)
- DB 기준과 자산: [docs/database/README.md](database/README.md)
- 프런트/디자인 시스템: [docs/design/design-system.md](design/design-system.md)
- 설명/디버깅 원칙: [docs/debug/explanation-rule.md](debug/explanation-rule.md)
- 코드 정리 산출물: [docs/code-cleanup/README.md](code-cleanup/README.md)
- 다이어그램: [docs/diagrams/README.md](diagrams/README.md)
- 문서 거버넌스: [docs/doc-governance.md](doc-governance.md)
- 실행 계획/회고: [docs/exec-plans/README.md](exec-plans/README.md)

## Read By Task
- 기능 이해: `ARCHITECTURE.md` -> `docs/features/README.md` -> 필요한 기능 문서
- 로컬 실행/포트 확인: `ARCHITECTURE.md`의 `Local Development Runtime`
- DB 확인: `docs/database/README.md` -> `runtime-db.md` -> `schema-overview.md`
- UI 작업: `docs/design/design-system.md` -> `QUALIT_SCORE.md` -> `scripts/README_CAPTURE.md`
- 코드 흐름 설명: `docs/debug/explanation-rule.md`
- 코드 정리 인터랙션 웹: `docs/code-cleanup/README.md`
- 문서 체계 변경: `docs/doc-governance.md`
- 실행 계획 작성: `docs/exec-plans/README.md`

## Tooling
- 로컬 실행: `npm run dev`(FastAPI `8120`), `npm run dev:frontend`(Vite `5120`)
- Claude 자동화: [claude/README.md](../claude/README.md)
- Claude 하네스: [claude/HARNESS.md](../claude/HARNESS.md)
- 화면 캡처: [scripts/README_CAPTURE.md](../scripts/README_CAPTURE.md)
