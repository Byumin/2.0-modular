# Client Intake Phase 2: Ambiguous Match Spec

## Role
이 문서는 검사 인적사항 입력 시 이름+성별이 일치하는 기존 내담자가 있으나 생년월일로 동일인 여부를 자동 확정할 수 없는 케이스(애매 매칭)를 처리하는 Phase 2 설계 문서다.

이 문서는 `Client Intake Policy`와 `Client Intake Phase 1 Spec`의 후속 문서다.

## Problem
Phase 1의 exact match 기준은 아래와 같다.

- 이름
- 성별
- 생년월일

이 기준은 안전하지만, 다음 케이스를 자동으로 처리하지 못한다.

- 검사 자체가 생년월일을 요구하지 않아 이름+성별만 입력한 경우
- 기존 내담자와 이름/성별은 같지만 생년월일 없이 동일인 여부를 확정하기 어려운 경우

이 경우를 무조건 신규 생성하면 중복 데이터가 쌓이고, 무조건 기존 내담자로 연결하면 오매칭 위험이 있다.

## Design Decision
수검자를 대기시키지 않는다. 수검자는 모달에서 선택 후 즉시 검사를 진행한다.
관리자는 사후에 알람을 통해 검토하고 병합 또는 신규 확정을 결정한다.

이 방식의 근거:
- 수검자 대기는 검사 완료율을 낮춘다.
- 동일인 여부 판단은 관리자가 더 정확하게 할 수 있다.
- 사후 처리도 데이터 품질을 충분히 확보한다.

## Ambiguous Match Definition
애매 매칭으로 보는 경우:

- 같은 관리자 아래 배정된 내담자 중
- 이름 동일 (trim 기준)
- 성별 동일
- 생년월일이 입력되지 않았거나, 입력됐지만 일치하는 내담자가 없는 경우
- 결과적으로 후보가 2명 이상 남는 경우

자동 exact match로 보는 경우:

- 이름 동일 + 성별 동일 + 생년월일 동일 → 단일 후보 매칭

자동 신규 생성으로 보는 경우 (auto_create 모드):

- 이름이 일치하는 배정 내담자가 없음
- 애매 후보도 없음

## User Flow

### 수검자 측
1. 검사 링크 접근
2. 인적사항 입력 (생년월일 없이 이름+성별만 입력 가능한 경우)
3. `POST /api/assessment-links/{token}/validate-profile` 호출
4. 서버가 `AMBIGUOUS_CLIENT` 응답 반환 (후보 내담자 목록 포함)
5. 수검자 화면에 모달 표시:
   - 후보 내담자 정보(이름/성별/생년월일) 목록 표시
   - "기존 내담자가 맞습니다" 선택 → `client_id` 포함 재요청
   - "새로운 내담자로 등록합니다" 선택 → `responder_choice: "new"` 포함 재요청
6. 서버가 선택을 수용하고 즉시 검사 payload 반환 (차단 없음)
7. 수검자가 검사 진행 및 제출
8. 제출 완료 → 서버가 `admin_client_identity_review` 레코드 생성

### 관리자 측
1. 관리자 화면에 pending review 알람 배지 표시
2. 관리자가 알람 클릭 → 검토 목록 화면으로 이동
3. 검토 항목별 정보 확인:
   - 수검자 입력 인적사항
   - 수검자 선택 ("기존" 또는 "신규")
   - 후보 기존 내담자 정보
   - 실시한 검사명 및 제출 일시
4. 관리자 결정:
   - **기존 내담자로 병합**: 임시 내담자 제출 기록을 기존 내담자에 재링크, 임시 내담자 삭제
   - **신규 내담자로 확정**: 임시 내담자를 정식 내담자로 확정 (created_source 정규화)
   - **거절**: 제출 기록 유지, 내담자 처리 없음

## Data Model

### `admin_client_identity_review` 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | |
| admin_user_id | INTEGER NOT NULL | 검사 소유 관리자 |
| admin_custom_test_id | INTEGER NOT NULL | 검사 ID |
| submission_id | INTEGER NULL | 제출 완료 후 연결 |
| access_token | VARCHAR(40) | 사용된 검사 링크 토큰 |
| input_profile_json | TEXT | 수검자 입력 인적사항 (JSON) |
| candidate_client_ids_json | TEXT | 후보 내담자 id 목록 (JSON array) |
| responder_choice | VARCHAR(20) | `existing` 또는 `new` |
| chosen_client_id | INTEGER NULL | 기존 선택 시 해당 client id |
| provisional_client_id | INTEGER NULL | 신규 선택 시 임시 내담자 id |
| review_status | VARCHAR(30) | `pending` / `merged` / `confirmed_new` / `rejected` |
| reviewed_by | INTEGER NULL | 처리한 관리자 user id |
| reviewed_at | DATETIME NULL | 처리 일시 |
| created_at | DATETIME NOT NULL | 생성 일시 |

