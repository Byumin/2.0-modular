# Claude Job Specs

이 디렉터리는 Claude 하네스의 표준 작업 타입 스펙을 보관한다.

## Purpose

- 프롬프트 템플릿과 별도로 작업 타입별 실행 정책을 고정한다.
- 허용 도구, 기본 권한 모드, 보고 형식을 문서가 아니라 하네스 코드에서 기본 적용한다.
- 같은 작업을 다시 실행해도 같은 제약과 같은 결과 구조를 기대할 수 있게 한다.

## Files

- `review.json`: 읽기 전용 구조 검토 작업
- `fix.json`: 코드 수정과 프로젝트 검증이 필요한 작업
- `test-run.json`: 프로젝트 테스트 실행과 실패 분석 작업
- `ui-debug.json`: 수정 전후 확인과 스크린샷 캡처가 포함되는 UI 작업
- `db-audit.json`: `modular.db` 기준의 DB 확인 작업

## Rule

- 각 스펙은 `job_type`, `allowed_tools`, `permission_mode`, `max_turns`를 가진다.
- `prompt_preamble`은 모든 사용자 프롬프트 앞에 자동으로 붙는다.
- `report_sections`는 결과 보고 기본 형식을 고정한다.
- 작업 타입을 지정하면 CLI의 추가 `--allowed-tool`은 스펙에 이미 있는 값만 허용된다.

## Usage

- `claude/run.sh --job-type review --prompt-file claude/prompts/admin-auth-review.txt`
- `claude/run.sh --job-type test-run --prompt-file claude/prompts/project-test-review.txt`
- `claude/run.sh --job-type fix "Fix the failing admin auth flow and verify with .venv/bin/python."`
- `claude/review_paths.sh --job-type review --mode quick --path app/services/admin`
- `claude/review_paths.sh --job-type review --mode full --path app/services/admin --context-path app/router`

## Related Documents
- [claude/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/README.md)
- [claude/HARNESS.md](/mnt/c/Users/user/workspace/2.0-modular/claude/HARNESS.md)
- [claude/prompts/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/prompts/README.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
