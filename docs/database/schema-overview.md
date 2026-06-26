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
  - `consent_text` — 검사별 개인정보 수집·이용 동의서 문구. 비어 있으면 `admin_settings.consent_text`를 fallback으로 사용.
  - `requires_security_notice` — 수검 전 개인정보 보안관리 안내 확인 필요 여부.
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

### `admin_custom_test_source`
- `child_test`에 포함된 원형 검사 목록을 row 단위로 표현하는 expand-only 테이블이다.
- 기존 `child_test.test_id` JSON 배열의 정규화 대상이다.
- 1차 단계에서는 기존 JSON 경로와 병행하며, 원형 `test.id`는 문자열 `source_test_id`로 참조한다.
- 주요 필드:
  - `id`
  - `custom_test_id` -> `child_test.id`
  - `source_test_id`
  - `source_order`
  - `is_enabled`
  - `created_at`
- 주요 제약:
  - `(custom_test_id, source_test_id)` unique

### `admin_custom_test_scale_selection`
- 관리자가 원형 검사별로 선택한 scale code 의도를 저장한다.
- `available_scale_codes`나 실시구간별 `selected_scale_codes`는 원형 condition에서 계산되는 projection이므로 이 테이블의 원본 속성이 아니다.
- 주요 필드:
  - `id`
  - `custom_test_source_id` -> `admin_custom_test_source.id`
  - `scale_code`
  - `selected_order`
  - `created_at`
- 주요 제약:
  - `(custom_test_source_id, scale_code)` unique

### `admin_custom_test_variant_projection`
- 원형 `itemcondition`, `scalecondition`, `normcondition`의 교집합으로 산출된 현재 실시구간 projection이다.
- source of truth가 아니라 재계산 가능한 파생 구조다.
- 주요 필드:
  - `id`
  - `custom_test_source_id` -> `admin_custom_test_source.id`
  - `condition_hash`
  - `eligibility_condition_json`
  - `generated_from_hash`
  - `is_current`
  - `status`
  - `generated_at`
- 주요 제약:
  - `(custom_test_source_id, condition_hash, generated_from_hash)` unique

### `admin_custom_test_source_dependency`
- custom test source projection이 어떤 원형 condition/item/scale 상태를 관측했는지 hash로 기록한다.
- 원형 검사 condition이 바뀌었을 때 stale projection을 찾는 기준이다.
- 주요 필드:
  - `id`
  - `custom_test_source_id` -> `admin_custom_test_source.id`
  - `dependency_type`
  - `dependency_id`
  - `dependency_hash`
  - `observed_at`
- 주요 제약:
  - `(custom_test_source_id, dependency_type, dependency_id)` unique

### `admin_custom_test_variant_scale_projection`
- projection별 scale availability/selection 상태를 저장한다.
- `admin_custom_test_scale_selection`과 원형 `scale.struct`를 조합해 재계산 가능한 파생 구조다.
- 주요 필드:
  - `id`
  - `variant_projection_id` -> `admin_custom_test_variant_projection.id`
  - `scale_code`
  - `availability_status`
  - `created_at`
- 주요 제약:
  - `(variant_projection_id, scale_code)` unique

### `admin_custom_test_session`
- custom test의 수검 세션 메타를 row 단위로 저장한다.
- 기존 `child_test.session_configs_json`의 정규화 대상이다.
- 주요 필드:
  - `id`
  - `custom_test_id` -> `child_test.id`
  - `session_index`
  - `title`
  - `description`
  - `guide_items_json`
  - `created_at`
- 주요 제약:
  - `(custom_test_id, session_index)` unique

### `admin_custom_test_session_source`
- 세션과 원형 검사 source의 연결이다.
- 원형 condition 변경으로 실시구간 variant가 늘거나 줄어도 세션에 어떤 원형 검사가 들어가는지라는 관리자 의도는 유지된다.
- 주요 필드:
  - `id`
  - `session_id` -> `admin_custom_test_session.id`
  - `custom_test_source_id` -> `admin_custom_test_source.id`
  - `display_order`
- 주요 제약:
  - `(session_id, custom_test_source_id)` unique

### `admin_custom_test_profile_field`
- custom test 자체의 추가 profile field를 row 단위로 저장한다.
- 기존 `child_test.additional_profile_fields_json`의 정규화 대상이다.
- 주요 필드:
  - `id`
  - `custom_test_id` -> `child_test.id`
  - `field_key`
  - `label`
  - `input_type`
  - `required`
  - `options_json`
  - `display_order`
  - `created_at`
