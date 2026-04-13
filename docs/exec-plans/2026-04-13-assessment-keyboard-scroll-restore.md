# Assessment Keyboard Scroll Restore

## Task Title
- React 검사 실시 키보드 입력/자동 스크롤 복구

## Request Summary
- 기존 검사 실시 화면에 있던 숫자키 응답 입력과 응답 후 자동 스크롤 기능이 React 전환 후 사라졌으므로 복구한다.

## Goal
- React 수검자 `QuestionStep`에서 숫자키 1~9로 현재 응답 대상 문항의 선택지를 고를 수 있게 한다.
- 선택 후 같은 화면의 다음 미응답 문항으로 자동 스크롤/포커스 이동한다.
- 기존 카드형/집중형 보기와 matrix 문항을 깨뜨리지 않는다.
- 수정 전/후 스크린샷과 빌드/lint로 검증한다.

## Initial Hypothesis
- 레거시 `static/assessment-custom.js`에는 `keydown`, `selectOptionByNumber`, `centerQuestionCard`, `findNextMissingInCurrentPage` 로직이 있었다.
- React 전환 후 `QuestionStep.tsx`에는 페이지 자동 이동만 있고, 숫자키 핫키와 문항 단위 스크롤 복구가 빠졌다.

## Initial Plan
1. 레거시 키보드/스크롤 동작과 React `QuestionStep`, `QuestionCard`, `MatrixCard` 구조를 대조한다.
2. 수정 전 검사 실시 화면 스크린샷을 남긴다.
3. React `QuestionStep`에 현재 응답 대상 문항 계산, 카드 스크롤/포커스, 숫자키 핫키, 응답 후 다음 미응답 이동을 추가한다.
4. 빌드/lint와 수정 후 스크린샷/키보드 동작 검증을 수행한다.

## Progress Updates
### Update 1
- Time: 2026-04-13
- Change: 계획 문서 작성 및 레거시 기능 위치 확인.
- Reason: React UI 기능 복구라 실행 계획과 전/후 스크린샷 검증을 남겨야 한다.

### Update 2
- Time: 2026-04-13
- Change: 수정 전 수검 화면을 캡처하고, React `QuestionStep`에 숫자키 응답/다음 미응답 문항 스크롤 로직을 복구했다. 선택지 카드에는 키보드 포커스와 `role="radio"` 메타데이터를 추가했다.
- Reason: 레거시 구현의 핫키 동작은 선택지 DOM을 기준으로 작동했으므로 React에서도 문항/선택지 DOM에 `data-item-id`, `data-option-index` 기준을 맞춰야 했다.

### Update 3
- Time: 2026-04-13
- Change: `npm run build`, `npm run lint`, Playwright 키보드 검증과 수정 후 스크린샷 캡처를 완료했다.
- Reason: 실제 수검자 화면에서 숫자키 `3`이 첫 문항 응답으로 반영되고, 포커스가 다음 문항으로 이동하는지 확인했다.

## Result
- React 검사 실시 화면에서 숫자키 `1`~`9`로 현재 응답 대상 문항의 선택지를 고를 수 있다.
- 카드형 화면에서는 첫 미응답 문항을 기본 응답 대상으로 삼고, 응답 후 같은 화면의 다음 미응답 문항으로 스크롤/포커스가 이동한다.
- 현재 페이지가 모두 응답되면 기존처럼 다음 페이지/파트로 이동하되, 이동 후 첫 미응답 문항으로 스크롤/포커스가 맞춰진다.
- `LikertCard`, `BipolarCard`, `MatrixCard` 선택지에 키보드 포커스와 선택 상태 메타데이터를 추가했다.

## Verification
- Checked:
  - `AGENTS.md`
  - `QUALIT_SCORE.md`
  - `frontend/src/pages/assessment/steps/QuestionStep.tsx`
  - `frontend/src/pages/assessment/components/QuestionCard.tsx`
  - `frontend/src/pages/assessment/components/MatrixCard.tsx`
  - `static/assessment-custom.js` from git history
  - `artifacts/screenshots/assessment-keyboard-scroll-before.png`
  - `artifacts/screenshots/assessment-keyboard-scroll-after.png`
  - `npm run build`
  - `npm run lint`
  - Playwright: 수검자 화면에서 숫자키 `3` 입력 후 첫 문항 라디오 값 `3` 선택 및 다음 문항 포커스 이동 확인
- Not checked:
  - 모바일 뷰포트 별도 스크린샷

## Retrospective
### Classification
- `Execution Judgment Problem`

### What Was Wrong
- React 전환 때 레거시 수검 화면의 키보드 핫키/자동 스크롤 동작이 함께 이관되지 않았다.

### Why
- 문항 렌더링과 페이지 이동은 React로 전환됐지만, 전역 숫자키 입력과 문항 DOM 포커스 이동은 별도 상호작용 로직이라 누락되기 쉬웠다.

### Next Time
- UI 전환 검증 시 클릭 동작뿐 아니라 키보드 입력, 자동 포커스, 스크롤 같은 비시각 상호작용도 레거시 기능 목록으로 대조한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