### review_status 값 의미

| 값 | 의미 |
|------|------|
| `pending` | 관리자 검토 전 |
| `merged` | 기존 내담자로 병합 완료 |
| `confirmed_new` | 신규 내담자로 확정 완료 |
| `rejected` | 관리자가 거절 처리 |

## Provisional Client Strategy

수검자가 "신규 등록" 선택 시:
- `created_source = assessment_link_provisional`로 임시 내담자 생성
- 검사 즉시 진행
- 관리자 병합 결정 시 → 제출 기록을 기존 내담자에 재링크 + 임시 내담자 삭제
- 관리자 신규 확정 시 → `created_source = assessment_link_auto`로 변경

수검자가 "기존 내담자" 선택 시:
- 선택한 `client_id`로 검사 진행 (신규 생성 없음)
- 관리자 확인 후 문제 없으면 별도 처리 불필요
- 관리자가 오매칭 판단 시 → 제출 기록 별도 처리

## API Design

### 수검자 측

#### `POST /api/assessment-links/{token}/validate-profile`
요청:
```json
{
  "profile": {"name": "홍길동", "gender": "남"},
  "client_id": null,
  "responder_choice": null
}
```

AMBIGUOUS 응답 (첫 요청):
```json
{
  "code": "AMBIGUOUS_CLIENT",
  "message": "동일한 인적사항의 내담자가 여러 명입니다. 본인을 선택해주세요.",
  "candidates": [
    {"id": 1, "name": "홍길동", "gender": "남", "birth_day": "1990-05-15"},
    {"id": 2, "name": "홍길동", "gender": "남", "birth_day": "1985-03-22"}
  ]
}
```

기존 선택 재요청:
```json
{
  "profile": {"name": "홍길동", "gender": "남"},
  "client_id": 1,
  "responder_choice": "existing"
}
```

신규 선택 재요청:
```json
{
  "profile": {"name": "홍길동", "gender": "남"},
  "client_id": null,
  "responder_choice": "new"
}
```

성공 응답 (선택 후):
```json
{
  "message": "확인이 완료되었습니다.",
  "client_id": 1,
  "is_ambiguous_match": true,
  "assessment_payload": {...}
}
```

### 관리자 측

#### `GET /api/admin/identity-reviews`
응답: pending 목록 + 카운트

#### `POST /api/admin/identity-reviews/{review_id}/merge`
기존 내담자로 병합 처리

#### `POST /api/admin/identity-reviews/{review_id}/confirm-new`
신규 내담자로 확정 처리

#### `POST /api/admin/identity-reviews/{review_id}/reject`
거절 처리

## created_source 확장

기존 값:
- `admin_manual`
- `assessment_link_auto`

추가 값:
- `assessment_link_provisional`: 애매 매칭에서 임시 생성된 내담자 (관리자 확정 전)

## Notification Strategy (Phase 2 범위)

- 관리자 화면 헤더/사이드바에 pending review 카운트 배지 표시
- `GET /api/admin/identity-reviews` 응답에 `pending_count` 포함
- polling 방식 (초기 구현), 이후 필요 시 WebSocket 전환 검토

## Scope

### In Scope
- 애매 매칭 판정 (이름+성별 일치, 단일 확정 불가)
- 수검자 즉시 진행 (non-blocking)
- 관리자 사후 검토 + 병합/신규확정/거절
- pending review 알람 배지
- provisional 내담자 생성 및 확정 흐름

### Out of Scope
- fuzzy string match
- 이메일/전화번호 기반 중복 탐지
- 자동 병합 추천
- WebSocket 실시간 알람

## Related Documents
- [docs/features/client-intake-policy.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-policy.md)
- [docs/features/client-intake-phase1-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-phase1-spec.md)
- [docs/features/assessment-link-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/assessment-link-flow.md)
- [docs/features/client-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-management.md)
- [docs/exec-plans/2026-04-13-client-intake-ambiguous-review-impl.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/2026-04-13-client-intake-ambiguous-review-impl.md)
