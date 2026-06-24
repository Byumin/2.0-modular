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
  - `test_id` — 포함된 원본 검사 ID 목록 JSON 배열 (예: `["K-PSI-4-SF","PAT-2","PCT"]`)
  - `sub_test_json` — 검사별 유효 실시구간 목록. 구조 아래 참고.
  - `custom_test_name`
  - `client_intake_mode`
  - `selected_scales_json` — 검사별 실시구간 + 선택 척도 코드 매핑. 구조 아래 참고.
  - `session_configs_json` — 수검자 실시 세션 구성, 세션 안내 설명, 안내 항목. 구조 아래 참고.
  - `additional_profile_fields_json`
  - `requires_consent`
  - `created_at`

#### `child_test.sub_test_json` 구조

검사별(test_id)로 유효한 실시구간 목록을 담는다. 각 구간은 item/scale/norm condition 세 테이블의 **수학적 교집합**으로 산출된다.

```json
{
  "GOLDEN": [
    {"school_age_range": {"as_of_time": "00:00:00", "start_inclusive": [4,0,0], "end_exclusive": [15,0,0]}, "gender": ["female","male"]},
    {"age_range": {"as_of_time": "00:00:00", "start_inclusive": [18,0,0], "end_exclusive": [100,0,0]}, "gender": ["female","male"]}
  ],
  "PAT-2": [
    {"age_range": {"as_of_time": "00:00:00", "start_inclusive": [0,0,0], "end_exclusive": [3,0,0]}, "gender": ["female","male"], "informant": ["etc","father","mother"]},
    {"age_range": {"as_of_time": "00:00:00", "start_inclusive": [3,0,0], "end_exclusive": [7,0,0]}, "gender": ["female","male"], "informant": ["etc","father","mother"]}
  ]
}
```

- `age_range`: 생년월일 기반 만 연령 범위. `start_inclusive`(포함), `end_exclusive`(미포함). 단위는 `[년, 월, 일]`.
- `school_age_range`: 학령 라벨 인덱스 범위. `start_inclusive[0]`(포함), `end_exclusive[0]`(미포함)을 `SCHOOL_AGE_LABELS` 인덱스로 비교한다.
- `age_range`와 `school_age_range`는 다른 입력 축이므로, 한 구간에 둘 다 존재하지 않는다.
- `informant`: 보고자 구분이 있는 검사(PAT-2 등)에서 유효한 보고자 값 목록.
- 구간 산출 알고리즘 상세: [docs/features/custom-test-management.md](../features/custom-test-management.md) — **실시구간 산출 알고리즘** 섹션 참고.

#### `child_test.selected_scales_json` 구조

실시구간별로 선택된 척도 코드를 담는다. `sub_test_json`과 동일한 구간 기준으로 산출된다.

```json
{
  "PAT-2": [
    {
      "sub_test_json": {"age_range": {...0~3...}, "informant": ["etc","father","mother"]},
      "variable": {
        "available_scale_codes": ["A01","A02","A03","A04","A05","A06","A07","A08"],
        "selected_scale_codes": ["A01","A02","A03"]
      }
    }
  ]
}
```

런타임에서 프로필 매칭과 문항 번들 조회 모두 이 필드의 `sub_test_json` 키를 기준으로 동작한다.

#### `child_test.session_configs_json` 구조

수검자 검사 실시를 세션별로 나누기 위한 UI/실시 흐름 메타를 담는다. `selected_scales_json`에는 저장하지 않는다.

```json
[
  {
    "session_id": "session_1",
    "session_index": 0,
    "title": "세션 1",
    "description": "세션 시작 전 보여줄 검사 안내 문구",
    "guide_items": ["안내 항목 1", "안내 항목 2"],
    "test_ids": ["K-PSI-4-SF", "PAT-2", "PCT"]
  },
  {
    "session_id": "session_2",
    "session_index": 1,
    "title": "세션 2",
    "description": "세션 시작 전 보여줄 검사 안내 문구",
    "guide_items": ["안내 항목 1"],
    "test_ids": ["PSES"]
  }
]
```

기존 데이터 호환을 위해 런타임 loader는 `session_configs_json`이 비어 있을 때만 과거 `selected_scales_json.__sessions`를 fallback으로 읽는다.

### `admin_client`
- 내담자 정보
- 주요 필드:
  - `id`
  - `admin_user_id`
  - `name`
  - `gender`
  - `birth_day`
  - `phone`
  - `address`
  - `is_closed`
  - `tags_json`
  - `memo`
  - `created_source`
  - `created_at`
  - `updated_at`

