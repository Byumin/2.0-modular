# Execution Plan

## Task Title
- 인적사항 관찰자 선택지 표시 순서 조정

## Request Summary
- 인적사항 입력 화면에서 관찰자 선택지가 `아버지`, `어머니`, `기타` 순서로 보이도록 변경한다.
- 작업 전 기존 하네스 문서와 Markdown/source-of-truth 규칙을 확인한다.

## Goal
- 서버가 내려주는 `informant` option 배열 순서와 무관하게 수검자 인적사항 화면의 관찰자 라디오 버튼 표시 순서를 `father`, `mother`, `etc`로 고정한다.
- 기존 profile 저장 값과 매칭 값은 변경하지 않고 화면 표시 순서만 조정한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: `ARCHITECTURE.md`
  - UI/디자인: `DESIGN.md`, `QUALIT_SCORE.md`
  - 문서 체계: `docs/doc-governance.md`
  - 설명/디버깅: `docs/debug/explanation-rule.md`
  - 하네스: `claude/README.md`, `claude/HARNESS.md`, `claude/jobs/README.md`
- [x] 운영 DB가 필요한 작업이면 루트 `modular.db` 기준 확인: DB 변경 없음
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- `frontend/src/pages/assessment/steps/ProfileStep.tsx`가 `payload.profile_field_options.informant` 순서를 그대로 렌더링하고 있다.
- 백엔드 조건 데이터에는 `etc,father,mother`처럼 표시 목적과 다른 순서가 존재하므로, 프론트에서 표시 전 정렬하는 것이 가장 좁은 변경이다.

## Initial Plan
1. `ProfileStep.tsx`에서 관찰자 표시 우선순위를 정의한다.
2. `payload.profile_field_options.informant`를 렌더링 전에 중복 제거 및 우선순위 정렬한다.
3. 프론트 빌드와 가능하면 화면 캡처로 순서를 확인한다.

## Progress Updates
### Update 1
- Time: 2026-05-06
- Change: 저장소 규칙, UI 규칙, 하네스 규칙, 기존 informant 실행계획을 확인했다.
- Reason: 이전 informant 작업 회고에서 사전 규칙 확인과 UI 스크린샷 누락이 문제로 남아 있어 동일 실수를 피하기 위함.

### Update 2
- Time: 2026-05-06
- Change: `ProfileStep.tsx`에 관찰자 표시 우선순위 `father -> mother -> etc`를 추가하고, 렌더링 전 중복 제거 및 정렬을 적용했다.
- Reason: 백엔드 조건 데이터의 `informant` 배열 순서가 화면 표시 순서와 다를 수 있으므로 표시 계층에서만 순서를 고정한다.

### Update 3
- Time: 2026-05-06
- Change: 수정 전/후 스크린샷과 라벨 배열을 Playwright로 확인했다. Vite HMR 세션이 이전 번들을 보여 개발 서버를 재시작한 뒤 재확인했다.
- Reason: `QUALIT_SCORE.md`의 UI 변경 검증 순서를 맞추고, 실제 수검자 화면의 DOM 순서를 확인하기 위함.

## Result
- 인적사항 입력 화면의 관찰자 선택지 표시 순서가 `아버지`, `어머니`, `기타`로 변경됐다.
- profile에 저장되는 값은 기존 `father`, `mother`, `etc`를 그대로 유지한다.

## Verification
- Checked:
  - 수정 전 Playwright 확인: `["기타","아버지","어머니"]`
  - 수정 후 FastAPI 빌드 산출물 확인: `["아버지","어머니","기타"]`
  - 수정 후 Vite 개발 서버 재시작 확인: `["아버지","어머니","기타"]`
  - `npm run build:frontend` 성공
  - 스크린샷:
    - `artifacts/screenshots/2026-05-06-informant-order-before.png`
    - `artifacts/screenshots/2026-05-06-informant-order-after-built.png`
    - `artifacts/screenshots/2026-05-06-informant-order-after-dev.png`
- Not checked:
  - 별도 Claude 하네스 리뷰 실행은 하지 않음. 이번 변경은 단일 프론트 표시 순서 변경이며, 하네스 문서와 job spec은 사전 확인했다.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- Vite 개발 서버가 첫 수정 후에도 이전 번들 순서를 보여, 빌드 산출물과 개발 서버 결과가 일시적으로 달랐다.

### Why
- 변경 중 실행 중이던 Vite 세션의 HMR 반영이 불완전했다.

### Next Time
- UI 변경 후 개발 서버 결과가 코드/빌드 결과와 다르면 서버 재시작 후 동일 경로를 다시 캡처한다.

## Quality Score
- Requirement Fit: 5/5
- Functional Correctness: 5/5
- Architectural Consistency: 5/5
- Readability And Maintainability: 4/5
- Validation And Testing: 4/5
- Documentation Quality: 4/5
- UI And Design Consistency: 5/5
- Regression Risk: 5/5
- Completion Level: 5/5

### Summary
- Average: 4.7
- Notes: 표시 순서만 바꾸는 좁은 변경이며 전후 화면과 빌드를 확인했다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [DESIGN.md](/mnt/c/Users/user/workspace/2.0-modular/DESIGN.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [claude/HARNESS.md](/mnt/c/Users/user/workspace/2.0-modular/claude/HARNESS.md)
