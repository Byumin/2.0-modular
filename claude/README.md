# Claude Harness Runner

이 문서는 Claude 자동화 문서군의 진입점이다. 빠르게 실행 방법을 찾을 때 먼저 본다.

## Read This As A Map

- [claude/HARNESS.md](/mnt/c/Users/user/workspace/2.0-modular/claude/HARNESS.md): 왜 하네스 환경과 프로젝트 환경을 분리하는지, 런타임 경계가 무엇인지
- [claude/jobs/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/jobs/README.md): `--job-type` 스펙과 표준 작업 타입
- [claude/prompts/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/prompts/README.md): 반복 실행용 프롬프트 자산

## Quick Start

- 기본 진입점: `claude/run.sh`
- 결과물 경로 리뷰: `claude/review_paths.sh`
- 프로젝트 실행이 필요하면 명령은 `.venv/bin/python ...` 형태로 명시

## Minimal Usage

- 읽기 전용 검토:
  - `claude/run.sh --job-type review --prompt-file claude/prompts/admin-auth-review.txt`
- 테스트 실행:
  - `claude/run.sh --job-type test-run --prompt-file claude/prompts/project-test-review.txt`
- 코드 수정:
  - `claude/run.sh --job-type fix "Fix the failing authentication code and verify with .venv/bin/python."`
- 결과물 경로 리뷰:
  - `claude/review_paths.sh --mode quick --path app/services/admin/custom_tests.py`

## Operational Rules

- 기본 하네스 실행은 로컬 `claude` CLI 로그인 세션 기준이다.
- 프로젝트 런타임은 `.venv` 기준으로 분리한다.
- 작업 타입별 권한과 보고 형식은 문서가 아니라 `claude/jobs/*.json` 스펙을 기준으로 본다.
- 기본 결과 아티팩트는 `claude/reviews/runs/` 아래에 저장된다.

## What This README Does Not Repeat

- 환경 분리의 상세 설계는 `HARNESS.md`에서 본다.
- 표준 작업 타입 상세는 `jobs/README.md`에서 본다.
- 프롬프트 작성 규칙은 `prompts/README.md`에서 본다.
- 같은 원칙을 이 문서에 다시 길게 복붙하지 않는다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [claude/HARNESS.md](/mnt/c/Users/user/workspace/2.0-modular/claude/HARNESS.md)
- [claude/jobs/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/jobs/README.md)
- [claude/prompts/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/prompts/README.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
