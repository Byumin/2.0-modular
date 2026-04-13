# Client Intake Phase 1 Spec

## Role
이 문서는 `Client Intake Policy`를 실제 구현으로 내리기 위한 Phase 1 상세 변경안이다.

범위는 아래 두 모드만 포함한다.

- `pre_registered_only`
- `auto_create`

`auto_create_with_approval`은 이 문서 범위에 포함하지 않는다.

## Source Inputs
- 정책 기준: [docs/features/client-intake-policy.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-policy.md)
- 현재 링크 흐름: [docs/features/assessment-link-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/assessment-link-flow.md)
- 현재 내담자 관리: [docs/features/client-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-management.md)
- 현재 커스텀 검사 관리: [docs/features/custom-test-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/custom-test-management.md)

## Scope
이번 Phase 1에서 설계 대상으로 보는 기능은 아래와 같다.

1. 커스텀 검사별 내담자 생성 정책 저장
2. 링크 진입 시 정책별 분기
3. 자동 생성 시 exact match 내담자 재사용
4. 자동 생성 내담자 출처 기록

이번 문서에서 제외하는 기능:

- 승인 대기 큐
- 관리자 승인 화면
- 중복 내담자 병합 UI
- 생년월일 없는 유사 매칭 승인 흐름
- fuzzy match
- 이메일/전화번호 기반 고급 병합

## Current State Summary
현재 코드 기준 주요 상태는 아래와 같다.

- 커스텀 검사 생성/수정 스키마에는 `client_intake_mode` 필드가 있다.
- `child_test`에는 `client_intake_mode` 컬럼이 있다.
- `admin_client`에는 자동 생성 출처 기록용 `created_source` 컬럼이 있다.
- startup 보정에서 `client_intake_mode`, `created_source`, 다중 배정 unique index를 보정한다.
- 평가 링크 검증은 검사별 `client_intake_mode` 기준으로 `pre_registered_only`와 `auto_create`를 분기한다.
- 공개 링크용 `register-client` API는 `auto_create` 검사에서만 허용된다.

즉, Phase 1은 현재 구현에 반영된 상태이며, 이 문서는 구현 상태와 후속 미구현 범위를 함께 기록한다.

## DB Changes
아래 내용은 현재 구현 기준이다.

### A. `child_test`에 `client_intake_mode` 추가

대상:

- 테이블: `child_test`
- 모델: `AdminCustomTest`

구현 컬럼:

- 이름: `client_intake_mode`
- 타입: `TEXT` 또는 `VARCHAR(40)`
- 허용값:
  - `pre_registered_only`
  - `auto_create`
- nullable: `False`
- 기본값: `pre_registered_only`

이유:

- 검사 단위 정책이어야 하므로 커스텀 검사 row에 두는 것이 자연스럽다.
- 기존 데이터는 모두 현재 동작과 동일하게 `pre_registered_only`로 해석할 수 있다.

### B. `admin_client`에 `created_source` 추가

대상:

- 테이블: `admin_client`
- 모델: `AdminClient`

구현 컬럼:

- 이름: `created_source`
- 타입: `TEXT` 또는 `VARCHAR(40)`
- 허용값:
  - `admin_manual`
  - `assessment_link_auto`
- nullable: `False`
- 기본값: `admin_manual`

이유:

- 자동 생성 내담자와 관리자가 직접 만든 내담자를 구분할 수 있어야 한다.
- 이후 중복 후보 탐지, 병합 우선순위, 운영 감사에 활용 가능하다.

### DB Implementation State
아래 작업은 현재 구현에 반영되어 있다.

- `app/db/models.py`의 `AdminCustomTest.client_intake_mode`
- `app/db/models.py`의 `AdminClient.created_source`
- `app/db/schema_migrations.py`의 startup 보정 함수
- 기존 row의 빈 값에 대한 기본값 backfill

## Schema Changes

### A. 커스텀 검사 생성 요청 스키마
대상:

- `app/schemas/custom_tests.py`
- `CreateCustomTestBatchIn`

구현 필드:

- `client_intake_mode: Literal["pre_registered_only", "auto_create"]`

구현 기본값:

- 명시적 기본값 `pre_registered_only`

의도:

- 관리자 검사 생성 시 정책을 저장한다.

### B. 커스텀 검사 수정 요청 스키마
현재 `UpdateCustomTestSettingsIn`은 이름과 내담자 등록 방식을 함께 수정할 수 있다.

- 수정 가능 필드:
  - `custom_test_name`
  - `client_intake_mode`

이유:

- 검사 생성 후 운영 방식 변경이 가능해야 한다.

### C. 커스텀 검사 조회/목록 응답
반환 필드:

- `client_intake_mode`

대상 응답:

- `GET /api/admin/custom-tests`
- `GET /api/admin/custom-tests/management`
- `GET /api/admin/custom-tests/{custom_test_id}`
- 링크 화면용 `GET /api/assessment-links/{access_token}`에도 포함

이유:

- 관리자 화면에서 현재 정책을 보여줘야 한다.
- 평가 링크 프런트가 정책 기반 안내 문구를 다르게 보여줄 수 있다.

## API Changes

### 1. 기존 관리자 API 확장

#### `POST /api/admin/custom-tests`
입력:

- `client_intake_mode`

동작:

- 생성 시 커스텀 검사 row에 정책 저장

#### `PUT /api/admin/custom-tests/{custom_test_id}`
입력:

- `custom_test_name`
- `client_intake_mode`

### 2. 기존 평가 링크 API 분기 변경

#### `GET /api/assessment-links/{access_token}`
응답:

- `client_intake_mode`

용도:

- 프런트가 미리 정책을 알고 안내 문구를 조정할 수 있다.

#### `POST /api/assessment-links/{access_token}/validate-profile`
정책별 동작:

- `pre_registered_only`
  - 현재와 유사
  - 배정된 내담자 확인 실패 시 진행 차단
- `auto_create`
  - exact match 내담자 already assigned면 통과
  - exact match 내담자 exists but not assigned면 배정 후 통과
  - exact match 내담자 없음이면 자동 생성 + 현재 검사 배정 후 통과

Phase 1 구현 결정:

- 현재 모달 UX를 유지하기 위해 `register-client` API를 별도로 유지한다.
- `validate-profile`은 검증과 정책 판정 역할에 집중한다.

### 3. 공개 등록 API
현재 이미 존재하는 엔드포인트:

- `POST /api/assessment-links/{access_token}/register-client`

Phase 1에서는 이 API를 유지한다.

- 프런트가 모달 확인 후 명시적으로 등록 호출
- `register-client`는 정책이 `auto_create`일 때만 허용된다.
- `validate-profile`은 자동 등록이 필요하면 확인 필요 코드를 반환한다.

## Service Logic

### `pre_registered_only`
1. 링크 조회
2. 프로필 수집
3. 배정된 내담자 exact match 확인
4. 실패 시 차단
5. 성공 시 질문 payload 반환

### `auto_create`
1. 링크 조회
2. 프로필 수집
3. 동일 관리자 아래 exact match 내담자 조회
4. 있으면 현재 검사에 배정
5. 없으면 내담자 생성
6. `created_source = assessment_link_auto`
7. 현재 검사에 배정
8. 질문 payload 반환

### exact match 기준
Phase 1 기준:

- 이름
- 성별
- 생년월일

보조 규칙:

- 이름은 trim 후 exact compare
- 성별은 `normalize_gender_value()` 기준으로 정규화
- 생년월일은 ISO date 기준

## Confirmed Decisions
아래 항목은 현재 합의된 내용이다.

1. `auto_create`에서 exact match 기존 내담자가 이미 다른 검사에 배정되어 있어도 현재 검사에 추가 배정한다.
2. 생년월일이 비어 있으면 exact match 기준에서 제외하고 신규 생성 대상으로 본다.
3. 현재 모달 UX를 유지하기 위해 `register-client` API는 Phase 1에서 유지한다.

## Remaining Open Decision
아래 항목은 구현에서 결론이 난 상태다.

1. 관리자 수동 생성 내담자는 입력된 메모를 사용한다.
2. 자동 생성 내담자는 `created_source = assessment_link_auto`와 함께 기본 메모 `검사 링크에서 자동 등록`을 저장한다.

## Recommended Decision For Implementation
현재 구현은 아래 결정으로 반영되어 있다.

1. 기존 내담자 exact match가 있으면 현재 검사에 추가 배정한다.
2. 생년월일이 비어 있으면 exact match 기준에서 제외하고 신규 생성한다.
3. 자동 생성 내담자에는 `created_source`와 자동 등록 기본 메모를 남긴다.
4. 현재 모달 UX를 유지하기 위해 `register-client` API는 Phase 1에서 유지한다.

## Ambiguous Match Follow-up
아래 케이스는 Phase 1에서 다루지 않고 후속 단계로 넘긴다.

예:

- 기존 내담자: `이름 + 성별` 동일, `birth_day` 없음
- 신규 입력: `이름 + 성별` 동일, `birth_day` 없음

이 경우는 동일인 여부를 자동 확정하지 않는다.

후속 단계 제안:

1. 서버가 `ambiguous_match_pending_approval` 같은 상태를 만든다.
2. 수검자 화면에는 `유사한 기존 내담자가 있어 관리자 확인이 필요하다`는 안내를 띄운다.
3. 관리자 승인 전까지 검사 진행은 보류한다.
4. 관리자는 `기존 내담자로 연결` 또는 `새 내담자로 생성`을 선택한다.
5. 승인 후 검사 진행을 허용한다.

이 흐름은 사실상 `부분 승인 모드`이므로 Phase 2 병합/중복 관리 기능과 함께 다루는 것이 적절하다.

상세 설계는 아래 문서를 본다.

- [docs/features/client-intake-phase2-ambiguous-match-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-phase2-ambiguous-match-spec.md)

## Implementation Order
실제 구현은 아래 순서로 반영되었다.

1. DB 컬럼 설계 확정
2. 모델/스키마 변경
3. 커스텀 검사 생성/수정/조회 API 반영
4. 평가 링크 서비스 정책 분기 반영
5. 관리자 UI 옵션 추가
6. 공개 링크 모달 UX를 정책 기반으로 정리
7. 테스트와 기존 데이터 backfill 검증

## Implementation Checklist
아래 항목은 현재 Phase 1 구현 범위에 반영되어 있다.

- `child_test.client_intake_mode` 컬럼 추가
- `admin_client.created_source` 컬럼 추가
- startup 보정 로직 변경
- 기존 데이터 backfill 전략

아래 항목은 후속 Phase 2 범위다.

- 생년월일 없는 유사 매칭 승인 흐름

## Related Documents
- [docs/features/client-intake-policy.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-policy.md)
- [docs/features/custom-test-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/custom-test-management.md)
- [docs/features/assessment-link-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/assessment-link-flow.md)
- [docs/features/client-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-management.md)
- [docs/features/client-intake-phase2-ambiguous-match-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-phase2-ambiguous-match-spec.md)