- 주요 제약:
  - `(custom_test_id, field_key)` unique

### Custom Test Restructure Result

#### Layering

기존 `child_test` row는 커스텀 검사 정의의 상위 호환 row로 유지한다. 새 테이블은 `child_test` 안에 섞여 있던 JSON 반복 구조를 아래 세 계층으로 분리한다.

```text
Source of truth:
- admin_custom_test_source
- admin_custom_test_scale_selection
- admin_custom_test_session
- admin_custom_test_session_source
- admin_custom_test_profile_field

Projection:
- admin_custom_test_variant_projection
- admin_custom_test_source_dependency
- admin_custom_test_variant_scale_projection

Snapshot:
- submission_custom_test_snapshot
```

관리자가 직접 선택한 의도는 source-of-truth 계층에 저장한다. 원형 검사 `itemcondition`, `scalecondition`, `normcondition`, `scale`, `item`에서 계산되는 실시구간과 척도 가용성은 projection 계층에 저장한다. 제출 이후 의미가 바뀌면 안 되는 구성은 snapshot 계층에 저장한다.

#### Table Responsibility

| 테이블 | 목적 | 기존 JSON/text에서 분리한 내용 | 정규화 효과 |
| --- | --- | --- | --- |
| `admin_custom_test_source` | 커스텀 검사에 포함된 원형 검사 목록과 순서 | `child_test.test_id` JSON 배열 | 반복 그룹을 원형 검사별 row로 분해한다. |
| `admin_custom_test_scale_selection` | 원형 검사별 관리자 scale 선택 의도 | `selected_scales_json` 안의 선택 scale | 선택 의도를 `(custom_test_source_id, scale_code)` 단위로 식별한다. |
| `admin_custom_test_variant_projection` | 현재 원형 condition 기준으로 산출된 실시구간 | `sub_test_json`, variant condition | 계산 가능한 파생값을 source-of-truth에서 분리한다. |
| `admin_custom_test_source_dependency` | projection 산출 시 관측한 원형 condition/item/scale hash | JSON 안에 명시되지 않던 원형 의존성 | 원형 검사 변경 감지 기준을 row 단위로 보존한다. |
| `admin_custom_test_variant_scale_projection` | variant별 scale availability/selection 상태 | variant별 `available_scale_codes`, `selected_scale_codes` | variant와 scale의 다대다 상태를 독립 row로 표현한다. |
| `admin_custom_test_session` | 세션 제목, 설명, 안내 항목 | `session_configs_json` | 세션 메타를 세션별 row로 분해한다. |
| `admin_custom_test_session_source` | 세션과 원형 검사의 연결 | 세션 안의 `test_ids` 배열 | 세션-검사 다대다 관계를 연결 테이블로 분리한다. |
| `admin_custom_test_profile_field` | 커스텀 검사 추가 인적사항 필드 | `additional_profile_fields_json` | 필드 key별 속성을 독립 row로 관리한다. |
| `submission_custom_test_snapshot` | 제출 당시 검사 구성과 profile/scale/session snapshot | 제출 시점의 runtime payload | 이후 설정 변경과 원형 condition 변경으로부터 과거 제출 의미를 보존한다. |

#### Normal Form Impact

1NF 관점에서는 `child_test.test_id`, `selected_scales_json`, `session_configs_json`, `additional_profile_fields_json`에 들어 있던 배열과 중첩 JSON 반복 그룹을 row 단위로 분해했다. 이로써 한 컬럼에 여러 원형 검사, 여러 scale, 여러 session, 여러 profile field가 함께 들어가는 구조를 줄였다.

2NF 관점에서는 `child_test.id` 하나에 묶여 있던 속성 중 실제 결정자가 더 작은 값을 분리했다. scale 선택은 `child_test.id` 전체보다 `custom_test_source_id`와 `scale_code` 조합에 의존한다. 세션과 원형 검사의 연결은 `session_id`와 `custom_test_source_id` 조합에 의존한다. variant별 scale 상태는 `variant_projection_id`와 `scale_code` 조합에 의존한다.

