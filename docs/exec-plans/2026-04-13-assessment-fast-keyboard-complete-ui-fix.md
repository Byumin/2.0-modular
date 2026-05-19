# Execution Plan

## Task Title
- 검사 실시 빠른 키보드 입력과 완료 화면 정리

## Request Summary
- 검사 실시 중 키보드로 빠르게 입력하면 일부 문항이 생략되거나 화면에 나타나지 않는 문제를 확인하고 수정한다.
- 마지막 제출 후에는 상단 커스텀 검사명과 단계 네비게이션을 숨기고, 그 아래 완료 카드 영역은 유지한다.

## Goal
- 빠른 숫자 키 입력이 이전 포커스 문항을 다시 덮어쓰지 않고 다음 미응답 문항에 안정적으로 적용되게 한다.
- 페이지/파트 자동 이동 시 자동 스크롤과 포커스 이동이 입력 상태와 어긋나지 않게 한다.
- 완료 화면은 공통 상단 shell만 제거하고 기존 완료 카드 내용은 유지한다.

## Initial Hypothesis
- 키다운 이벤트가 React 렌더보다 빠르게 들어올 때 `answers` state와 실제 포커스 대상이 오래된 값이 되어 이미 답한 문항을 다시 수정하는 문제가 있다.
- 완료 단계는 공통 shell header/nav를 그대로 렌더해서 사용자가 말한 상단 영역이 남아 있다.

## Initial Plan
1. 수정 전 화면과 현재 구조를 확인한다.
2. `QuestionStep`에서 최신 답변 상태를 ref로 보관하고, 숫자 키 입력 대상은 이미 답한 포커스 문항이 아니라 다음 미응답 문항을 우선하도록 바꾼다.
3. 페이지/파트 이동 시 pending scroll을 일관되게 설정한다.
4. `AssessmentPage`에서 완료 단계는 header/nav 없이 완료 컴포넌트만 렌더한다.
5. build/lint 및 Playwright 기반 빠른 키 입력/완료 화면 스크린샷 검증을 수행한다.

## Progress Updates
### Update 1
- Time: 2026-04-13
- Change: 계획 수립.
- Reason: UI/프런트 수정이 포함되어 실행 계획과 전후 화면 검증이 필요하다.

### Update 2
- Time: 2026-04-13
- Change: 수정 전 Playwright 캡처와 빠른 키 입력 재현을 수행했다.
- Reason: 숫자 키 12회 입력 후에도 진행률이 `3 / 211 문항`에 머물러 이전 포커스/상태 기준으로 입력이 처리되는 문제를 확인했다.

### Update 3
- Time: 2026-04-13
- Change: `QuestionStep`에서 최신 답변 상태를 ref로 동기화하고, 숫자 키 입력 대상을 전체 문항 순서의 다음 미응답 문항으로 계산하도록 수정했다.
- Reason: React state 렌더와 DOM 포커스 이동보다 키 입력이 빠를 때도 같은 문항을 덮어쓰지 않게 하기 위해서다.

### Update 4
- Time: 2026-04-13
- Change: 완료 단계는 공통 검사명 header와 단계 navigation을 렌더하지 않고 `CompleteStep`만 반환하도록 수정했다.
- Reason: 사용자가 제출 완료 후에는 상단 커스텀 검사명과 네비게이션 영역을 제거하길 원했다.

### Update 5
- Time: 2026-04-13
- Change: `CompleteStep`의 아이콘, 설명, `처음으로` 버튼을 복구했다.
- Reason: 완료 카드 본문까지 삭제한 것은 요구 해석 오류였고, 제거 대상은 상단 shell 영역뿐이었다.

## Result
- 빠른 숫자 키 입력이 이전 포커스 문항을 덮어쓰지 않고 다음 미응답 문항으로 이어지게 수정했다.
- 제출 완료 화면에서 상단 커스텀 검사명, 프로필 설명, 단계 네비게이션만 제거하고 완료 카드 본문은 유지했다.

## Verification
- Checked: `npm run build`
- Checked: `npm run lint` 통과. 기존 `components/ui/*` fast-refresh 경고 3건은 유지된다.
- Checked: 수정 전 Playwright 캡처 `artifacts/screenshots/assessment-fast-keyboard-before-question.png`
- Checked: 수정 전 빠른 키 입력 캡처 `artifacts/screenshots/assessment-fast-keyboard-before-rapid.png`, 숫자 키 12회 후 `3 / 211 문항`
- Checked: 수정 전 완료 화면 캡처 `artifacts/screenshots/assessment-complete-before-header.png`
- Checked: 수정 후 Playwright 캡처 `artifacts/screenshots/assessment-fast-keyboard-after-question.png`
- Checked: 수정 후 빠른 키 입력 캡처 `artifacts/screenshots/assessment-fast-keyboard-after-rapid.png`, 숫자 키 12회 후 `13 / 211 문항`
- Checked: 수정 후 실제 제출 완료 캡처 `artifacts/screenshots/assessment-complete-after-actual-submit.png`, 상단 shell 없이 완료 카드가 표시됨을 확인했다.
- Checked: 범위 정정 후 완료 화면 캡처 `artifacts/screenshots/assessment-complete-after-card-restored.png`, 커스텀 검사명/네비게이션은 없고 완료 카드 본문과 `처음으로` 버튼은 유지됨을 확인했다.
- Checked: 검증용 임시 내담자/링크/제출 데이터 cleanup 후 잔여 0건 확인.
- Not checked: 모바일 뷰포트는 별도 확인하지 않았다.

## Retrospective
### Classification
- `Execution Judgment Problem`

### What Was Wrong
- 빠른 키 입력에서 DOM 포커스가 이전 문항에 남아 있을 수 있다는 점을 고려하지 못했다.
- 완료 화면이 공통 shell header/nav를 그대로 사용하는 구조라 제출 완료 후에도 불필요한 상단 영역이 남았다.
- 첫 수정에서 완료 카드 본문까지 제거해 사용자의 범위를 과하게 해석했다.

### Why
- 키 입력 처리에서 React state 렌더 이후의 포커스 이동이 이미 완료됐다는 가정이 있었다.
- 완료 단계도 다른 단계와 같은 레이아웃을 쓰는 기존 구조를 그대로 유지했다.
- "상단 영역"과 "그 아래 완료 카드 영역"을 분리해서 반영하지 않았다.

### Next Time
- 키보드 단축키는 화면 포커스보다 최신 응답 상태와 논리적 다음 대상 기준으로 처리한다.
- 완료/종료 화면처럼 정보량이 달라지는 상태는 공통 shell이 필요한지 별도로 판단한다.
- UI 축소 요청은 제거 범위를 영역 단위로 재확인하고, 기존 본문 컴포넌트는 가능하면 유지한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
