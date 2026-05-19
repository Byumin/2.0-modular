# Execution Plan

## Task Title
- Claude 하네스 작업 타입 표준화와 정책 강제 구조 반영

## Request Summary
- 현재 경량 Claude 하네스를 더 완성형 하네스 엔지니어링에 가깝게 설계하고 실제 코드와 문서에 반영해 달라는 요청.

## Goal
- Claude 하네스에 작업 타입별 표준 실행 모델을 추가한다.
- 작업 타입별 허용 도구와 실행 규칙을 코드에서 기본 강제할 수 있게 만든다.
- 실행 결과를 구조화된 아티팩트로 남겨 재현성과 회고 가능성을 높인다.

## Initial Hypothesis
- 현재 구조는 환경 분리까지는 되어 있으나, 작업 종류와 정책 강제가 프롬프트/문서에 많이 의존한다.
- `run_sdk.py`에서 작업 타입 기반 설정을 읽도록 확장하면 문서 규칙을 실행 규칙으로 끌어올릴 수 있다.
- `artifacts/claude-runs/`에 실행 메타데이터와 결과를 자동 저장하면 하네스 운영성이 크게 좋아진다.

## Initial Plan
1. 현재 `claude/` 하네스 구조와 UI 캡처 도구 요구사항을 확인한다.
2. 작업 타입 스펙, 정책 병합, 실행 기록 저장 기능을 `claude/run_sdk.py` 중심으로 추가한다.
3. 관련 문서와 프롬프트 안내를 새 하네스 모델에 맞게 갱신하고 로컬 검증을 수행한다.

## Progress Updates
### Update 1
- Time: 2026-04-09 16:10 KST
- Change: 실행 계획 문서 작성 및 기존 하네스/프롬프트/UI 캡처 규칙 조사
- Reason: 저장소 규칙상 구조 변경 전 계획 문서를 먼저 남기고, `ui-debug` 타입에 필요한 실제 실행 범위를 확인해야 한다.

### Update 2
- Time: 2026-04-09 16:26 KST
- Change: `claude/jobs/` 작업 타입 스펙, `run_sdk.py` 정책 병합/아티팩트 저장 기능, 관련 README 문서 반영
- Reason: 작업 타입 표준화와 정책 강제, 구조화된 실행 기록을 하네스 코드와 사용 문서에 함께 연결해야 실사용 기준이 된다.

## Result
- `claude/jobs/` 아래에 `review`, `fix`, `test-run`, `ui-debug`, `db-audit` 작업 타입 스펙을 추가했다.
- `claude/run_sdk.py`가 `--job-type`을 읽어 허용 도구, 기본 권한 모드, 기본 턴 수, 프롬프트 프리앰블, 보고 형식을 작업별로 자동 적용하게 만들었다.
- 작업 타입을 지정하면 임의의 추가 허용 도구를 막아 표준 정책 바깥의 권한 확장을 기본 차단하도록 했다.
- 모든 실행 결과를 기본적으로 `artifacts/claude-runs/<run-id>.json`에 저장하도록 바꿨다.
- `claude/README.md`, `claude/HARNESS.md`, `claude/prompts/README.md`, `docs/README.md`를 새 구조에 맞게 갱신했다.
- 스모크 검증용 아티팩트 `artifacts/claude-runs/smoke-review.json`이 실제로 생성되는 것까지 확인했다.

## Verification
- Checked:
- `python3 -m py_compile claude/run_sdk.py`
- `./claude/run.sh --help`
- `env -u ANTHROPIC_API_KEY ./claude/run.sh --job-type review --run-id smoke-review "Inspect the repository."`
- `env -u ANTHROPIC_API_KEY ./claude/run.sh --job-type review --allowed-tool Edit "Inspect the repository."`
- `artifacts/claude-runs/smoke-review.json` 내용 수동 확인
- `env -u ANTHROPIC_API_KEY ./claude/run.sh --job-type review --run-id test-review-live --prompt-file claude/prompts/admin-auth-review.txt`
- `env -u ANTHROPIC_API_KEY ./claude/run.sh --job-type fix --allowed-tool "Bash(node:*)" "Try to run a fix job."`
- `artifacts/claude-runs/test-review-live.json` 내용 수동 확인
- Not checked:
- 실제 Anthropic API 호출이 포함된 end-to-end 실행
- 각 작업 타입에서 Claude SDK의 실제 `Bash(...)` 도구 규칙 매칭 세부 동작

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 큰 문제는 없었다.

### Why
- 기존 하네스가 이미 환경 분리 구조를 갖고 있었기 때문에, 작업 타입 표준화와 실행 기록 계층을 그 위에 확장하는 방식으로 무리 없이 반영할 수 있었다.

### Next Time
- 실제 운영에서 자주 쓰는 작업 흐름을 기준으로 작업 타입별 결과 스키마를 더 엄격하게 나누고, 필요하면 후속 자동 검증 단계까지 추가한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
