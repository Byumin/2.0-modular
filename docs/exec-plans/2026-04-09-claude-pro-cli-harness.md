# Execution Plan

## Task Title
- Claude Pro 기반 CLI 하네스와 git diff 자동 리뷰 파이프라인 반영

## Request Summary
- Claude Pro 구독을 활용할 수 있도록 SDK/API 기반 하네스 외에 Claude Code CLI headless 기반 하네스를 설계하고 반영한다.
- Codex CLI 작업 결과를 바탕으로 git diff를 자동 리뷰하는 파이프라인까지 함께 설계하고 반영한다.
- 작업 완료 후 간단한 테스트도 수행한다.

## Goal
- 기본 `claude/run.sh` 진입점을 Pro 친화적인 `claude -p` 기반 러너로 전환한다.
- 기존 SDK/API 방식은 보조 진입점으로 유지해 두 경로를 모두 지원한다.
- git diff를 기준으로 Claude 리뷰를 수행하는 스크립트와 선택적 post-commit hook 설치 스크립트를 추가한다.
- 문서와 실행 예시를 새 구조 기준으로 정리한다.

## Initial Hypothesis
- 현재 저장소는 작업 타입 스펙과 아티팩트 저장 구조가 이미 있어 Claude CLI headless 경로를 같은 모델로 붙이기 쉽다.
- `claude -p`는 로컬 로그인 세션 기반으로 동작하므로, Pro 사용자는 API 키 없이도 비대화형 리뷰 흐름을 만들 수 있다.
- 자동 리뷰는 무조건 켜는 것보다 `git diff` 리뷰 스크립트와 선택적 git hook 설치 경로를 제공하는 편이 안전하다.

## Initial Plan
1. Claude CLI 인증/헤드리스 옵션과 기존 하네스 구조를 확인한다.
2. Pro 기반 CLI 러너, diff 리뷰 스크립트, hook 설치 스크립트를 추가하고 `run.sh` 기본 진입점을 전환한다.
3. 관련 문서와 `.gitignore`를 갱신하고, 문법 검증과 간단한 CLI 테스트를 수행한다.

## Progress Updates
### Update 1
- Time: 2026-04-09 13:10 KST
- Change: Claude CLI 설치/도움말 및 기존 하네스 구조 확인
- Reason: `claude -p` 기반으로 실제 전환 가능한지와 로컬 CLI 사용 가능 여부를 먼저 확인해야 했다.

### Update 2
- Time: 2026-04-09 13:23 KST
- Change: Pro 기본 `claude -p` 러너, SDK 보조 진입점, diff 리뷰 스크립트, post-commit hook 설치 스크립트, 문서/ignore 반영
- Reason: Pro 구독 기반 비대화형 사용과 자동 리뷰 파이프라인을 함께 제공하려면 실행 경로와 문서를 동시에 전환해야 한다.

## Result
- `claude/run.sh` 기본 진입점을 Pro 친화적인 Claude CLI headless 러너로 바꿨다.
- `claude/run_sdk.sh`를 추가해 기존 SDK/API 경로도 유지했다.
- `claude/run_cli.py`가 작업 타입 스펙, 프롬프트 주입, 아티팩트 저장을 Claude CLI 경로에서도 공통 적용하도록 만들었다.
- `claude/review_diff.py`와 `claude/review_diff.sh`를 추가해 현재 git diff를 Claude 리뷰 프롬프트로 감싼 뒤 비대화형 리뷰를 실행할 수 있게 했다.
- `claude/review_diff.py`에 `--path` 필터를 추가해 전체 변경분이 큰 경우 작은 범위로 자동 리뷰를 실행할 수 있게 했다.
- `claude/review_diff.py`가 untracked 파일도 함께 수집하도록 보강해 새로 만든 파일도 자동 리뷰 대상에 포함되게 했다.
- `claude/hooks/post-commit-review.sh`와 `claude/install_post_commit_hook.sh`를 추가해 선택적으로 커밋 직후 자동 리뷰를 걸 수 있게 했다.
- `artifacts/claude-runs/`를 `.gitignore`에 추가하고 관련 문서를 새 구조 기준으로 갱신했다.
- 실테스트 중 Claude CLI가 `--cwd` 옵션을 지원하지 않는 점을 확인했고, 러너를 subprocess 작업 디렉터리 기준으로 수정했다.
- Claude가 자동 리뷰한 결과를 반영해 `run_cli.py`에 작업 디렉터리 제한, `run_id` 정규화, `--print-command` 프롬프트 마스킹, auth mode 기록 정확화, job spec JSON 에러 처리를 추가했다.

## Verification
- Checked:
- `claude --help`
- `claude auth status`
- `python3 -m py_compile claude/run_cli.py claude/run_sdk.py claude/review_diff.py`
- `bash -n claude/run.sh claude/run_sdk.sh claude/review_diff.sh claude/hooks/post-commit-review.sh claude/install_post_commit_hook.sh`
- `./claude/run.sh --help`
- `timeout 30s ./claude/run.sh --job-type review --run-id test-pro-review-escalated "Reply with exactly OK."` (sandbox 외부)
- `timeout 30s ./claude/run.sh --job-type review --run-id test-pro-review-final --effort low "Reply with exactly OK."` (sandbox 외부)
- `timeout 90s ./claude/review_diff.sh --name-only --path claude/run_cli.py --run-id test-diff-review-filtered-4 --effort low` (sandbox 외부)
- 생성 아티팩트 확인:
- `artifacts/claude-runs/test-pro-review-escalated.json`
- `artifacts/claude-runs/test-pro-review-final.json`
- `artifacts/claude-runs/test-diff-review-filtered-4.json`
- Not checked:
- post-commit hook 설치 후 실제 git commit 직후 자동 리뷰 동작
- full patch 모드에서 큰 diff에 대한 응답 시간 최적화
- SDK/API 러너와 CLI 러너를 혼합 운영할 때의 장기 회귀 테스트

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 초기 CLI 러너 구현에서 `claude` CLI가 지원하지 않는 `--cwd` 옵션을 잘못 가정했다.
- 초기 diff 리뷰 파이프라인은 전체 변경분과 untracked 파일을 충분히 고려하지 못했다.

### Why
- SDK 러너 구조를 빠르게 CLI로 옮기면서 SDK와 CLI 옵션 차이를 일부 동일하게 가정했다.
- 실제 저장소 상태가 `tracked diff + untracked 신규 파일` 혼합이라는 점을 처음부터 반영하지 못했다.

### Next Time
- Claude CLI 기반 하네스는 설계 직후 바로 짧은 실호출 테스트를 먼저 붙여 CLI 옵션 차이를 조기에 잡는다.
- diff 리뷰 파이프라인은 초기에부터 `tracked`, `staged`, `untracked`, `path-filtered` 케이스를 분리해 검증한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
