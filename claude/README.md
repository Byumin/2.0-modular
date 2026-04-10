# Claude Harness Runner

이 문서는 이 저장소에서 Claude 자동화를 하네스 환경과 프로젝트 환경으로 분리해 사용하는 기준을 정리한다.
기본 진입점은 Claude Pro/Max 로그인 세션을 활용하는 Claude Code CLI headless 실행이다.

## Script

- `claude/run.sh`
- `claude/run_cli.py`
- `claude/review_paths.sh`
- `claude/jobs/`

## Prerequisite

- Node.js 18+
- Claude Code CLI 설치:
  - `npm install -g @anthropic-ai/claude-code`
- Claude Pro/Max 또는 로컬 Claude 인증:
  - `claude auth login`

## Environment Model

- 기본 하네스 실행: 로컬 `claude` CLI 로그인 세션
- 대상 프로젝트 환경: `.venv`
- Claude 자체 실행은 `claude/run.sh`를 기본 진입점으로 사용한다.
- 프로젝트 실행이 필요하면 프롬프트에 `.venv/bin/python ...` 형태로 명시한다.
- 표준 작업은 `--job-type`으로 실행해 작업별 정책과 결과 형식을 하네스가 기본 적용한다.

자세한 설계는 [claude/HARNESS.md](/mnt/c/Users/user/workspace/2.0-modular/claude/HARNESS.md)를 본다.

## Default Behavior

- 기본 작업 디렉터리는 저장소 루트다.
- 작업 타입이 없으면 기본 허용 도구는 `Read`, `Glob`, `Grep`만 연다.
- 작업 타입이 있으면 `claude/jobs/*.json` 스펙이 허용 도구와 기본 권한 모드를 결정한다.
- 하네스는 `ANTHROPIC_API_KEY`를 자식 프로세스에 넘기지 않아 로컬 Claude 로그인 세션을 기준으로 동작한다.
- 기본적으로 `claude/reviews/runs/`에 구조화된 실행 아티팩트를 남긴다.

## Standard Job Types

- `review`: 읽기 전용 구조 검토
- `fix`: 코드 수정과 프로젝트 검증
- `test-run`: `.venv/bin/python` 기반 테스트 실행
- `ui-debug`: 수정 전/후 스크린샷 검증이 필요한 UI 작업
- `db-audit`: `modular.db` 기준 DB 점검

## Usage

- 읽기 전용 설계 검토:
  - `claude/run.sh --job-type review "Read app/main.py, app/router, app/services/admin and review architecture risks."`

- 파일에서 프롬프트 읽기:
  - `claude/run.sh --job-type review --prompt-file claude/prompts/admin-auth-review.txt`

- 프로젝트 환경으로 테스트 실행:
  - `claude/run.sh --job-type test-run --prompt-file claude/prompts/project-test-review.txt`

- 편집 허용:
  - `claude/run.sh --job-type fix "Fix the failing authentication code and summarize changes. When running project code, use .venv/bin/python."`

- UI 디버그:
  - `claude/run.sh --job-type ui-debug "Verify the reported admin layout issue, capture before/after screenshots, fix it, and summarize the outcome."`

- 특정 결과물 경로 리뷰:
  - `claude/review_paths.sh --path claude/run_cli.py`

- 빠른 코드 리뷰:
  - `claude/review_paths.sh --mode quick --path app/services/admin/custom_tests.py`

- 깊은 코드 리뷰:
  - `claude/review_paths.sh --mode full --path app/services/admin --context-path app/router --change-summary "Admin auth flow was refactored."`

## Notes

- 기본 경로는 Claude Code CLI headless 실행이다.
- 위험한 권한은 기본으로 열지 않는다. 특히 `Write`, `Edit`, `Bash`, `bypassPermissions`는 작업 범위를 분명히 한 뒤에만 사용한다.
- `--job-type`을 쓰면 추가 `--allowed-tool`은 해당 작업 스펙에 이미 등록된 항목만 허용된다.
- 실행 메타데이터와 최종 결과는 기본적으로 `claude/reviews/runs/<run-id>.json`에 저장된다.
- `claude/review_paths.sh`는 git diff가 아니라 지정한 파일/디렉터리 결과물을 기준으로 Claude 리뷰를 수행한다.
- 이 경로에서는 Codex가 파일 내용을 길게 재구성하지 않고, 대상 경로만 전달한 뒤 Claude가 관련 파일과 문서를 스스로 따라가며 리뷰하게 하는 것이 기본이다.
- `--mode quick`은 핵심 이슈 3개 중심의 짧은 리뷰, `--mode full`은 관련 파일과 문서를 더 넓게 따라가는 깊은 리뷰다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [claude/HARNESS.md](/mnt/c/Users/user/workspace/2.0-modular/claude/HARNESS.md)
- [claude/jobs/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/jobs/README.md)
- [claude/prompts/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/prompts/README.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
