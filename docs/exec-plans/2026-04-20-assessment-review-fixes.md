# Execution Plan

## Task Title
- Assessment review fixes

## Request Summary
- 코드 리뷰에서 나온 문제를 수정하고 반영한다.

## Goal
- 프런트 빌드 실패를 해결한다.
- 검사 안내 화면에서 `수정`/`뒤로`로 인적사항 화면에 돌아왔을 때 입력값을 보존한다.
- UI 변경에 불필요한 DB 변경은 건드리지 않는다.

## Initial Hypothesis
- 빌드 실패는 `complete` 단계가 조기 return으로 제거된 렌더 범위에서 다시 `step === "complete"`를 비교해서 발생한다.
- 입력값 유실은 `ProfileStep`이 로컬 state만 사용하고 `IntroStep`에서 돌아올 때 초기값을 받지 않기 때문에 발생한다.

## Initial Plan
1. 단계 네비게이션의 과거 단계 계산을 문자열 직접 비교가 아니라 단계 인덱스 기반으로 바꾼다.
2. `ProfileStep`에 `initialProfile` prop을 추가하고, 해당 값이 있으면 입력폼을 열린 상태로 초기화한다.
3. `AssessmentPage`에서 `activeProfile`을 `ProfileStep` 초기값으로 넘긴다.
4. `npm run build`로 검증한다.

## Progress Updates
### Update 1
- Time: 2026-04-20 13:48:31 KST
- Change: 리뷰 지적 사항을 빌드 오류와 인적사항 값 보존 문제로 좁혔다.
- Reason: 두 항목이 실제 사용자 흐름과 배포 가능성에 직접 영향을 주기 때문이다.

### Update 2
- Time: 2026-04-20 13:55:51 KST
- Change: 단계 네비게이션 과거 단계 계산을 인덱스 기반으로 변경했고, `ProfileStep`이 `initialProfile`을 받아 폼 상태를 초기화하도록 수정했다.
- Reason: `complete` 직접 비교로 인한 TypeScript 오류를 제거하고, 안내 화면에서 인적사항 화면으로 돌아왔을 때 입력값을 유지하기 위해서다.

## Result
- `AssessmentPage` 단계 네비게이션의 `isPast` 계산을 단계 인덱스 기반으로 변경했다.
- `ProfileStep`에 `initialProfile` prop을 추가했다.
- 안내 화면에서 인적사항 화면으로 돌아오면 이름, 성별, 생년월일, 추가 필드, 개인정보 동의 상태가 초기값으로 복원되도록 했다.

## Verification
- Checked:
  - `npm run build` 통과
  - Playwright로 `인적사항 입력 -> 검사 안내 -> 수정 -> 인적사항` 흐름 확인
  - 돌아온 인적사항 화면에서 이름 `검토테스트`, 성별 `여`, 생년월일 `2020-04-20` 유지 확인
- Not checked:
  - 별도 단위 테스트는 없음

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 단계 타입이 좁혀진 렌더 범위에서 `complete` 단계를 다시 직접 비교했다.
- `ProfileStep` 폼 state가 컴포넌트 내부에만 있어 안내 화면에서 돌아올 때 초기화됐다.

### Why
- 새 `intro` 단계를 추가하면서 단계 표시 로직은 조건문 방식으로 확장했고, 뒤로가기 시 폼 state 보존 책임을 별도로 설계하지 않았다.

### Next Time
- 단계가 늘어나는 UI는 조건문보다 단계 배열과 현재 인덱스를 기준으로 구현한다.
- wizard 흐름에서 이전 단계로 돌아갈 수 있으면 form draft state 보존 여부를 먼저 확인한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
