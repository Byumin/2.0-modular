# Execution Plan

## Task Title
- 현재 운영 기준 기준점으로 문서 정리 후보 검토

## Request Summary
- 프로젝트 내 문서들을 확인해 쓸모없거나 현재 기준과 어긋난 내용을 정리하고, 실제 수정 전에 삭제 후보와 추가/수정 후보를 먼저 사용자에게 보여 달라는 요청.

## Goal
- 현재 운영 기준과 맞지 않는 문서 내용을 식별한다.
- 삭제 후보, 축약 후보, 추가/수정 후보를 문서별로 정리한다.
- 사용자 확인 전에는 실제 문서 편집을 하지 않는다.

## Initial Hypothesis
- 최근 Claude 하네스 구조 변경 이후 `claude/`, `ARCHITECTURE.md`, `docs/README.md`, 일부 실행 계획 문서 사이에 현재 운영 기준과 맞지 않는 표현이 남아 있을 가능성이 높다.
- 현재 운영 문서와 역사성 문서를 구분해서 봐야 불필요한 삭제를 피할 수 있다.

## Initial Plan
1. 운영 기준 문서와 관련 허브 문서를 우선 훑어 현재 구조와 어긋나는 표현을 찾는다.
2. 삭제 후보와 추가/수정 후보를 문서별로 정리한다.
3. 사용자 확인 후 실제 문서 수정에 들어간다.

## Progress Updates
### Update 1
- Time: 2026-04-09 15:22 KST
- Change: 실행 계획 문서 작성
- Reason: 저장소 규칙상 실제 문서 정리 작업 전 계획 문서를 먼저 남긴다.

### Update 2
- Time: 2026-04-09 15:46 KST
- Change: 사용자 확인 후 현재 Claude 하네스 기준에 맞춰 운영 문서를 실제 정리하기로 전환
- Reason: 검토 단계가 끝났고, 중복/구식 내용을 줄여 현재 운영 흐름을 문서에 반영해야 한다.

## Result
- `claude/README.md`, `claude/HARNESS.md`, `claude/prompts/README.md`, `docs/README.md`, `ARCHITECTURE.md`, `AGENTS.md`를 현재 Claude 하네스 기준으로 정리했다.
- 구식 `artifacts/claude-auth-review.json` 예시를 제거했다.
- 코드 리뷰 기본 흐름이 `git diff`가 아니라 `claude/review_paths.sh` 기반 결과물 경로 리뷰라는 점을 허브 문서들에 반영했다.
- Claude 리뷰 결과 저장 위치가 `claude/reviews/runs/`라는 점을 문서 전반에 맞췄다.

## Verification
- Checked:
- `claude/README.md`, `claude/HARNESS.md`, `claude/prompts/README.md`, `docs/README.md`, `ARCHITECTURE.md`, `AGENTS.md`의 현재 문구와 상호 정합성을 수동 점검했다.
- 구식 `artifacts/claude-auth-review.json` 예시가 제거됐는지 확인했다.
- `docs/README.md`의 LLM 자동화 읽기 순서가 `review_paths` 중심으로 바뀌었는지 확인했다.
- Not checked:
- 별도 자동 링크 검사 도구나 문서 lint는 실행하지 않았다.

## Retrospective
### Classification
- `Execution Judgment`

### What Was Wrong
- 초기 계획 문서 단계에서는 실제 수정 전 후보 정리까지만 잡았고, 운영 문서 사이의 중복 서술을 얼마나 줄일지 명확히 써두지 않았다.

### Why
- 최근 Claude 하네스 구조가 빠르게 바뀌면서 허브 문서와 세부 문서 사이에 설명 중복과 구식 예시가 동시에 남았다.

### Next Time
- 문서 정리 작업은 처음부터 `현재 기준 반영`, `중복 축약`, `구식 예시 제거`를 분리된 체크리스트로 두고 시작한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
