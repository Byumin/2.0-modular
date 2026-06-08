# 검사 제출 내담자 매칭 및 무응답 제출 제어

## 요청 요약
- 사전 등록된 `부유민`으로 문항 응답 후 제출 시 `선택한 내담자 정보가 일치하지 않습니다.` 오류가 나는 문제를 확인하고 수정한다.
- 응답하지 않은 문항이 있으면 모달로 미응답 문항 번호를 최대 5개 보여준다.
- 모달 버튼은 `응답하기`, `제출하기`를 제공한다.
- `응답하기`는 가장 빠른 미응답 문항 화면으로 이동한다.
- `제출하기`는 무응답 상태로 제출한다.
- 이 무응답 제출 기능은 검사 실시 링크를 만들 때 선택/제어 가능해야 한다.

## 작업 목표
- validate-profile과 submit의 내담자/profile 검증 기준을 일관화한다.
- 링크 단위로 무응답 제출 허용 여부를 저장하고 수검 화면에 전달한다.
- 무응답 허용 링크에서는 프런트와 백엔드 모두 일부 미응답 제출을 허용한다.
- 무응답 비허용 링크에서는 기존처럼 제출 전 응답을 요구한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] `docs/runtime-run-modes.md` 확인
- [x] `docs/database/runtime-db.md` 확인
- [x] `DESIGN.md` 확인
- [x] `QUALIT_SCORE.md` 확인

## 초기 가설
- 제출 시 `client_id`가 전달되면 `_validate_selected_client_matches_profile`이 name/gender/birth_day만 엄격 비교하거나 phone alias를 고려하지 않아 validate-profile과 submit의 판정이 달라질 수 있다.
- 현재 `QuestionStep`은 모든 문항 응답 전 제출 버튼을 비활성화하고, 백엔드는 `len(cleaned_answers) != len(valid_item_ids)`이면 거절한다.
- 링크 단위 설정은 `admin_custom_test_access_link`에 컬럼을 추가하는 것이 가장 자연스럽다.

## 실행 계획
1. 현재 submit/profile 검증 함수와 QuestionStep 제출 UX를 확인한다.
2. 링크 모델/마이그레이션/API에 `allow_unanswered_submission` 컬럼과 설정 API를 추가한다.
3. 관리자 검사 상세 화면에서 링크 생성/관리 시 무응답 허용을 제어한다.
4. 수검자 초기 payload에 허용 여부를 내려주고, QuestionStep 모달/이동/강제 제출을 구현한다.
5. 백엔드 제출에서 링크 설정이 true일 때 일부 답변 제출을 허용한다.
6. RDS 모드에서 부유민 제출 오류와 무응답 제출 허용/비허용을 검증한다.

## 작업 중 변경 사항
- `admin_custom_test_access_link.allow_unanswered_submission` 컬럼을 모델과 startup 마이그레이션에 추가했다.
- 관리자 링크 옵션 API `PUT /api/admin/access-links/{access_token}/response-options`를 추가했다.
- 검사 상세 화면의 링크 생성 카드에 `무응답 제출 허용` 토글과 저장 버튼을 추가했다.
- 후속 보정: 검사 생성 화면 Step 1에도 `미응답 문항이 있어도 제출 허용` 옵션을 추가하고, 생성된 검사 기본값을 이후 실시 링크 생성 시 `admin_custom_test_access_link.allow_unanswered_submission`으로 복사하도록 수정했다.
- 수검자 초기 payload에 `allow_unanswered_submission`을 포함했다.
- 수검자 `QuestionStep`에서 무응답 허용 링크인 경우 제출 버튼을 활성화하고, 미응답 문항 확인 모달을 띄우도록 수정했다.
- 모달은 미응답 문항 번호를 최대 5개 표시하고 `응답하기`, `제출하기` 버튼을 제공한다.
- `응답하기`는 가장 빠른 미응답 문항으로 이동하고, `제출하기`는 현재 응답만 제출한다.
- 제출 API는 링크 설정이 false면 기존처럼 모든 문항을 요구하고, true면 일부 응답 제출을 허용한다.
- 사전등록 링크에서는 validate-profile에서 확정된 `client_id`를 submit에서 다시 엄격 profile 비교하지 않도록 조정했다.

