# Client Assignment Multi Spec

## Purpose
이 문서는 `admin_client_assignment`를 다중 동시 배정 기준으로 재해석하고, 관련 DB/스키마/API/UI 변경 방향을 정하는 상세 설계 문서다.

현재 source of truth는 다음 두 문서와 연결된다.

- 정책 기준: [client-intake-policy.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-policy.md)
- 자동 생성 Phase 1 상세: [client-intake-phase1-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-phase1-spec.md)

## Background
현재 구조에서는 같은 내담자를 여러 검사에 동시에 배정하는 요구가 자연스럽게 생긴다.

대표 사례:

- 같은 내담자가 여러 커스텀 검사를 순차 또는 병렬로 진행
- `auto_create` 모드에서 기존 내담자를 재사용해 새 검사에 연결
- 검사 조합이 유동적인 모듈형 운영에서 동일 내담자에게 검사 세트를 확장

현재 서비스는 다중 동시 배정 기준으로 전환되어 있다.

## Current State
현재 `admin_client_assignment`는 `내담자-검사 연결 row`로 사용한다.

현재 구현 기준:

- `(admin_user_id, admin_client_id, admin_custom_test_id)` unique index로 중복 배정을 막는다.
- `POST /api/admin/clients/{client_id}/assignments`로 검사 배정을 추가한다.
- `DELETE /api/admin/clients/{client_id}/assignments/{custom_test_id}`로 특정 검사 배정만 해제한다.
- 내담자 목록/상세 응답은 `assigned_custom_tests` 목록과 `assigned_custom_test_count`를 반환한다.
- React 관리자 UI는 내담자별 복수 배정 목록을 보여주고 검사별 해제를 지원한다.

기존 내담자를 다른 검사에 다시 배정해도 기존 배정은 유지되고 새 연결 row만 추가된다.

## Goal State
현재 목표 상태는 구현에 반영되어 있다.

- 한 내담자는 여러 커스텀 검사에 동시에 배정될 수 있다.
- 같은 검사에 같은 내담자를 중복 배정하지 않는다.
- assessment link 검증은 “해당 검사에 이 내담자가 배정되어 있는지”만 판단한다.
- 자동 생성/기존 내담자 재사용은 기존 다른 검사 배정을 깨지 않는다.
- 관리자 UI는 내담자별 복수 배정 목록과 검사별 배정 내담자 목록을 함께 보여준다.

## DB Change Direction
현재 구현에 반영된 방향이다.

### 1. `admin_client_assignment` 사용 방식 변경
새 테이블을 만들기보다, 기존 테이블을 `내담자-검사 연결 row`로 정상화해서 사용한다.

목표 규칙:

- 한 row는 `admin_user_id + admin_client_id + admin_custom_test_id` 1건의 연결을 의미한다.
- 같은 조합의 중복 row는 허용하지 않는다.
- 특정 검사 해제는 해당 검사 row만 삭제한다.
- 특정 내담자의 전체 배정 해제는 해당 내담자의 assignment row 전체를 삭제한다.

### 2. 유니크 제약 또는 중복 방지 기준
구현 기준:

- `(admin_user_id, admin_client_id, admin_custom_test_id)` unique

이 제약이 있으면 같은 검사 중복 배정을 DB 차원에서 막을 수 있다.

### 3. 기존 데이터 마이그레이션
현재 row는 대부분 단일 배정 상태일 가능성이 높다.

마이그레이션 방향:

- 기존 row는 그대로 유지 가능
- 추가 제약만 넣기 전, 중복 row 존재 여부를 점검
- 중복이 있으면 정리 후 unique 적용

## Repository Change Direction
repository는 목록/존재 확인 중심으로 전환되어 있다.

현재 기준:

- `get_client_assignment_with_test_name()`
  - `list_assignments_by_client_with_test_name()`를 통해 목록을 반환한다.
- `list_client_assignments_with_test_name()`
  - 전체 배정 목록을 반환하며 서비스가 client별 목록으로 묶어 사용한다.
- `get_assignment_by_admin_client_and_test()`
  - 특정 내담자와 검사 조합의 배정 존재 여부를 확인한다.
- `delete_assignment_by_admin_client_and_test()`
  - 특정 검사 배정만 삭제한다.

## Service State

### 1. 배정 저장
현재:

