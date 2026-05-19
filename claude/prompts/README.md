# Claude Prompt Assets

이 디렉터리는 Claude 비대화형 실행에서 재사용할 프롬프트 자산을 보관한다.

## Purpose

- 반복 템플릿 작업의 프롬프트를 파일로 고정한다.
- 권한 범위와 검토 범위를 프롬프트 수준에서도 명확히 남긴다.
- 설계 검토, 테스트 실행, 로그 분석 같은 작업을 일관된 형식으로 재실행할 수 있게 한다.

## Files

- `admin-auth-review.txt`: 관리자 인증 구조와 위험 요소를 읽기 전용으로 검토하는 예시 프롬프트
- `project-test-review.txt`: Claude는 하네스 환경에서 실행하고, 프로젝트 테스트는 `.venv/bin/python`으로 실행하도록 고정한 예시 프롬프트

## Usage

- `claude/run.sh --job-type review --prompt-file claude/prompts/admin-auth-review.txt`
- `claude/run.sh --job-type test-run --prompt-file claude/prompts/project-test-review.txt`

## Writing Rule

- 프롬프트에는 검토 대상 경로를 명시한다.
- 수정 금지인지, 읽기 전용인지, 실행 허용 범위가 무엇인지 적는다.
- 프로젝트 실행이 필요하면 `.venv/bin/python` 같은 대상 프로젝트 인터프리터를 직접 적는다.
- 결과 형식 요구가 있으면 항목 단위로 분명히 적는다.
- 반복 작업은 프롬프트 파일만 만들지 말고 대응되는 `--job-type`과 함께 사용한다.
- 결과물 리뷰는 프롬프트 파일보다 `claude/review_paths.sh`처럼 대상 경로를 직접 넘기는 하네스 진입점을 우선 사용한다.
- 결과물 리뷰에서는 Codex가 파일 내용을 다시 길게 요약해 넘기기보다, Claude가 대상 경로와 관련 문서를 스스로 탐색하게 두는 방식을 기본으로 한다.
- 즉 프롬프트 파일은 반복 템플릿용이고, 실제 코드 리뷰 기본 경로는 `claude/review_paths.sh`다.

## Related Documents
- [claude/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/README.md)
- [claude/HARNESS.md](/mnt/c/Users/user/workspace/2.0-modular/claude/HARNESS.md)
- [claude/jobs/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/jobs/README.md)
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