## 결과
- `부유민`으로 validate 후 전체 문항 제출 시 발생하던 `선택한 내담자 정보가 일치하지 않습니다.` 오류가 해결됐다.
- 링크 옵션 off 상태에서는 일부 응답 제출이 `모든 문항에 응답해주세요.`로 차단된다.
- 링크 옵션 on 상태에서는 일부 응답만으로 제출이 저장된다.
- 관리자에서 링크별로 무응답 제출 허용 여부를 켜고 끌 수 있다.
- 검사 생성 시점에도 기본 무응답 제출 허용 여부를 설정할 수 있고, 새로 생성되는 실시 링크는 이 기본값을 상속한다.

## 검증 내용
- `.venv/bin/python -m py_compile ...`: 통과
- `npm --prefix frontend run build`: 통과
- RDS `local.prod` 서버 `/health`: `db=postgresql`
- 기존 검증 링크:
  - access token `yem2FQ7jXOnLxvgkfhI2vlFUckYc8C49`
  - link id `35`
- `부유민 / 010-4944-7545` validate-profile:
  - `client_id=136`, `items=270`
- 전체 응답 제출:
  - `submission_id=60`, `submitted_item_count=270`
- 무응답 옵션 off:
  - 일부 응답 제출 결과 `400`, detail `모든 문항에 응답해주세요.`
- 무응답 옵션 on:
  - public payload `allow_unanswered_submission=true`
  - 일부 응답 제출 `submission_id=61`, `submitted_item_count=3`
  - RDS `admin_custom_test_access_link.allow_unanswered_submission=true`
- UI 스크린샷:
  - 관리자 옵션: `artifacts/screenshots/2026-06-05-access-link-unanswered-option.png`
  - 검사 생성 옵션: `artifacts/screenshots/2026-06-08-create-unanswered-option.png`
  - 수검자 무응답 모달: `artifacts/screenshots/2026-06-05-unanswered-submit-modal.png`

## 회고
- 제출 오류는 validate-profile과 submit의 내담자 일치 판단 책임이 중복되면서 생긴 실행 판단 문제였다.
- 무응답 제출은 프런트만 풀면 안 되고, 링크 설정과 백엔드 submit 검증이 반드시 같은 값을 봐야 한다.
- 브라우저에서 모달 표시는 확인했고, 모달의 `제출하기` 실제 저장은 API 검증으로 확인했다.

## 추가 확인: 빠른 이동 후 키보드 입력
- 사용자 재현:
  - 문항을 응답하지 않고 빠른 이동/마우스 클릭으로 다음 문항에 둔 뒤 숫자 키를 연속 입력하면 화면은 넘어가지 않지만 진행 현황이 계속 채워진다.
  - 이후 제출 시 무응답 모달 없이 제출되는 것처럼 보인다.
- 원인:
  - 숫자 키 핫키가 현재 화면 밖의 전체 미응답 문항까지 fallback으로 선택할 수 있었다.
  - 빠른 이동 버튼을 누른 직후 포커스가 버튼/옵션에 남아 있고, 기준 문항이 끝에 도달하면 다시 현재 페이지 첫 미응답으로 돌아갈 수 있었다.
  - 과거 제출 409 이후 재검사 확인 모달은 상태만 세팅되고 자동으로 열리지 않아 재응시 검증 흐름도 어긋났다.
- 수정:
  - 카드형 숫자 키 입력 대상은 현재 렌더된 문항으로 제한했다.
  - 빠른 이동으로 선택한 문항을 키보드 입력 anchor로 유지하고, anchor 이후 현재 페이지의 다음 미응답만 처리하도록 바꿨다.
  - anchor 뒤에 더 이상 미응답이 없으면 첫 문항으로 되돌아가지 않고 추가 키 입력을 무시한다.
  - `retakeInfo`가 세팅되면 재검사 확인 모달이 자동 표시되도록 연결했다.
  - `무응답 제출 허용` 링크에서는 anchor 이후 현재 페이지 끝까지 응답하면, 앞쪽 미응답을 남긴 채 다음 페이지로 이동한다.
  - `무응답 제출 비허용` 링크에서는 현재 페이지의 모든 문항을 응답해야 다음 페이지로 이동한다.