- `assign_client_to_test(admin_id, client_id, custom_test_id)`:
  - 이미 있으면 no-op
  - 없으면 row 추가
- `unassign_client_from_test(admin_id, client_id, custom_test_id)`:
  - 해당 검사 row만 삭제
- 필요 시
  - `clear_client_assignments(admin_id, client_id)`

### 2. 내담자 목록 응답
현재 응답:

- `assigned_custom_tests: []`
- 각 item 예시:
```json
{
  "id": 14,
  "custom_test_name": "정서 프로파일 A",
  "parent_test_name": "HTP"
}
```

현재 호환성 기준:

- 단수 배정 필드는 응답 기준으로 사용하지 않는다.
- 기준 필드는 목록형이다.

### 3. 내담자 상세 응답
단건 배정 표시 대신 복수 배정 목록을 반환한다.

현재 응답 필드:

- `assigned_custom_tests`
- `assigned_custom_test_count`

### 4. assessment link 자동 생성/재사용
현재:

- 기존 내담자 exact match 시 새 assignment row만 추가
- 다른 검사 배정은 유지

## API Change Direction

### 현재 API
현재는 분리형 배정 추가/삭제 API를 사용한다.

- `POST /api/admin/clients/{client_id}/assignments`
- `DELETE /api/admin/clients/{client_id}/assignments/{custom_test_id}`

### 관리자 목록/상세 API
- `GET /api/admin/clients`
- `GET /api/admin/clients/{client_id}`

둘 다 복수 배정 목록을 반환한다.

### assessment link 관련 API
- `POST /api/assessment-links/{access_token}/register-client`

기존 내담자 재사용 시 assignment 추가만 수행한다.

## Admin UI Change Direction

### 1. 내담자 목록
현재:

- 배정 검사 목록 요약 표시
- 예: `정서 프로파일 A 외 2건`

### 2. 검사별 배정 화면
현재:

- 같은 내담자를 여러 검사에 추가 배정 가능
- 해제는 해당 검사에 대한 연결만 제거
- 옵션 문구도 `현재 배정: A, B`처럼 목록 기준으로 갱신

### 3. 내담자 상세
현재:

- 배정 검사 목록
- 검사별 해제 액션
- 필요 시 배정 추가 UI

## Backward Compatibility Strategy
현재 구현은 단수 배정 필드 대신 목록형 필드를 기준으로 동작한다.

- 응답 기준 필드: `assigned_custom_tests`
- 보조 집계 필드: `assigned_custom_test_count`
- 교체형 `PUT /assignment`는 현재 라우터에 없다.

## Confirmed Decisions
다음 항목은 2026-04-10 기준으로 방향을 확정했다.

1. `admin_client_assignment`에는 `(admin_user_id, admin_client_id, admin_custom_test_id)` unique 기준을 둔다.
2. 배정 API는 유지형 `PUT /assignment`가 아니라 분리형 추가/삭제 API로 전환한다.
3. 단수 배정 필드는 다중 배정 전환과 함께 제거하고 목록형 응답을 기준으로 간다.
4. 관리자 UI는 `검사별 배정 화면`을 먼저 목록형으로 바꾸고, 그 다음 `내담자 상세`를 수정한다.

## Implementation Status
현재 구현은 아래 핵심 항목을 반영한 상태다.

1. `admin_client_assignment` 중복 row 여부를 점검한 뒤 unique 기준을 반영한다.
2. repository/service를 다중 배정 기준으로 수정한다.
3. 배정 API를 분리형 `POST /assignments`, `DELETE /assignments/{custom_test_id}` 구조로 교체한다.
4. `GET /api/admin/clients*` 응답을 `assigned_custom_tests` 목록형 기준으로 전환하고 단수 필드를 제거한다.
5. `register-client`와 자동 생성 재사용 흐름을 다중 배정 기준으로 수정한다.
6. 관리자 `검사별 배정 화면`을 목록형 UI로 전환한다.
7. 관리자 `내담자 상세`를 목록형으로 전환한다.

## Related Documents
- [docs/features/client-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-management.md)
- [docs/features/client-intake-policy.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-policy.md)
- [docs/features/client-intake-phase1-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-phase1-spec.md)
- [docs/features/assessment-link-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/assessment-link-flow.md)
- [docs/database/schema-overview.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/schema-overview.md)
