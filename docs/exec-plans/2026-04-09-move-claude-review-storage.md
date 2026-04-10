# Execution Plan

## Task Title
- Claude 리뷰 결과 저장 경로를 `claude/reviews/runs`로 이동

## Request Summary
- Claude 리뷰 결과가 `artifacts/` 대신 더 직관적인 Claude 전용 경로에 저장되도록 구조를 바꾸고, 기존 결과도 옮겨 달라는 요청.

## Goal
- 기본 리뷰 결과 저장 경로를 `claude/reviews/runs/`로 변경한다.
- 현재 운영 문서와 ignore 설정을 새 경로 기준으로 정리한다.
- 기존 `artifacts/claude-runs/` 아래 리뷰 JSON을 새 경로로 이동한다.

## Initial Hypothesis
- 현재 리뷰 결과는 Claude 하네스 산출물에 더 가깝기 때문에 `claude/reviews/runs/`가 `artifacts/`보다 직관적이다.
- 기본 저장 경로는 `run_cli.py` 한 곳에서 바꾸면 되고, 문서와 `.gitignore`만 함께 정리하면 된다.
- 기존 JSON 파일은 그대로 이동만 하면 된다.

## Initial Plan
1. 현재 `artifacts/claude-runs/`를 참조하는 코드와 문서를 찾는다.
2. 기본 저장 경로와 문서를 `claude/reviews/runs/`로 수정한다.
3. 기존 JSON 파일을 새 경로로 이동하고 간단히 확인한다.

## Progress Updates
### Update 1
- Time: 2026-04-09 14:27 KST
- Change: 경로 참조와 기존 리뷰 JSON 파일 목록 확인
- Reason: 저장 경로 변경 전 영향 범위와 이동 대상 파일을 먼저 확인해야 한다.

### Update 2
- Time: 2026-04-09 14:31 KST
- Change: 기본 저장 경로와 운영 문서를 `claude/reviews/runs/` 기준으로 수정
- Reason: Claude 하네스 결과를 도구 정의와 가까운 전용 경로에 모아두는 편이 더 직관적이다.

## Result
- `run_cli.py`의 기본 리뷰 결과 저장 경로를 `claude/reviews/runs/`로 변경했다.
- `claude/README.md`, `claude/HARNESS.md`, `.gitignore`를 새 저장 경로 기준으로 정리했다.
- 기존 `artifacts/claude-runs/` 아래 리뷰 JSON 파일들을 `claude/reviews/runs/`로 이동했다.

## Verification
- Checked:
- `python3 -m py_compile claude/run_cli.py`
- `find artifacts/claude-runs -maxdepth 1 -type f`
- `find claude/reviews/runs -maxdepth 1 -type f`
- Not checked:
- 새 경로 기준으로 추가 리뷰 1회 재실행

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 큰 문제는 없었다.

### Why
- 기본 저장 경로가 한 파일에 집중되어 있었고, 기존 JSON 파일도 단순 이동으로 정리할 수 있었다.

### Next Time
- Claude 하네스 결과물은 처음부터 `claude/` 아래 전용 저장 경로를 사용해 도구 정의와 결과를 함께 찾기 쉽게 유지한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
