# Execution Plan

## Task Title
- 프로젝트 .md 문서 중복/충돌 정리

## Request Summary
- 프로젝트 내 .md 파일들을 검토한 결과 발견된 중복 내용들을 정리한다.

## Goal
- 동일 내용이 여러 문서에 분산되어 유지보수 위험을 만드는 구조를 제거한다.
- 각 문서의 역할 경계를 명확히 한다.

## Initial Hypothesis
- `AGENTS.md`가 요약 + 포인터 역할을 의도했으나 실제로는 상세 규칙을 직접 들고 있어 `ARCHITECTURE.md`와 중복 발생
- `explanation-rule.md`와 `interactive-flow-spec.md`의 Step/Example 규칙이 복붙 수준으로 동일
- UI Debug Rule이 `AGENTS.md`와 `QUALIT_SCORE.md` 양쪽에 선언됨

## Initial Plan
1. `AGENTS.md`의 Project Overview / Folder Structure / DB Rule → 상세 내용 제거, ARCHITECTURE.md 참조로 축소
2. `AGENTS.md`의 UI Debug Rule → QUALIT_SCORE.md 참조로 축소
3. `explanation-rule.md`의 Step Granularity Rule / Example Coverage Rule → interactive-flow-spec.md 기준이 아닌 텍스트 설명 맥락에 맞게 문구 차별화 (완전 삭제 불가 — 맥락이 다름)

## Progress Updates
### Update 1
- Time: 2026-04-10
- Change: 계획대로 진행. explanation-rule.md의 Step/Example Rule은 삭제 대신 "텍스트 설명 기준임"을 명시하고 interactive-flow-spec.md를 참조하는 방식으로 차별화.
- Reason: 맥락(텍스트 vs 웹 UI)이 다르므로 완전 삭제 시 explanation-rule.md 단독으로는 불완전해짐.

### Update 2
- Time: 2026-04-10
- Change: `docs/database/README.md`를 지도 문서로 축소하고 `runtime-db.md`를 DB 운영 기준 source of truth로 명시
- Reason: DB 기준 문서군의 중복을 줄이고, 운영 기준 변경 시 수정 지점을 줄이기 위해서

### Update 3
- Time: 2026-04-10
- Change: `AGENTS.md`의 Code Cleanup Rule에서 상세 시각 규칙 반복을 제거하고 전담 문서 포인터만 남김
- Reason: 루트 규칙 문서가 다시 상세 규칙 source처럼 보이는 문제를 줄이기 위해서

### Update 4
- Time: 2026-04-10
- Change: `claude/README.md`를 진입점 문서로 축소하고 `claude/HARNESS.md`의 실행 예시 중복을 제거
- Reason: Claude 문서군의 quickstart/architecture 중복을 줄이고 역할을 분리하기 위해서

### Update 5
- Time: 2026-04-10
- Change: `docs/README.md`에서 코드 정리 문서군 링크를 `docs/code-cleanup/README.md` 중심으로 단순화
- Reason: 허브 문서와 하위 허브가 같은 경로를 길게 반복하는 문제를 줄이기 위해서

## Result
- `AGENTS.md`: Project Overview/Folder Structure/DB Rule/Working Assumption을 3줄 요약 + ARCHITECTURE.md 참조로 축소. UI Debug Rule을 1줄 요약 + QUALIT_SCORE.md 참조로 축소.
- `docs/debug/explanation-rule.md`: Step Granularity Rule / Example Coverage Rule 끝에 "이 규칙은 텍스트 설명 기준, 인터랙션 웹은 interactive-flow-spec.md 참조" 명시.
- `docs/database/README.md`: 허브/지도 문서로 단순화.
- `docs/database/runtime-db.md`: DB 운영 기준 source of truth임을 명시.
- `claude/README.md`: 진입점/quickstart 문서로 축소.
- `claude/HARNESS.md`: 설계 문서 역할만 남기고 실행 예시 반복을 제거.
- `docs/README.md`: 코드 정리 문서군 경로를 하위 허브 중심으로 정리.

## Verification
- Checked: AGENTS.md 최종 내용 확인, explanation-rule.md 최종 내용 확인
- Checked: database/claude/docs hub 문서 수정 후 최종 내용 확인
- Checked: `git diff`로 변경 범위 확인
- Not checked: 문서 허브 기준으로 신규 사용자가 실제 읽기 순서를 따라가며 탐색했을 때의 UX 테스트

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 여러 허브 문서와 규칙 문서가 같은 기준을 반복해 문서 간 drift 위험이 있었다.

### Why
- 새 규칙을 추가할 때 허브와 상세 문서에 동시에 같은 내용을 누적하는 방식이 반복됐다.

### Next Time
- AGENTS.md는 포인터/요약 역할로 유지. 상세 규칙은 전담 문서에서 관리하는 원칙 유지.
- 허브 문서에는 "무엇을 어디서 보라"만 남기고, 세부 기준은 source 문서 하나로 더 강하게 몰아준다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
- [docs/debug/explanation-rule.md](/mnt/c/Users/user/workspace/2.0-modular/docs/debug/explanation-rule.md)
- [docs/interactive-flow-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/interactive-flow-spec.md)
