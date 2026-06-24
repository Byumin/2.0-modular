# Execution Plan

## Task Title
- 수검자 전화번호 입력 자동 포커스 이동

## Request Summary
- 검사 실시 인적사항 입력에서 전화번호 첫 칸에 `010`을 입력하면 자동으로 다음 칸으로 이동하도록 한다.

## Goal
- 수검자 프로필 단계의 전화번호 3분할 입력에서 각 칸의 최대 자리수가 채워지면 다음 칸으로 focus를 이동한다.
- 기존 전화번호 저장 형식(`010-1234-5678`)은 유지한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: 해당 없음
  - DB: 해당 없음
  - UI/디자인: `DESIGN.md`, `QUALIT_SCORE.md`
  - 문서 체계: 해당 없음
  - 설명/디버깅: 해당 없음
  - 코드 정리 산출물: 해당 없음
- [x] 운영/실행 서버 DB가 필요한 작업이면 `docs/database/runtime-db.md`의 DB 조회 전 확인 규칙 적용
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- 전화번호 입력은 `ProfileStep.renderPhoneInput`에서 공통 처리하므로 이 함수에 포커스 이동을 추가하면 된다.

## Initial Plan
1. 전화번호 input별 ref 배열을 만들고 입력 길이가 해당 칸 최대 길이에 도달하면 다음 input에 focus한다.
2. 붙여넣기/비숫자 입력은 기존 숫자 필터링을 유지한다.
3. 프론트 빌드로 타입/번들 검증을 수행한다.

## Progress Updates
### Update 1
- Time: 2026-06-22
- Change: 계획 수립.
- Reason: UI 동작 변경이므로 영향 범위를 `ProfileStep`으로 한정하기 위해서다.

### Update 2
- Time: 2026-06-22
- Change: `ProfileStep.renderPhoneInput`에 input ref 배열과 자동 focus 이동을 추가.
- Reason: 각 전화번호 칸의 최대 자리수(3/4/4)가 채워지면 다음 칸으로 자연스럽게 넘어가야 하기 때문이다.

### Update 3
- Time: 2026-06-22
- Change: 프론트 빌드와 운영 서빙 JS 반영 상태를 확인.
- Reason: 실제 실시 링크에서 최신 번들이 로드되어야 변경이 보이기 때문이다.

### Update 4
- Time: 2026-06-22
- Change: 자동 focus가 실제 화면에서 동작하지 않는다는 피드백을 받고 원인을 재확인.
- Reason: `renderPhoneInput` 내부의 임시 `inputRefs` 배열은 리렌더 시 ref cleanup으로 `null` 처리될 수 있어, `requestAnimationFrame` 시점에 다음 input 참조가 사라질 수 있다.

### Update 5
- Time: 2026-06-22
- Change: 전화번호 input ref를 컴포넌트 `useRef` 저장소에 `idPrefix`별로 안정적으로 보관하도록 수정 예정.
- Reason: 상태 업데이트 후 리렌더가 발생해도 다음 칸 DOM 참조가 유지되어야 하기 때문이다.

## Result
- 완료.
- 전화번호 3분할 입력에서 첫 칸 3자리, 둘째 칸 4자리 입력 완료 시 다음 칸으로 자동 focus 이동하도록 변경했다.
- 기존 숫자 필터링과 저장 형식(`010-1234-5678`)은 유지했다.
- 사용자 확인 결과 기존 구현이 실제 화면에서 동작하지 않아 ref 저장 방식을 재수정했다.
- 전화번호 input DOM 참조를 `useRef` 기반 저장소에 보관하도록 바꿔, 상태 업데이트 후 리렌더가 발생해도 다음 칸 focus 대상이 유지되도록 했다.

## Verification
- Checked:
  - `npm run build:frontend` 통과.
  - `npm run ec2:api` 재기동 시도 후 현재 `8120`이 최신 JS `index-CHc0gjEt-v2.js`를 서빙하는 것 확인.
  - 빌드 산출물에 `window.requestAnimationFrame(...focus())` 자동 focus 로직 포함 확인.
  - 재수정 후 `npm run build:frontend` 통과.
  - 운영 링크 HTML이 최신 JS `index-FBse0zIJ-v2.js`를 서빙하는 것 확인.
- Not checked:
  - Playwright/브라우저 스크린샷 검증은 이 환경의 Chromium 지원 문제로 수행하지 못했다.

## Retrospective
### Classification
- UI 편의 개선

### What Was Wrong
- 전화번호 분할 입력에서 각 칸을 수동으로 클릭하거나 탭해야 했다.
- 1차 수정은 `renderPhoneInput` 내부 임시 배열에 ref를 담아 리렌더 후 focus 대상 참조가 사라질 수 있었다.

### Why
- 기존 구현은 숫자 분할과 저장만 처리하고 focus 이동을 처리하지 않았다.
- React ref callback cleanup과 상태 업데이트 타이밍을 고려하지 못했다.

### Next Time
- 전화번호 입력 편의 요구가 더 생기면 Backspace 이전 칸 이동과 붙여넣기 전체 분배도 함께 검토한다.

## Related Documents
- [AGENTS.md](../../AGENTS.md)
- [DESIGN.md](../../DESIGN.md)
- [QUALIT_SCORE.md](../../QUALIT_SCORE.md)
