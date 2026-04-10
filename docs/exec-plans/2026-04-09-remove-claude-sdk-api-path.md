# Execution Plan

## Task Title
- Claude SDK/API 경로 제거와 Pro CLI 하네스 기준 문서 정리

## Request Summary
- 기존 API와 SDK 관련 구현을 모두 삭제하고, 현재 문서도 Claude Pro 기반 CLI 하네스만 남도록 정리해 달라는 요청.

## Goal
- `claude/`에서 SDK/API 러너 파일과 관련 옵션을 제거한다.
- 현재 운영 문서에서 SDK/API 경로 설명을 삭제하고 Pro CLI 하네스 기준으로 통일한다.
- 기본 실행 경로와 자동 리뷰 파이프라인이 여전히 동작하는지 간단히 검증한다.

## Initial Hypothesis
- 현재 기본 경로가 이미 Pro 기반 CLI 러너이므로 SDK/API 경로 삭제는 비교적 단순하다.
- 다만 `run_cli.py`, `review_diff.py`, `run.sh`, `AGENTS.md`, `claude/*.md`에 남은 API/SDK 표현을 함께 정리해야 기준이 깔끔해진다.
- 실행 계획 문서는 역사 기록이므로 기존 작업 문서는 삭제하지 않고, 현재 기준 문서만 정리하는 편이 맞다.

## Initial Plan
1. SDK/API 파일과 참조 문서를 전부 식별한다.
2. SDK/API 파일과 옵션을 삭제하고, 현재 운영 문서를 Pro CLI 하네스 기준으로 수정한다.
3. 문법 검증과 짧은 Pro CLI 스모크 테스트를 수행한다.

## Progress Updates
### Update 1
- Time: 2026-04-09 13:54 KST
- Change: SDK/API 관련 파일 및 문서 참조 조사
- Reason: 삭제 대상과 현재 기준 문서를 분리해서 정리해야 불필요한 누락이 없다.

### Update 2
- Time: 2026-04-09 14:03 KST
- Change: SDK/API 파일 삭제, diff/hook 리뷰 경로 제거, 결과물 경로 리뷰용 `review_paths` 하네스 추가, 현재 문서 정리
- Reason: 사용자가 원하는 검토 흐름은 git diff 기반이 아니라 수정/생성된 결과물 자체를 Claude가 구조와 품질 관점에서 검토하는 방식이기 때문이다.

## Result
- `claude/run_sdk.py`, `claude/run_sdk.sh`를 삭제했다.
- `claude/review_diff.py`, `claude/review_diff.sh`, post-commit hook 관련 스크립트를 삭제했다.
- `claude/review_paths.py`, `claude/review_paths.sh`를 추가해 git 상태와 무관하게 파일/디렉터리 경로 기준 리뷰를 수행하도록 바꿨다.
- `claude/README.md`, `claude/HARNESS.md`, `claude/prompts/README.md`, `claude/jobs/README.md`, `docs/README.md`, `AGENTS.md`를 현재 Pro CLI + 결과물 리뷰 기준으로 정리했다.

## Verification
- Checked:
- Not checked:

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 작업 완료 후 작성

### Why
- 작업 완료 후 작성

### Next Time
- 작업 완료 후 작성

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