- 검증:
  - 새 RDS 사전등록 테스트 내담자 `키보드검증 / 01077778888`을 임시 추가해 과거 이력/임시저장 영향 없이 확인했다.
  - 초기 상태 `0/270 문항 완료`.
  - 1번을 비워두고 빠른 이동 2번 클릭 후 숫자키 `2`를 20회 입력해도 `4/270 문항 완료`.
  - 제출 시 무응답 모달 표시: `1번`, `6번`, `7번`, `8번`, `9번`, `외 261개`.
  - 스크린샷: `artifacts/screenshots/2026-06-05-keyboard-skip-missing-modal-clean-client.png`.
  - 검증용 RDS row 정리:
    - `assessment_link_pre_registered_client.id=11` 삭제
    - 관련 draft 1건 삭제
    - 관련 assignment 1건 삭제
    - provisional client `id=138` 삭제

## 추가 확인: 무응답 DB 기록 및 임시저장
- 검증 방식:
  - 임시 사전등록 내담자 `DB기록검증 / 01066667777`을 RDS에 추가했다.
  - 1번 문항을 무응답으로 두고 2~5번만 `"2"`로 응답했다.
  - 먼저 draft 저장 API를 호출한 뒤 `admin_assessment_draft.answers_json`을 조회했다.
  - 이후 같은 답변으로 제출하고 `admin_custom_test_submission.answers_json`과 `submission_scoring_result`를 조회했다.
- 임시저장 결과:
  - `admin_assessment_draft.id=48`
  - `answer_count=4`
  - `current_page=1`
  - 1번 문항 id는 `answers_json`에 존재하지 않는다.
  - 2~5번 문항 id만 값 `"2"`로 저장된다.
- 제출 결과:
  - `admin_custom_test_submission.id=65`
  - 제출 API 응답 `submitted_item_count=4`
  - submission 저장 포맷은 `{ profile, answers: [...] }` 구조다.
  - 구조화된 `answers[0].items`에는 `order: 2, 3, 4, 5`만 저장된다.
  - 1번 문항은 `null`, `"무응답"` 같은 값으로 저장되지 않고 항목 자체가 없다.
  - 제출 완료 후 해당 draft row는 삭제된다.
  - 부분응답이라 scoring result는 생성되지만 `scoring_status="skipped"`로 기록됐다.
- 후속 수정:
  - 무응답 제출 허용 링크에서 제출 저장 시 모든 문항의 `order`, `parent_item_id`를 보존하도록 변경했다.
  - 무응답 문항의 `answer_value`는 내부 sentinel 값 `"NO_RESPONSE"`로 저장한다.
  - `"-"`는 사람이 보는 표시용으로는 가능하지만 DB/API 내부 값으로는 의미가 불명확해 사용하지 않았다.
- 후속 검증:
  - 임시 사전등록 내담자 `NO_RESPONSE검증 / 01055556666`으로 1번만 무응답, 2~5번은 `"2"`로 제출했다.
  - `admin_custom_test_submission.id=66`
  - 저장된 구조화 item 수는 `270`.
  - 첫 5개 저장 결과:
    - `order=1`, `parent_item_id="1"`, `answer_value="NO_RESPONSE"`
    - `order=2`, `parent_item_id="2"`, `answer_value="2"`
    - `order=3`, `parent_item_id="3"`, `answer_value="2"`
    - `order=4`, `parent_item_id="4"`, `answer_value="2"`
    - `order=5`, `parent_item_id="5"`, `answer_value="2"`
  - 부분응답이라 scoring result는 생성되지만 `scoring_status="skipped"`로 유지됐다.
- 검증용 RDS 데이터 정리:
  - scoring result 1건 삭제
  - submission 1건 삭제
  - assessment log 1건 삭제
  - assignment 1건 삭제
  - pre-registered row 1건 삭제
  - provisional client 1건 삭제
