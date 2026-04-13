# 2026-04-10 Client Assignment Multi Spec

## 작업 목표
- 현재 `관리자 + 내담자 -> 단일 현재 검사 배정` 전제를 문서로 정리한다.
- 다중 동시 배정이 필요한 이유와 영향 범위를 고정한다.
- 실제 DB/서비스/UI 리팩터링 전에 기준 설계 문서를 만든다.

## 초기 가설과 접근 방식
- 현재 `admin_client_assignment` 테이블 자체는 다중 row를 담을 수 있지만, 서비스와 UI가 `관리자 + 내담자`당 단일 row처럼 사용하고 있다.
- 그래서 문제의 본질은 테이블 신설보다도, 조회/응답/배정 API/관리자 화면의 단건 전제를 제거하는 것이다.
- 우선 영향 범위를 정리하고, DB/응답 구조/운영 플로우를 문서화한 뒤 실제 구현으로 내려간다.

## 단계별 실행 계획
1. 현재 단일 배정 전제를 쓰는 repository/service/UI 지점을 다시 확인한다.
2. 다중 동시 배정 요구사항과 목표 상태를 기능 문서로 정리한다.
3. DB, 스키마, API, 관리자 UI, assessment link 영향 범위를 한 문서에 모은다.
4. 실제 구현 전에 승인/결정이 필요한 항목을 분리한다.

## 작업 중 변경된 계획과 변경 이유
- 변경 없음.

## 최종 결과
- 단일 배정 전제가 박혀 있는 지점을 다시 확인했다.
- 다중 동시 배정 상세 설계 문서 `docs/features/client-assignment-multi-spec.md`를 추가했다.
- 기능 허브와 관련 기능 문서에 source 링크를 연결했다.
- 구현 전 결정 사항도 확정했다.
- 실제 구현까지 반영했다.

## 확인한 핵심 지점
- `app/services/admin/clients.py`
  - `upsert_client_assignment()`가 기존 row를 덮어쓴다.
  - `list_admin_clients()`와 `get_admin_client_detail()`이 단수 배정 필드만 반환한다.
- `app/repositories/client_repository.py`
  - `get_assignment_by_admin_and_client()`와 `get_client_assignment_with_test_name()`이 단건 조회 전제를 둔다.
- `static/admin.js`
  - 내담자 목록, 배정 화면, 내담자 상세가 `assigned_custom_test_id` / `assigned_custom_test_name` 단수 필드에 의존한다.

## 최종 결과 후속 작업
- 관리자 `검사별 배정 화면`의 실제 사용성 점검
- 관리자 `내담자 상세` 목록형 개편
- 필요 시 배정 목록을 더 구조적으로 보여주는 UI 보강

## 확정된 결정 사항
1. `admin_client_assignment`에는 `(admin_user_id, admin_client_id, admin_custom_test_id)` unique 기준을 둔다.
2. 배정 API는 분리형 `POST/DELETE /assignments`로 간다.
3. `assigned_custom_test_id` 같은 단수 필드는 다중 배정 전환 시 제거 대상으로 본다.
4. 관리자 UI는 검사별 배정 화면을 먼저 바꾸고, 내담자 상세는 후속으로 바꾼다.

## 실제 반영 내용
- `app/db/models.py`
  - `AdminClientAssignment`에 triplet unique 제약을 추가했다.
- `app/db/schema_migrations.py`
  - `ensure_admin_client_assignment_unique_index()`를 추가했다.
- `app/main.py`
  - startup에서 assignment unique index 보정을 호출하게 했다.
- `app/repositories/client_repository.py`
  - 단건 현재 배정 조회 대신 `관리자 + 내담자 + 검사` 기준 조회와 `내담자별 assignment 목록` 조회 helper를 추가했다.
- `app/services/admin/clients.py`
  - `upsert_client_assignment()`를 제거하고 `assign_client_to_test()` / `unassign_client_from_test()`로 분리했다.
  - `list_admin_clients()`와 `get_admin_client_detail()`은 `assigned_custom_tests` 목록형 응답을 반환한다.
  - 자동 생성 재사용 시 기존 배정을 교체하지 않고 assignment row를 추가한다.
- `app/router/client_router.py`
  - `PUT /assignment`를 제거하고 `POST /assignments`, `DELETE /assignments/{custom_test_id}`를 추가했다.
- `app/schemas/clients.py`
  - 단일 배정 입력 필드를 제거하고 분리형 배정 요청 스키마를 추가했다.
- `static/admin.js`
  - 검사별 배정 화면을 다중 배정 기준으로 수정했다.
  - 클라이언트 목록/상세/결과 화면은 목록형 응답을 요약해서 읽도록 조정했다.

## 검증
- `modular.db` 실제 중복 row 점검 결과: `NO_DUPLICATES`
- 실제 `modular.db`에 `uq_admin_client_assignment_triplet` unique index를 생성했다.
- `python3 -m py_compile` 통과
- `node -e "new Function(...admin.js)"` 통과
- 임시 DB 복사본 스모크 테스트 결과
  - 두 번째 검사 배정 추가 후 assignment row가 `(1), (2)`로 공존
  - 특정 검사만 해제 후 `(1)`만 유지
  - exact match 재사용 후 새 내담자 생성 없이 기존 내담자 `1`에 `(1), (2)` assignment가 함께 유지

## 작업 중 변경된 계획과 변경 이유
- 단수 필드를 즉시 제거하면 일부 관리자 화면이 깨질 수 있어서, `내담자 상세`와 `결과 화면`은 목록형 응답을 요약해서 읽는 임시 적응 로직을 추가했다.
- 로컬 앱 서버는 startup까지 정상 동작했지만, 현재 세션에서 별도 명령으로 localhost 접속이 되지 않아 브라우저 스크린샷 검증은 완료하지 못했다.

## 회고
- 이번 이슈는 DB 테이블 부족보다 응답 구조와 관리자 화면이 단수 전제를 오래 끌고 온 것이 더 큰 원인이었다.
- 실제 구현 전에 문서로 영향 범위를 끊어둔 것은 계획 문제를 줄이는 데 필요했다.
