# Claude Harness Architecture

이 문서는 이 저장소에서 Claude 자동화를 어떤 런타임 경계로 운영할지 정의한다.

## Two Environments

### Orchestrator Environment

- 목적: Claude 자체와 하네스 도구를 실행한다.
- 기본 경로: 로컬 `claude` CLI 로그인 세션
- 주 사용 자산:
  - `claude/run.sh`
  - `claude/run_cli.py`
  - `claude/review_paths.py`
  - `claude/prompts/`
- 포함 의존성:
  - `claude` CLI
  - 결과 파싱, 프롬프트 로딩용 보조 코드

### Target Project Environment

- 목적: 실제 앱과 테스트를 실행한다.
- 기본 경로: `.venv`
- 주 사용 자산:
  - FastAPI 앱
  - SQLAlchemy
  - 프로젝트 런타임 의존성
  - 루트 `modular.db`

## Rule

- Claude 하네스는 기본적으로 로컬 `claude` CLI 로그인 세션을 사용한다.
- 프로젝트 코드 실행, 테스트, 서버 실행은 기본적으로 `.venv/bin/python` 기준으로 명시한다.
- 프롬프트와 Bash 허용 범위에는 프로젝트 인터프리터 경로를 직접 적는다.
- 하네스 의존성을 프로젝트 `requirements.txt`에 합치지 않는다.
- 표준 작업은 `claude/jobs/*.json` 스펙으로 정의하고, `--job-type`으로 실행해 정책을 기본 적용한다.
- 하네스 실행 결과는 기본적으로 `claude/reviews/runs/` 아래 JSON 아티팩트로 남긴다.
- 코드 리뷰는 git diff가 아니라 지정한 결과물 경로를 기준으로 `claude/review_paths.sh`에서 수행한다.
- `review_paths`에서는 Codex가 호출기 역할만 맡고, Claude가 저장소 내부 문서와 관련 파일을 스스로 탐색하는 실제 리뷰어 역할을 맡는다.

## Why

- Pro/Max 구독자는 API 키 없이도 Claude CLI 로그인 세션으로 비대화형 실행 흐름을 만들 수 있다.
- 프로젝트 런타임을 깨뜨리지 않고 Claude 자동화를 반복 실행할 수 있다.
- 읽기/검색/수정과 실제 앱 실행을 분리해 사고 범위를 줄일 수 있다.

## Standard Commands

- 하네스 실행:
  - `claude/run.sh --job-type review --prompt-file claude/prompts/admin-auth-review.txt`
- 결과물 경로 리뷰:
  - `claude/review_paths.sh --path claude/run_cli.py`
  - `claude/review_paths.sh --mode full --path app/services/admin --context-path app/router`

## Prompt Writing Guidance

- 실행 명령은 `python`이나 `pytest`만 적지 말고 `.venv/bin/python -m ...` 형태로 적는다.
- 읽기 전용 검토인지, 편집 허용인지, Bash 허용 범위가 무엇인지 분명히 적는다.
- DB 기준은 루트 `modular.db`로 명시한다.
- 가능하면 프롬프트 파일만으로 정책을 중복 정의하지 말고 `--job-type`으로 작업 타입을 먼저 고정한다.
- 로컬 Claude 로그인 세션을 기준으로 비대화형 실행이 가능하도록 유지한다.
- 코드 리뷰 기본 경로는 `claude/review_paths.sh`이며, 프롬프트 파일은 반복 템플릿 작업에만 쓴다.

## Related Documents
- [claude/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/README.md)
- [claude/jobs/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/jobs/README.md)
- [claude/prompts/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/prompts/README.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
