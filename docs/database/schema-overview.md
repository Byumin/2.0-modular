# Schema Overview

## Source Of Truth
현재 테이블 구조의 1차 기준은 `app/db/models.py`다.
단, startup 보정이 있으므로 `app/db/schema_migrations.py`도 함께 봐야 한다.

## Main Tables
### `admin_user`
- 관리자 계정 정보
- 주요 필드:
  - `id`
  - `username`
  - `password_hash`
  - `created_at`

### `child_test`
- 관리자 생성 커스텀 검사
- 코드 모델명은 `AdminCustomTest`
- 주요 필드:
  - `id`
  - `admin_user_id`
  - `test_id`
  - `sub_test_json`
  - `custom_test_name`
  - `client_intake_mode`
  - `selected_scales_json`
  - `additional_profile_fields_json`
  - `created_at`

### `admin_client`
- 내담자 정보
- 주요 필드:
  - `id`
  - `admin_user_id`
  - `name`
  - `gender`
  - `birth_day`
  - `memo`
  - `created_source`
  - `created_at`
  - `updated_at`

### `admin_assessment_log`
- 평가 이력 로그
- 주요 필드:
  - `id`
  - `admin_user_id`
  - `admin_client_id`
  - `assessed_on`
  - `created_at`

### `admin_client_assignment`
- 내담자와 커스텀 검사 배정 관계
- 주요 필드:
  - `id`
  - `admin_user_id`
  - `admin_client_id`
  - `admin_custom_test_id`
  - `created_at`
- 주요 제약:
  - `(admin_user_id, admin_client_id, admin_custom_test_id)` unique

### `admin_custom_test_access_link`
- 커스텀 검사 접근 토큰
- 주요 필드:
  - `id`
  - `admin_user_id`
  - `admin_custom_test_id`
  - `access_token`
  - `is_active`
  - `created_at`

### `admin_custom_test_submission`
- 수검자 제출 응답
- 주요 필드:
  - `id`
  - `admin_user_id`
  - `admin_custom_test_id`
  - `client_id`
  - `access_token`
  - `responder_name`
  - `answers_json`
  - `created_at`

### `submission_scoring_result`
- 제출 채점 결과
- 주요 필드:
  - `id`
  - `admin_user_id`
  - `admin_custom_test_id`
  - `client_id`
  - `submission_id`
  - `scoring_status`
  - `result_json`
  - `created_at`

### `admin_settings`
- 관리자별 설정 정보 (개인정보동의 텍스트 등)
- 코드 모델명: `AdminSettings`
- 주요 필드:
  - `id`
  - `admin_user_id` (UNIQUE)
  - `consent_text`
  - `updated_at`

### `client_consent_record`
- 수검자의 개인정보동의 제출 기록
- 코드 모델명: `ClientConsentRecord`
- 주요 필드:
  - `id`
  - `admin_user_id`
  - `admin_client_id`
  - `admin_custom_test_id`
  - `consented`
  - `consented_at`

## Important Relationship Summary
- `admin_user` -> 모든 관리자 도메인 데이터의 상위 소유자
- `child_test` -> 커스텀 검사 본체
- `admin_client_assignment` -> 내담자와 커스텀 검사 연결
- `admin_custom_test_access_link` -> 외부 수검 진입용 토큰
- `admin_custom_test_submission` -> 실제 응답 저장
- `submission_scoring_result` -> 제출 기반 채점 결과 저장

## Practical Reading Rule
기능 흐름을 분석할 때는 아래 순서로 같이 보는 것이 좋다.

1. `app/db/models.py`
2. 관련 repository
3. 관련 service
4. startup 보정 코드

테이블 이름과 코드 모델명이 다를 수 있으므로, 설명 시 둘 다 같이 적는 편이 안전하다.

## Related Documents
- [docs/database/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/README.md)
- [docs/database/runtime-db.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/runtime-db.md)
- [docs/database/assets-inventory.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/assets-inventory.md)
- [docs/features/client-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-management.md)
- [docs/features/custom-test-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/custom-test-management.md)
- [docs/features/scoring-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/scoring-flow.md)
