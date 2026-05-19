# Client Intake Phase 1 구현

## 요청 요약
- 승인된 범위에서 `pre_registered_only`와 `auto_create` 정책을 실제 코드에 반영한다.
- `child_test.client_intake_mode`, `admin_client.created_source`를 추가하고 startup 보정과 기존 데이터 기본값을 처리한다.
- 커스텀 검사 생성/수정/조회, 평가 링크 검증/등록, 관리자 UI를 함께 갱신한다.

## 작업 목표
- 검사별 내담자 수집 정책을 실제 저장/조회/수정 가능하게 만든다.
- 자동 생성 내담자 출처를 저장한다.
- 평가 링크 흐름이 정책별로 동작하게 만든다.
- 관리자 검사 생성 화면과 상세 화면에서 정책을 설정/확인할 수 있게 만든다.

## 초기 가설
- 현재 startup 보정 패턴을 따라 컬럼 추가와 기본값 backfill을 안전하게 붙일 수 있다.
- 공개 링크 자동 등록 API는 유지하면서, `auto_create` 정책일 때만 허용하도록 좁히는 것이 최소 변경에 적합하다.
- 관리자 UI는 생성 모달과 상세 화면에 선택 필드만 추가해도 1차 운영에 충분하다.

## 실행 계획
1. startup 보정 함수와 모델을 확장한다.
2. 커스텀 검사/내담자 서비스와 스키마를 정책 필드 기준으로 수정한다.
3. 평가 링크 검증/등록 흐름에 정책 분기를 추가한다.
4. 관리자 생성/상세 UI를 수정한다.
5. 파이썬 컴파일, JS 파싱, DB 스모크 테스트, 정적 UI 캡처로 검증한다.

## 작업 중 변경 사항
- 현재 앱 서버는 로컬 FastAPI/Starlette 환경 충돌로 정상 기동되지 않아 startup 전체 검증은 못 했다.
- 대신 승인된 DB 컬럼 보정 함수는 수동으로 실행해 실제 `modular.db`에 반영했다.
- 평가 링크 자동 생성 흐름은 운영 DB 복사본을 `/tmp/modular-client-intake-phase1.db`로 만들어 서비스 함수를 직접 호출하는 방식으로 검증했다.

## 결과
- `child_test.client_intake_mode`와 `admin_client.created_source` 컬럼을 모델과 startup 보정 함수에 추가했다.
- 실제 `modular.db`에도 컬럼과 기본값 backfill을 적용했다.
- 커스텀 검사 생성/수정/조회 흐름에 `client_intake_mode`를 반영했다.
- 관리자 생성 모달과 검사 상세 화면에서 내담자 등록 방식을 선택/수정할 수 있게 했다.
- 평가 링크는 `pre_registered_only`와 `auto_create` 정책에 따라 다르게 동작하게 수정했다.
- `register-client` API는 유지하고, `auto_create` 정책일 때만 허용되게 했다.
- 자동 생성 내담자는 `created_source = assessment_link_auto`로 저장되게 했다.

## 검증 내용
- `python3 -m py_compile`로 관련 Python 파일 문법 검증 통과
- `node -e`로 `static/admin.js`, `static/assessment-custom.js` 파싱 통과
- 실제 `modular.db` 컬럼 확인:
  - `child_test.client_intake_mode`
  - `admin_client.created_source`
- 임시 DB 복사본으로 서비스 스모크 테스트 통과:
  - `auto_create` 모드에서 기존 배정 내담자 검증 통과
  - 신규 프로필 검증 시 `AUTO_CREATE_CONFIRM_REQUIRED` 반환
  - `register-client` 호출 후 신규 내담자 생성
  - 생성된 내담자 `created_source = assessment_link_auto`
  - 재검증 통과
- UI 캡처:
  - `artifacts/screenshots/admin-create-intake-before.png`
  - `artifacts/screenshots/admin-create-intake-after.png`
  - `artifacts/screenshots/admin-test-detail-intake-before.png`
  - `artifacts/screenshots/admin-test-detail-intake-after.png`

## 회고
- DB 정책 필드와 링크 정책 분기를 한 턴에 함께 넣어야 프런트/백엔드 계약이 어긋나지 않았다.
- assignment 구조가 현재 사실상 `client -> single custom_test`에 가깝기 때문에, 향후 다중 배정 지원이 필요하면 별도 구조 재검토가 필요하다.
