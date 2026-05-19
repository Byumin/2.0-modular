# Documentation Hub

이 문서는 문서 진입점만 안내하는 상위 지도다. 상세 규칙은 각 source 문서에서 관리한다.

## Start Here
- 저장소 공통 규칙: [AGENTS.md](../AGENTS.md)
- 시스템 구조와 계층: [ARCHITECTURE.md](../ARCHITECTURE.md)
- 품질/UI 검증 기준: [QUALIT_SCORE.md](../QUALIT_SCORE.md)

## Mandatory Reading Order
작업자가 규칙을 놓치지 않도록 아래 순서를 기본값으로 둔다.

1. 모든 작업: `AGENTS.md`
2. 실제 수정 작업: `docs/exec-plans/README.md`와 새 실행계획 문서
3. 작업 종류별 source-of-truth 문서
4. 검증 기준 문서

## Main Sources
- 기능별 가이드: [docs/features/README.md](features/README.md)
- DB 기준과 자산: [docs/database/README.md](database/README.md)
- 서버 실행 모드: [docs/runtime-run-modes.md](runtime-run-modes.md)
- 프런트/디자인 시스템: [DESIGN.md](../DESIGN.md)
- 설명/디버깅 원칙: [docs/debug/explanation-rule.md](debug/explanation-rule.md)
- 코드 정리 산출물: [docs/code-cleanup/README.md](code-cleanup/README.md)
- 다이어그램: [docs/diagrams/README.md](diagrams/README.md)
- 문서 거버넌스: [docs/doc-governance.md](doc-governance.md)
- 실행 계획/회고: [docs/exec-plans/README.md](exec-plans/README.md)

## Task Map
| 작업 종류 | 먼저 볼 문서 | 추가 확인 | 검증 기록 |
| --- | --- | --- | --- |
| 코드 수정/버그 수정/리팩토링 | `AGENTS.md` -> `docs/exec-plans/README.md` | `ARCHITECTURE.md`, 관련 `docs/features/*` | 실행계획 `Verification` |
| DB 확인/마이그레이션 | `AGENTS.md` -> `docs/database/runtime-db.md` | `docs/database/schema-overview.md`, `ARCHITECTURE.md` | RDS 확인 결과 |
| UI/디자인 수정 | `AGENTS.md` -> `DESIGN.md` | `QUALIT_SCORE.md`, `scripts/README_CAPTURE.md` | 전/후 스크린샷 |
| 기능 흐름 설명/디버깅 설명 | `AGENTS.md` -> `docs/debug/explanation-rule.md` | 관련 소스와 기능 문서 | 확인한 경로와 근거 |
| 문서 추가/정리 | `AGENTS.md` -> `docs/doc-governance.md` | 기존 허브/소스 문서 | 중복 여부와 source-of-truth |
| 코드 정리 인터랙션 웹 | `AGENTS.md` -> `docs/code-cleanup/README.md` | `docs/code-cleanup/playbook.md` | 산출물 경로와 실행 결과 |

## Tooling
- 로컬/빌드/운영 실행 모드: [docs/runtime-run-modes.md](runtime-run-modes.md)
- Claude 자동화: [claude/README.md](../claude/README.md)
- Claude 하네스: [claude/HARNESS.md](../claude/HARNESS.md)
- 화면 캡처: [scripts/README_CAPTURE.md](../scripts/README_CAPTURE.md)