3NF 관점에서는 관리자 선택 의도와 원형 검사에서 유도되는 파생값을 분리했다. `admin_custom_test_scale_selection`은 관리자가 고른 scale 의도만 저장하고, variant별 available/selected 상태는 `admin_custom_test_variant_scale_projection`에 projection으로 저장한다. `admin_custom_test_source_dependency`는 projection의 원형 의존성을 hash로 보존해 원형 검사 변경 시 stale projection을 찾는 기준이 된다.

#### Anomaly Reduction

삽입 이상은 줄어든다. 예전에는 원형 검사 하나나 추가 profile field 하나만 추가해도 큰 JSON 구조 전체를 올바른 shape로 만들어 저장해야 했다. 새 구조에서는 source, scale selection, session, profile field를 필요한 row 단위로 추가할 수 있다.

갱신 이상은 줄어든다. 세션 제목 하나, 특정 원형 검사의 scale 선택 하나, profile field의 required 여부 하나를 바꿀 때 JSON 전체를 파싱하고 다시 직렬화하지 않아도 된다. 또한 원형 condition 변경으로 재계산되어야 하는 값과 관리자가 직접 선택한 값이 분리되어 있어, projection만 갱신하는 경로를 만들 수 있다.

삭제 이상은 줄어든다. 특정 세션에서 원형 검사를 제외하는 일은 `admin_custom_test_session_source` row 삭제로 표현되고, 커스텀 검사에서 원형 검사 자체를 제외하는 일은 `admin_custom_test_source` 계층 삭제로 표현된다. 이미 제출된 결과는 `submission_custom_test_snapshot`에 고정되므로 현재 custom test 구성을 정리해도 과거 제출 의미가 함께 사라지지 않는다.

#### Performance And Operational Effect

조회 조인은 증가한다. 대신 JSON 컬럼 전체를 반복 파싱하고 의미를 추론하던 비용을 row 조회와 projection 조회로 옮긴다. 특히 custom test source, scale, session, profile field는 인덱스와 unique constraint를 가진 row 단위로 접근할 수 있다.

원형 검사 condition 변경 영향 분석은 `admin_custom_test_source_dependency`의 dependency hash 비교로 좁힐 수 있다. 전체 `child_test` JSON을 모두 열어 비교하는 대신, 어떤 custom test source가 어떤 원형 dependency를 관측했는지 기준으로 stale projection 후보를 찾을 수 있다.

수검 payload 생성은 새 projection read path를 우선 사용하고, 새 구조가 비어 있으면 기존 JSON으로 fallback한다. 이 단계적 read path는 운영 호환성을 유지하면서 projection 기반 조립으로 이동하기 위한 완충 장치다.

운영 RDS 백필 결과 기준 row 수는 아래와 같다.

| 테이블 | row 수 |
| --- | ---: |
| `admin_custom_test_source` | 82 |
| `admin_custom_test_scale_selection` | 426 |
| `admin_custom_test_variant_projection` | 352 |
| `admin_custom_test_source_dependency` | 10555 |
| `admin_custom_test_variant_scale_projection` | 3570 |
| `admin_custom_test_session` | 45 |
| `admin_custom_test_session_source` | 82 |
| `admin_custom_test_profile_field` | 1 |
| `submission_custom_test_snapshot` | 69 |

이 row 수는 기존 운영 RDS의 `child_test`와 제출 데이터를 새 구조에 백필한 결과다. 기존 `child_test` JSON 컬럼은 삭제하지 않았고, 현재 런타임은 새 구조 우선 조회와 legacy JSON fallback을 병행한다.

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

### `submission_custom_test_snapshot`
- 제출 당시 custom test 구성과 원형 condition dependency 상태를 고정하는 snapshot 테이블이다.
- 현재 custom test projection은 원형 검사 condition 변경 영향을 받지만, 이미 제출된 보고서/채점 의미는 이 snapshot을 기준으로 보존한다.
- 주요 필드:
  - `id`
  - `submission_id` -> `admin_custom_test_submission.id`
  - `custom_test_id` -> `child_test.id`
  - `source_test_ids_snapshot_json`
  - `variant_projection_snapshot_json`
  - `selected_scales_snapshot_json`
  - `session_configs_snapshot_json`
  - `profile_fields_snapshot_json`
  - `source_dependency_hash_snapshot`
  - `snapshot_source`
  - `created_at`
- 주요 제약:
  - `submission_id` unique

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
  - `security_notice_text`
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
