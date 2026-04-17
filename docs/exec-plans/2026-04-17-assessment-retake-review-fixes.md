# Assessment Retake Review Fixes

## 요청 요약
- 기존 결과 보기 동작은 별도 탭으로 결과 화면을 연다.
- 기존 결과 감지 후 현재 입력 프로필과 기존 감지 당시 프로필이 다르면 재실시 모달 대신 프로필 검증 API를 다시 호출한다.
- 개인정보 동의가 필요하지 않은 검사에서는 동의 체크 영역을 표시하지 않는다.

## 작업 목표
- `ProfileStep`의 미사용 prop으로 인한 빌드 실패를 제거한다.
- 재실시 확인은 동일 프로필에 대해서만 표시하고, 프로필 변경 시 새 검증 흐름을 탄다.
- `/consent`의 `requires_consent` 값을 UI 조건에 반영한다.

## 초기 가설
- 기존 결과 감지 당시 profile을 `ProfileStep`에 함께 넘기고, 제출 시 현재 form profile과 비교하면 프런트 단에서 안전하게 재검증 여부를 결정할 수 있다.
- 기존 결과 보기는 부모의 `handleViewExistingResult`에서 `window.open`으로 처리하면 새 탭 요구와 미사용 prop 문제를 함께 해결할 수 있다.

## 실행 계획
1. `ProfileStep` props에 `requiresConsent`, `retakeProfile`을 추가한다.
2. 현재 입력값으로 profile을 만드는 helper와 profile 비교 helper를 추가한다.
3. `retakeInfo`가 있어도 profile이 달라졌으면 `onNext(currentProfile)`로 재검증한다.
4. 결과 보기 버튼은 `onViewExistingResult`를 호출해 새 탭으로 연다.
5. `AssessmentPage`에서 `requires_consent`, `retakePrompt.profile`을 전달하고 결과 보기 새 탭 처리를 적용한다.
6. 빌드와 diff check로 검증한다.

## 작업 중 변경 사항
- `ProfileStep`에 `requiresConsent`, `retakeProfile` props를 추가했다.
- 현재 입력값으로 `Profile`을 만드는 `buildProfile()` helper를 추가했다.
- 기존 결과 감지 당시 profile과 현재 입력 profile을 비교하는 `isSameProfile()` helper를 추가했다.
- `retakeInfo`가 있어도 profile이 달라졌으면 재실시 모달을 열지 않고 `onNext(profile)`로 `validate-profile`을 다시 호출하도록 했다.
- 결과 보기 버튼은 부모의 `onViewExistingResult`를 호출하도록 바꿨다.
- 재실시 확인 모달에도 `기존 결과 보기` 버튼을 추가했다.
- `AssessmentPage`의 결과 보기 처리는 `window.open(..., "_blank", "noopener,noreferrer")`로 바꿨다.
- `requires_consent=false`일 때 개인정보 동의 체크 영역과 개인정보 모달을 렌더링하지 않도록 했다.
- 일반 프로필 검증을 다시 시작할 때 기존 `retakePrompt`를 먼저 비워 이전 내담자의 결과 링크가 남지 않도록 했다.
- 프로필 검증 중에는 주요 버튼을 비활성화하고, 과거 실시 내역 영역에 확인 중 문구를 표시하도록 했다.

## 결과
- 기존 결과 보기 버튼은 별도 탭으로 리포트 화면을 연다.
- 기존 결과 감지 후 사용자가 인적사항을 수정하면 이전 `retakePrompt`를 재사용하지 않고 다시 프로필 검증을 수행한다.
- 재검증 중에는 이전 과거 실시 내역 대신 확인 중 상태를 보여준다.
- 동의가 필요 없는 검사에서는 동의 체크 영역이 보이지 않는다.

## 검증 내용
- `npm run build` 통과
- `git diff --check` 통과
- Playwright로 `http://127.0.0.1:8000/assessment/custom/a8zKVb8Ab4auUx9fusZT0D9pTq3sj5Fn` 확인:
  - 기존 결과 감지 후 `결과 보기` 클릭 시 새 탭이 열림
  - 새 탭 URL: `/report/14?token=...`
  - 기존 결과 감지 후 이름을 변경하고 `시작하기` 클릭 시 재실시 모달이 뜨지 않음
  - 이름 변경 후 재검증 중 이전 `결과 보기` 버튼이 사라짐
  - 검증 API를 지연시킨 상태에서 `입력하신 정보를 확인하는 중입니다.` 로딩 문구가 표시됨

## 회고
- Execution Judgment Problem: 이전 구현에서 `onViewExistingResult`를 prop으로 만들고 실제 버튼에는 직접 링크를 사용해 빌드 실패를 만들었다.
- Execution Judgment Problem: 기존 결과 감지 이후 입력값 변경 가능성을 고려하지 않아 오래된 `retakePrompt.profile`이 재사용될 수 있었다.
