# Repository Instructions

## First Rule
모든 요청은 어떤 작업이든 시작하기 전에 반드시 이 `AGENTS.md`를 가장 먼저 확인하고, 여기 적힌 저장소 규칙과 프로젝트 구조를 기준으로 진행한다.
설명, 수정, 생성, 삭제, 조회, 리뷰, 디버깅, 테스트, 문서 작업 모두 예외 없이 동일하다.

## Project Overview
이 프로젝트는 FastAPI 백엔드와 정적 HTML/JavaScript 관리자 화면을 함께 사용하는 심리/평가 검사 운영용 모듈형 웹 애플리케이션이다.

현재 코드 기준 핵심 목적은 다음과 같다.

1. 관리자가 로그인해서 검사 운영 화면에 접근한다.
2. 관리자가 커스텀 검사를 생성하고 조회, 수정, 삭제한다.
3. 커스텀 검사별 접근 링크를 발급해 실제 수검자가 검사 페이지에 진입하도록 한다.
4. 수검자의 인적사항 검증, 응답 제출, 결과 저장을 처리한다.
5. 관리자가 클라이언트와 검사 이력을 관리하고 대시보드 통계를 확인한다.
6. 제출된 검사 결과를 채점 서비스로 계산하고 후속 리포트/LLM 컨텍스트 흐름에 연결한다.

## Main Features
- 관리자 인증: `/api/admin/login`, `/api/admin/logout`, `/api/admin/me`
- 관리자 화면 제공: `/admin`, `/admin/workspace`, `/admin/clients`, `/admin/create` 등 정적 HTML 페이지 라우팅
- 커스텀 검사 관리: 검사 카탈로그 조회, 커스텀 검사 생성/조회/수정/삭제, 일괄 삭제
- 평가 링크 운영: 접근 토큰 기반 검사 링크 조회, 프로필 검증, 검사 제출
- 클라이언트 관리: 클라이언트 생성/조회/수정/삭제, 검사 배정, 평가 로그 생성
- 대시보드/통계: 관리자 대시보드 정보 및 최근 평가 통계 제공
- 채점 처리: 제출된 검사(`submission`)를 기준으로 채점 엔진 실행
- DB 초기화/마이그레이션 보조: startup 시 테이블 생성, 컬럼 보정, 기본 관리자 시드 수행
- 산출물/문서 보조: `artifacts/`, `docs/diagrams/`, `scripts/`, `claude/`를 통한 리포트/검증/다이어그램/LLM 자동화 관리

## Folder Structure
- `app/`: 현재 메인 FastAPI 애플리케이션
- `app/main.py`: 실제 앱 엔트리포인트, 라우터 등록, static/artifacts mount, startup 초기화
- `app/router/`: HTTP 엔드포인트 정의
- `app/schemas/`: Pydantic 요청/응답 스키마
- `app/services/`: 비즈니스 로직
- `app/services/admin/`: 관리자 인증, 대시보드, 커스텀 검사, 링크, 클라이언트 관리 서비스
- `app/services/scoring/`: 채점 엔진, 제출 채점, 테스트 레지스트리
- `app/repositories/`: DB 접근 계층
- `app/db/`: SQLAlchemy 모델, 세션, DB 초기화/마이그레이션 코드
- `static/`: 관리자/수검자용 HTML, CSS, JavaScript 정적 파일
- `scripts/`: E2E 점검, DB 생성, 캡처, 보조 스크립트
- `claude/`: Claude Code CLI 기반 비대화형 검토/자동화 도구, 프롬프트 자산, 리뷰 결과(`claude/reviews/runs/`)
- `docs/`: 다이어그램, 스키마/감사 자료, 보조 문서
- `artifacts/`: 생성된 HTML 산출물과 스크린샷
- `logs/`: 서버 및 테스트 실행 로그
- `main.py`: 초기 단순 진입점 성격의 별도 파일로 남아 있으나, 현재 모듈형 구조의 주 엔트리포인트는 `app/main.py` 기준으로 본다
- `requirements.txt`: Python 의존성
- `package.json`: Mermaid 렌더링, Playwright 등 프론트/문서 보조 도구 설정
- `node_modules/`: 프론트/문서 보조 도구 의존성
- `.venv/`: 로컬 Python 가상환경
- `.playwright-browsers/`: Playwright 브라우저 바이너리

## Working Assumption
사용자 요청을 처리할 때 현재 프로젝트의 기본 기준점은 `app/main.py`를 중심으로 한 모듈형 구조다.
동일하거나 유사한 기능이 루트 `main.py`에도 남아 있어도, 특별히 사용자가 해당 파일을 지정하지 않는 한 현재 운영 기준은 `app/` 하위 구조를 우선해서 해석한다.

## Database Single Source Rule
앞으로 이 프로젝트의 모든 DB 연결 기준은 루트 `modular.db` 하나로 통일한다.
새 코드, 기존 코드 수정, 스크립트, 인증 로직, 문서 설명 모두 기본 기준은 동일하게 `modular.db`여야 한다.
별도 백업/테스트/참고 자산이 필요하더라도, 그것을 실제 운영 연결 기준처럼 섞어 쓰지 않는다.

## Explanation Rule
기능 설명, 디버깅 흐름 추적, 소스 정리 전 구조 분석이 필요하면 상세 규칙은 `docs/debug/explanation-rule.md`를 먼저 확인하고 그 기준을 따른다.
루트 `AGENTS.md`에는 요약 규칙만 두고, 상세 분석/설명 규칙은 디버깅 문서로 분리해서 관리한다.

## Code Cleanup Rule
사용자가 `코드 정리해줘`처럼 기능 흐름을 사람이 이해하기 쉽게 재구성해 달라고 요청하면, 기본 산출물은 텍스트 요약만이 아니라 클릭과 단계 확인이 가능한 인터랙션 웹으로 본다.
이 경우 관련 상세 규칙은 `docs/interactive-flow-spec.md`를 먼저 확인하고 따른다.
운영 절차와 체크리스트는 `docs/code-cleanup/playbook.md`를 기준으로 보고, 템플릿 시작점은 `docs/code-cleanup/templates/interactive-flow-template.html`을 사용한다.
기본 산출물 위치는 `artifacts/interactive-flows/` 기준으로 본다.
특히 반복 실수를 막기 위해, `코드 정리` 산출물은 refs 상대 경로 표기, 시나리오별 색 구분, 방향 화살표가 있는 edge, sticky detail panel overflow 처리, legend/fold affordance 같은 시각 규칙도 함께 확인한다.

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
요청받은 현상이 실제로 맞는지 먼저 스크린샷으로 확인하고, 그 다음 수정 및 반영을 진행한 뒤, 수정 후 스크린샷을 다시 확인해서 실제로 원하는 방향으로 바뀌었는지 검증한다.

기본 순서는 아래와 같다.

1. 수정 전 스크린샷으로 현재 문제 상태 확인
2. 코드 수정 및 반영
3. 수정 후 스크린샷 재확인
4. 수정 전/후를 비교해서 문제 해결 여부 검증

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
