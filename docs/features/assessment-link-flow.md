# Assessment Link Flow

## Purpose
커스텀 검사에 대한 접근 링크 발급, 수검자 진입, 인적사항 검증, 질문 로딩, 답변 제출 흐름을 다룬다.

## Main Endpoints
- `POST /api/admin/custom-tests/{custom_test_id}/access-link`
- `GET /api/assessment-links/{access_token}`
- `POST /api/assessment-links/{access_token}/validate-profile`
- `POST /api/assessment-links/{access_token}/submit`
- `GET /api/assessment-links/{access_token}/draft`
- `PUT /api/assessment-links/{access_token}/draft`
- `GET /assessment/custom/{access_token}`

## Main Files
- `app/router/custom_test_router.py`
- `app/router/assessment_link_router.py`
- `app/router/page_router.py`
- `app/schemas/assessment_links.py`
- `app/services/admin/assessment_links.py`
- `app/services/admin/clients.py`
- `frontend/src/pages/assessment/AssessmentPage.tsx`
- `frontend/src/pages/assessment/steps/ProfileStep.tsx`
- `frontend/src/pages/assessment/steps/QuestionStep.tsx`
- `frontend/src/pages/assessment/steps/CompleteStep.tsx`

현재 `/assessment/custom/{access_token}` browser route는 React SPA를 서빙한다.

## Behavior Summary
- 관리자가 커스텀 검사에 대해 접근 링크를 생성한다.
- 수검자는 토큰이 포함된 URL로 검사 페이지에 진입한다.
- 서버는 커스텀 검사 설정을 읽어 필요한 인적사항 필드와 검사 메타를 제공한다.
- 사용자가 입력한 프로필이 해당 검사 구간과 맞는지 검증한다.
- 이미 같은 검사에 제출한 내담자이면 기존 결과 보기 / 다시 실시 / 닫기 확인 모달을 띄우도록 전용 응답 코드를 반환한다.
- 프로필에 맞는 sub-test variant를 선택해 질문 payload를 만든다.
- 제출 시 프로필, 응답, 선택된 검사 구성을 함께 저장한다.

## Profile Matching Rule
- 성별
- 생년월일 기준 나이 범위
- 학령 정보

위 정보가 `sub_test_json`의 허용 조건과 맞아야 해당 variant를 선택할 수 있다.

## Submission Flow Summary
1. 수검자가 접근 링크로 페이지에 진입한다.
2. 프론트엔드가 토큰 기반 검사 메타를 요청한다.
3. 서버가 필요한 인적사항 필드 목록과 검사 설정을 반환한다.
4. 사용자가 프로필을 입력한다.
5. 서버가 프로필과 일치하는 검사 구간을 찾는다.
6. 같은 내담자와 같은 검사에 기존 제출이 있으면 `ALREADY_SUBMITTED_CONFIRM_REQUIRED`를 반환한다.
7. 수검자가 기존 결과 보기를 선택하면 최신 제출 리포트로 이동한다.
8. 수검자가 다시 실시를 선택하면 `allow_retake=true`로 프로필 검증을 재요청하고 문항 bundle을 조립한다.
9. 사용자가 응답을 제출한다.
10. 서버는 답변 JSON과 프로필 정보를 저장하고 이후 채점 대상이 되는 새 submission을 만든다.

## Draft (검사 실시 중간 저장)
- 수검자가 답변 중인 상태를 서버에 주기적으로 저장해, 재접속 시 동일 지점에서 이어서 검사를 진행할 수 있게 한다.
- `AdminAssessmentDraft` 테이블에 `(admin_user_id, admin_custom_test_id, admin_client_id)` unique 키로 1행이 유지된다. 같은 내담자가 같은 검사에 대해 작성 중인 초안은 최대 1건이다.
- `PUT /api/assessment-links/{access_token}/draft`는 upsert로 동작해 프로필, 답변, 현재 파트/페이지, 애매 매칭 관련 상태(`is_ambiguous_match`, `responder_choice`, 후보 client id 목록)를 함께 저장한다.
- `GET /api/assessment-links/{access_token}/draft`는 `client_id`를 쿼리로 받아 해당 내담자의 초안을 복원한다.
- 검사 제출이 최종 완료되면(`/submit` 성공) 해당 초안은 삭제된다. 이후 재접속은 새 초안을 다시 만들기 시작한다.

## Identity Review Link
- Profile 단계에서 "애매 매칭" 케이스가 발생하고 수검자가 `existing`/`new` 선택을 동반해 제출을 완료하면, 제출 처리 흐름이 `AdminClientIdentityReview`에 `pending` 항목을 1건 기록한다.
- 이후 관리자는 [docs/features/identity-review.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/identity-review.md)의 검토 화면에서 실제 동일인 여부를 확정한다.

## Assignment Check
- 검사에 특정 내담자가 배정된 경우, 제출 전 `find_assigned_client_for_profile`로 이름/성별/생년월일 일치 여부를 검증한다.
- 배정 정보와 맞지 않으면 제출이 막힌다.
- 앞으로 내담자 생성/배정 정책 자체는 [docs/features/client-intake-policy.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-policy.md)를 source of truth로 본다.
- `pre_registered_only`와 `auto_create` 기준 상세 변경안은 [docs/exec-plans/2026-04-10-client-intake-phase1-detailed-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/2026-04-10-client-intake-phase1-detailed-spec.md)를 본다.

## Notes
- 이 기능은 단순 링크 조회가 아니라 프로필 기반 variant 선택이 핵심이다.
- 수검자 화면의 질문 구성은 고정이 아니라 입력 프로필에 따라 달라질 수 있다.

## Related Documents
- [docs/features/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/README.md)
- [docs/features/client-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-management.md)
- [docs/features/client-intake-policy.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-policy.md)
- [docs/exec-plans/2026-04-10-client-intake-phase1-detailed-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/2026-04-10-client-intake-phase1-detailed-spec.md)
- [docs/features/custom-test-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/custom-test-management.md)
- [docs/features/scoring-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/scoring-flow.md)
- [docs/features/identity-review.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/identity-review.md)
- [docs/diagrams/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/diagrams/README.md)
- [docs/design/design-system.md](/mnt/c/Users/user/workspace/2.0-modular/docs/design/design-system.md)
