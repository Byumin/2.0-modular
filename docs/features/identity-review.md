# Identity Review

## Purpose
검사 실시 링크에서 수검자 프로필이 기존 내담자와 "애매하게" 매칭되는 경우(Phase 2 흐름), 제출 이후 관리자가 사후적으로 동일인 여부를 확정하는 관리 화면 기능을 다룬다.

## Main Endpoints
- `GET /api/admin/identity-reviews`: 현재 관리자의 미처리 검토 목록과 개수 조회
- `POST /api/admin/identity-reviews/{review_id}/merge`: 기존 내담자와 병합 처리
- `POST /api/admin/identity-reviews/{review_id}/confirm-new`: 임시 내담자를 신규 확정
- `POST /api/admin/identity-reviews/{review_id}/reject`: 거절 처리

## Main Files
- `app/router/identity_review_router.py`
- `app/services/admin/identity_reviews.py`
- `app/repositories/identity_review_repository.py`
- `app/db/models.py`: `AdminClientIdentityReview`
- `frontend/src/pages/IdentityReviews.tsx`
- React 라우트: `/admin/identity-reviews`

## Behavior Summary
- 수검자가 검사 실시 링크의 Profile 단계에서 이름/생년월일 등 식별 정보를 입력하면, 관리자 보유 내담자 목록과 대조해 완전 일치·미일치·"애매 일치" 세 부류로 분기된다.
- 애매 일치(후보는 있으나 완전 일치가 아님) 케이스에서 수검자는 "이들 중 한 명이다(existing)" 혹은 "새 내담자다(new)" 중 하나를 선택하고 제출을 진행한다.
- 제출이 완료되면 `AdminClientIdentityReview` 레코드가 `pending` 상태로 쌓이며, 관리자는 검토 화면에서 실제 동일인 여부를 확정한다.
- 관리자의 확정 결과에 따라 submission과 scoring 레코드의 `client_id`가 재할당되거나, 임시로 생성되었던 내담자가 정식 내담자로 전환된다.

## Core Flow
1. 수검자가 검사 실시 링크 Profile 단계에서 프로필을 입력한다.
2. `app/services/admin/assessment_links.py`의 제출 처리 경로가 후보 내담자 매칭을 수행한다.
3. "애매 일치" + 수검자의 `responder_choice` 선택이 발생하면 `AdminClientIdentityReview`가 `pending`으로 기록된다.
4. 관리자가 `/admin/identity-reviews`를 열면 `GET /api/admin/identity-reviews`가 호출되어 미처리 목록과 각 항목의 입력 프로필/후보 내담자/수검자 선택 내역을 한 번에 받는다.
5. 관리자가 세 가지 결정 중 하나를 선택한다.
   - **merge(기존과 병합)**: `submission.client_id`와 `submission_scoring_result.client_id`를 선택한 기존 내담자로 갱신하고, 임시로 생성된 `provisional_client`가 있으면 해당 내담자와 관련 log/assignment를 삭제한 뒤 `admin_client` 레코드도 삭제한다. 검토 상태는 `merged`로 바뀐다.
   - **confirm-new(신규로 확정)**: 임시 내담자(`provisional_client_id`)의 `created_source`를 `assessment_link_auto`로 갱신해 정식 내담자로 승격하고, 검토 상태는 `confirmed_new`로 바뀐다.
   - **reject(거절)**: 상태만 `rejected`로 바꾼다. submission/client 쪽 데이터는 건드리지 않는다.
6. 이미 `pending`이 아닌 검토 항목에 다시 결정을 보내면 `400`으로 거절된다.

## Data Model
`AdminClientIdentityReview` 주요 필드:
- `admin_user_id`, `admin_custom_test_id`, `submission_id`, `access_token`
- `input_profile_json`: 수검자가 Profile 단계에서 입력한 원본 프로필 스냅샷
- `candidate_client_ids_json`: 매칭 후보 내담자 id 목록
- `responder_choice`: `"existing"` | `"new"` (수검자 선택)
- `chosen_client_id`: existing일 때 수검자가 지목한 후보
- `provisional_client_id`: new일 때 임시로 생성된 내담자
- `review_status`: `pending` | `merged` | `confirmed_new` | `rejected`
- `reviewed_by`, `reviewed_at`: 관리자 처리 메타

## Notes
- 검토 화면은 현재 관리자(`admin_session` 쿠키) 소유 건만 필터해서 노출한다.
- 병합 처리 시 삭제되는 임시 내담자는 관리자가 명시적으로 `merge`를 선택한 경우에만 제거된다. `reject`는 데이터를 건드리지 않으므로 임시 내담자가 그대로 남는다.
- 사이드바 메뉴(`AppSidebar.tsx`)에서 pending 개수를 배지로 표시한다.

## Related Documents
- [docs/features/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/README.md)
- [docs/features/client-intake-policy.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-policy.md)
- [docs/features/assessment-link-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/assessment-link-flow.md)
- [docs/exec-plans/2026-04-13-client-intake-phase2-ambiguous-match-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/2026-04-13-client-intake-phase2-ambiguous-match-spec.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
