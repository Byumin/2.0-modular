# Assessment Retake Confirmation

## 요청 요약
- 이미 검사를 실시한 내담자가 같은 검사 링크에서 인적사항을 입력하면 확인 모달을 띄운다.
- 모달에서 기존 결과 보기, 다시 검사 실시, 닫기를 제공한다.

## 작업 목표
- 기존 제출이 있는 내담자는 바로 문항으로 넘어가지 않게 한다.
- 사용자가 다시 실시를 명시적으로 선택한 경우에만 문항 응답을 허용한다.
- 기존 결과 보기 버튼은 가장 최근 제출 리포트로 이동한다.

## 초기 가설
- 기존 제출 여부는 `admin_custom_test_submission`의 `admin_user_id + admin_custom_test_id + client_id` 조합으로 판단할 수 있다.
- 기존 결과는 최신 제출 1건을 사용한다.
- 기존 결과 URL은 해당 제출에 저장된 `access_token`과 `submission_id`를 함께 사용해야 한다.

## 실행 계획
1. 기존 제출 확인 helper를 백엔드에 추가한다.
2. `validate-profile` 요청에 `allow_retake` 플래그를 추가한다.
3. 기존 제출이 있고 `allow_retake`가 아니면 전용 오류 코드와 최신 제출 정보를 반환한다.
4. 프런트에서 전용 오류 코드를 받아 모달을 띄운다.
5. 모달 버튼으로 기존 결과 보기, 다시 실시, 닫기를 연결한다.
6. 빌드와 API 단위 확인, 가능하면 스크린샷으로 UI를 검증한다.

## 작업 중 변경 사항
- `validate-profile`에 `allow_retake` 플래그를 추가했다.
- 같은 관리자, 같은 커스텀 검사, 같은 내담자의 최신 제출을 조회하는 repository helper를 추가했다.
- 기존 제출이 있으면 `ALREADY_SUBMITTED_CONFIRM_REQUIRED` 코드와 최신 제출 정보를 반환하도록 했다.
- 프런트에서 해당 코드를 받아 기존 결과 보기 / 다시 실시 / 닫기 모달을 표시하도록 했다.
- 다시 실시 버튼은 `allow_retake=true`로 프로필 검증을 재요청해 문항 화면으로 진입한다.
- 기존 결과 보기 버튼은 최신 제출의 `/report/{submission_id}?token={access_token}`로 이동한다.

## 결과
- 이미 실시한 내담자는 인적사항 입력 후 바로 문항으로 넘어가지 않고 확인 모달을 본다.
- 모달에서 기존 결과를 볼 수 있고, 명시적으로 다시 실시를 선택하면 새 응답 제출 흐름을 시작할 수 있다.

## 검증 내용
- `.venv/bin/python -m compileall app/router/assessment_link_router.py app/schemas/assessment_links.py app/services/admin/assessment_links.py app/services/admin/clients.py app/repositories/custom_test_repository.py`
- 실제 DB 최신 제출 프로필 기준:
  - 기본 `validate-profile` 호출은 409 `ALREADY_SUBMITTED_CONFIRM_REQUIRED` 반환
  - `allow_retake=true` 호출은 문항 payload 반환
- `npm run build` 통과
- Playwright로 동의 -> 인적사항 입력 -> 기존 제출 모달 표시 확인:
  - `artifacts/screenshots/2026-04-17-assessment-retake-confirmation-modal.png`
- Playwright로 모달의 `다시 실시` 버튼 클릭 후 문항 화면 진입 확인

## 회고
- Plan Problem: 없음.
- Execution Judgment Problem: 초기 Playwright 검증에서 동의 화면을 고려하지 않아 프로필 필드를 찾지 못했다. 실제 링크 상태를 먼저 확인한 뒤 검증 시나리오를 작성해야 한다.
