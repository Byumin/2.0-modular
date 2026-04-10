# Execution Plan

## Task Title
- Claude 리뷰 결과 한글 출력 기준 반영

## Request Summary
- Claude 코드 리뷰 결과를 한글로 작성하도록 현재 하네스 프롬프트와 작업 타입 스펙을 수정해 달라는 요청.

## Goal
- `review_paths` 기반 리뷰 하네스가 기본적으로 한글 리뷰를 생성하게 만든다.
- `claude/jobs/*.json`의 리뷰 관련 프리앰블과 보고 섹션을 한글 기준으로 정리한다.
- 실제 경로 리뷰 스모크 테스트로 한글 응답이 나오는지 확인한다.

## Initial Hypothesis
- 현재 리뷰 결과가 영어로 나오는 가장 큰 이유는 `review_paths.py`의 기본 프롬프트와 `review.json`의 보고 형식이 영어이기 때문이다.
- 리뷰 관련 작업 타입 스펙에 “응답은 반드시 한국어”를 명시하면 기본 출력 언어를 안정적으로 바꿀 수 있다.
- 실제 스모크 테스트는 `review_paths.sh --path ... --effort low` 정도면 충분하다.

## Initial Plan
1. 리뷰 하네스와 작업 타입 스펙에서 영어 출력 유도 부분을 찾는다.
2. 한글 출력 지시와 한글 보고 형식으로 수정한다.
3. 문법 검증과 실제 짧은 리뷰 호출로 결과 언어를 확인한다.

## Progress Updates
### Update 1
- Time: 2026-04-09 14:16 KST
- Change: 리뷰 하네스와 작업 타입 스펙 조사
- Reason: 실제 출력 언어에 영향을 주는 프롬프트와 보고 형식을 먼저 좁혀야 한다.

### Update 2
- Time:
- Change:
- Reason:

## Result
- In progress

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