### `admin_client_group`
- 내담자 그룹 정보
- 코드 모델명: `AdminClientGroup`
- 주요 필드:
  - `id`
  - `admin_user_id`
  - `name`
  - `color`
  - `created_at`

### `admin_client_group_member`
- 내담자와 그룹의 연결 테이블
- 코드 모델명: `AdminClientGroupMember`
- 주요 필드:
  - `id`
  - `group_id`
  - `client_id`
  - `created_at`
- 주요 제약:
  - `(group_id, client_id)` unique

### `admin_client_report`
- 내담자별 리포트 섹션 저장
- 코드 모델명: `AdminClientReport`
- 주요 필드:
  - `id`
  - `admin_user_id`
  - `client_id`
  - `sections_json`
  - `updated_at`
  - `created_at`

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

### `admin_client_identity_review`
- 애매 매칭 케이스에서 수검자 선택과 관리자 사후 검토를 기록한다.
- 코드 모델명: `AdminClientIdentityReview`
- 주요 필드:
  - `id`
  - `admin_user_id`
  - `admin_custom_test_id`
  - `submission_id`
  - `access_token`
  - `input_profile_json`
  - `candidate_client_ids_json`
  - `responder_choice`
  - `chosen_client_id`
  - `provisional_client_id`
  - `review_status`
  - `reviewed_by`
  - `reviewed_at`
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

### `test_profile_config`
- 검사별 수검자 인적사항 입력 구조와 실시구간 조건 매핑을 저장한다.
- 주요 필드:
  - `test_id`
  - `essential_profile_json`
  - `optional_profile_json`

#### `essential_profile_json.condition_profile_map` 구조

`condition_profile_map`은 `sub_test_json`의 조건 키를 실제 입력 profile 필드와 연결한다.

```json
{
  "condition_profile_map": {
    "age_range": {
      "type": "age_range",
      "profile_field": "child_birth_day",
      "as_of_field": "exam_date"
    },
    "gender": {
      "type": "enum",
      "profile_field": "child_gender"
    },
    "informant": {
      "type": "enum",
      "profile_field": "informant"
    },
    "school_age_range": {
      "type": "school_age_index_range",
      "profile_field": "school_age_range"
    }
  }
}
```

- `type: "age_range"`: `sub_test_json`의 `[년, 월, 일]` 범위를 `profile_field`의 생년월일로 계산한다.
- `type: "enum"`: `sub_test_json`의 허용값 목록과 `profile_field` 값을 비교한다.
- `type: "school_age_index_range"` 또는 `type: "school_age_range"`: `sub_test_json`의 학령 인덱스 범위를 `profile_field`의 학령 라벨/인덱스와 비교한다.
- `as_of_field`: 나이 계산 기준일 필드다. 보통 `exam_date`를 사용한다.
- 매핑이 없는 기존 검사는 런타임 fallback으로 `birth_day`, `gender`, `informant`, `school_age_range` 또는 `school_age`를 사용한다.
- 예: `K-PSI-4-SF`는 `age_range -> parent_birth_day`, `PAT-2`와 `PCT`는 `age_range -> child_birth_day`로 매핑한다.

## Important Relationship Summary
- `admin_user` -> 모든 관리자 도메인 데이터의 상위 소유자
- `child_test` -> 커스텀 검사 본체
- `admin_client_assignment` -> 내담자와 커스텀 검사 연결
- `admin_client_group`, `admin_client_group_member` -> 내담자 그룹 관리
- `admin_client_report` -> 내담자 상세 리포트 섹션 저장
- `admin_custom_test_access_link` -> 외부 수검 진입용 토큰
- `admin_custom_test_submission` -> 실제 응답 저장
- `admin_client_identity_review` -> 애매한 동일인 매칭 검토
- `submission_scoring_result` -> 제출 기반 채점 결과 저장
- `admin_settings`, `client_consent_record` -> 개인정보동의 설정과 기록

## Practical Reading Rule
기능 흐름을 분석할 때는 아래 순서로 같이 보는 것이 좋다.

1. `app/db/models.py`
2. 관련 repository
3. 관련 service
4. startup 보정 코드

테이블 이름과 코드 모델명이 다를 수 있으므로, 설명 시 둘 다 같이 적는 편이 안전하다.

## Related Documents
- [docs/database/README.md](README.md)
- [docs/database/runtime-db.md](runtime-db.md)
- [docs/database/assets-inventory.md](assets-inventory.md)
- [docs/features/client-management.md](../features/client-management.md)
- [docs/features/custom-test-management.md](../features/custom-test-management.md)
- [docs/features/scoring-flow.md](../features/scoring-flow.md)
