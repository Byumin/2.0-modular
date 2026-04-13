# Repository Instructions

## First Rule
모든 요청은 어떤 작업이든 시작하기 전에 반드시 이 `AGENTS.md`를 가장 먼저 확인하고, 여기 적힌 저장소 규칙과 프로젝트 구조를 기준으로 진행한다.
설명, 수정, 생성, 삭제, 조회, 리뷰, 디버깅, 테스트, 문서 작업 모두 예외 없이 동일하다.

## Project Overview
시스템 구조, 계층 설계, 폴더 역할, DB 규칙, 기능 도메인 상세는 [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)를 기준으로 본다.

핵심 요약:
- FastAPI 백엔드 + React SPA 관리자/수검자 화면 구성의 심리/평가 검사 운영 웹 애플리케이션
- `static/` HTML/JS는 레거시 잔존 파일이며, 현재 주요 `/admin/*`, `/assessment/custom/{token}` browser route는 React SPA 기준
- 메인 엔트리포인트는 `app/main.py` (루트 `main.py` 아님)
- 운영 DB는 루트 `modular.db` 단일 기준

## Explanation Rule
기능 설명, 디버깅 흐름 추적, 소스 정리 전 구조 분석이 필요하면 상세 규칙은 `docs/debug/explanation-rule.md`를 먼저 확인하고 그 기준을 따른다.
루트 `AGENTS.md`에는 요약 규칙만 두고, 상세 분석/설명 규칙은 디버깅 문서로 분리해서 관리한다.

## Documentation Governance Rule
새 문서, 새 문서 경로, 새 규칙을 추가하기 전에는 먼저 기존 문서에 흡수 가능한지 검토한다.
불가피하게 새 문서를 만들 경우 문서 역할(허브 / 원칙 / 운영 / 템플릿 / 예시), source of truth 문서, 다른 문서와의 관계를 먼저 정하고 시작한다.
상세 기준은 [docs/doc-governance.md](/mnt/c/Users/user/workspace/2.0-modular/docs/doc-governance.md)를 따른다.

## Code Cleanup Rule
사용자가 `코드 정리해줘`처럼 기능 흐름을 사람이 이해하기 쉽게 재구성해 달라고 요청하면, 기본 산출물은 텍스트 요약만이 아니라 클릭과 단계 확인이 가능한 인터랙션 웹으로 본다.
이 경우 관련 상세 규칙은 `docs/interactive-flow-spec.md`를 먼저 확인하고 따른다.
운영 절차와 체크리스트는 `docs/code-cleanup/playbook.md`를 기준으로 보고, 템플릿 시작점은 `docs/code-cleanup/templates/interactive-flow-template.html`을 사용한다.
기본 산출물 위치는 `artifacts/interactive-flows/` 기준으로 본다.
세부 시각 규칙과 단계 분해 기준은 전담 문서에서 관리하고, `AGENTS.md`에는 포인터만 유지한다.

## Execution Plan Rule
코드 수정, 리팩토링, 버그 수정, 구조 변경, 문서 체계 변경처럼 실제 작업이 들어가는 요청은 가능한 한 작업 시작 전에 `docs/exec-plans/` 아래 실행 계획 문서를 먼저 만든다.
이 문서는 작업 중간에도 계속 수정해야 하며, 처음 계획이 틀렸는지, 계획은 맞았지만 중간 판단/구현에서 잘못됐는지 나중에 회고할 수 있도록 남긴다.

실행 계획 문서에는 최소한 아래 내용을 포함한다.

- 작업 목표
- 초기 가설과 접근 방식
- 단계별 실행 계획
- 작업 중 변경된 계획과 변경 이유
- 최종 결과
- 실패/오류가 있었다면 원인이 계획 문제인지 실행 판단 문제인지에 대한 회고

## UI Debug Rule
UI나 프런트엔드 디버깅, 수정, 개선 요청은 코드만 보고 진행하지 않는다.
수정 전 스크린샷 확인 → 수정 → 수정 후 스크린샷 재확인 → 전/후 비교 검증 순서를 따른다.
세부 기준은 [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)의 `UI Review Rule`을 참조한다.

## Planning Docs
- `docs/exec-plans/README.md`: 실행 계획 문서 작성 규칙
- `docs/exec-plans/_template.md`: 실행 계획 문서 템플릿

## Debug Docs
- `docs/debug/explanation-rule.md`: 기능 설명, 호출 흐름 추적, 디버깅/분석 응답 작성 규칙
- `docs/interactive-flow-spec.md`: `코드 정리` 요청을 인터랙션 웹 산출물로 만드는 규칙
- `docs/code-cleanup/README.md`: `코드 정리` 문서 허브
- `docs/code-cleanup/playbook.md`: `코드 정리` 작업 절차, 체크리스트, 레퍼런스/템플릿 안내

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
- [claude/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/README.md)
- [docs/interactive-flow-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/interactive-flow-spec.md)
- [docs/code-cleanup/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/README.md)
- [docs/code-cleanup/playbook.md](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/playbook.md)
- [docs/database/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/README.md)
- [docs/features/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
