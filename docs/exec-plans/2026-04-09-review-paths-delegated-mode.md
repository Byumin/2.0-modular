# Execution Plan

## Task Title
- Claude 경로 리뷰 하네스를 위임형 간단 호출 구조로 전환

## Request Summary
- Codex가 코드와 문서를 과하게 미리 찾아서 넘기지 말고, 간단한 리뷰 요청만 전달한 뒤 Claude가 저장소 내부 문서와 관련 파일을 스스로 확인하며 진행하게 해 달라는 요청.

## Goal
- `review_paths` 프롬프트를 더 짧고 위임형으로 단순화한다.
- `quick` / `full` 리뷰 모드를 추가해 응답 깊이를 선택할 수 있게 한다.
- 문서와 사용 예시를 새 리뷰 방식 기준으로 정리한다.

## Initial Hypothesis
- 현재 `review_paths`는 대상 경로를 넘기는 구조 자체는 맞지만, 프롬프트가 비교적 상세해서 Codex가 중간 설계를 많이 하는 것처럼 보일 수 있다.
- Claude가 `AGENTS.md`와 관련 문서를 직접 따라가도록 역할을 명시하면 사용자의 기대와 더 잘 맞는다.
- 기본 모드를 `quick`으로 두면 실제 리뷰 응답도 더 짧고 안정적으로 회수하기 쉽다.

## Initial Plan
1. `review_paths.py`의 프롬프트와 인자를 단순화한다.
2. `quick` / `full` 모드와 문서 예시를 추가한다.
3. 문법 검증과 간단한 CLI 도움말 확인을 수행한다.

## Progress Updates
### Update 1
- Time: 2026-04-09 15:07 KST
- Change: 현재 `review_paths` 프롬프트와 문서 확인
- Reason: 어느 부분이 과하게 상세한지 확인한 뒤 위임형 구조로 줄여야 한다.

### Update 2
- Time: 2026-04-09 15:12 KST
- Change: `review_paths` 프롬프트를 위임형 간단 호출 구조로 축약하고 `quick`/`full` 모드, 문서 예시를 추가
- Reason: Codex는 대상 경로만 넘기고 Claude가 관련 코드와 문서를 스스로 따라가며 리뷰하도록 역할을 더 분명히 나누기 위해서다.

## Result
- `review_paths.py`에 `--mode quick|full`을 추가했다.
- 기본 프롬프트를 짧게 줄이고, 관련 파일과 저장소 문서는 Claude가 직접 탐색하도록 지시하는 구조로 바꿨다.
- `quick`은 핵심 이슈 3개 중심, `full`은 더 넓은 관련 파일 추적과 상세 리뷰를 요청하도록 분리했다.
- `claude/README.md`, `claude/HARNESS.md`, `claude/prompts/README.md`, `claude/jobs/README.md`를 새 리뷰 방식 기준으로 정리했다.

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
