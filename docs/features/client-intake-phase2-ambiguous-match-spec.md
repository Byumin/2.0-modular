# Client Intake Phase 2 Ambiguous Match Spec

## Role
이 문서는 `생년월일 없는 유사 매칭`처럼 동일인 여부를 자동 확정하기 어려운 케이스를 관리자 승인 흐름으로 처리하는 Phase 2 상세 설계 문서다.

이 문서는 `Client Intake Policy`와 `Client Intake Phase 1 Spec`의 후속 문서다.

## Problem
Phase 1의 exact match 기준은 아래와 같다.

- 이름
- 성별
- 생년월일

이 기준은 안전하지만, 다음 같은 케이스를 자동으로 처리하지 못한다.

- 기존 내담자와 이름/성별은 같지만 생년월일이 없음
- 현재 검사 자체가 생년월일을 요구하지 않음
- 자동 생성 모드에서 기존 내담자를 재사용할지 신규 생성할지 확정이 어려움

이 경우를 무조건 신규 생성하면 중복 데이터가 쌓일 수 있고, 무조건 기존 내담자로 연결하면 오매칭 위험이 있다.

## Goal
애매 매칭은 자동 확정하지 않고, 관리자 승인 전까지 검사 진행을 보류한다.

관리자는 아래 둘 중 하나를 선택한다.

1. 기존 내담자로 연결
2. 새 내담자로 생성

승인 이후에만 검사 진행을 허용한다.

## In Scope
1. 애매 매칭 판정 기준
2. 승인 대기 엔티티 설계
3. 수검자 안내 상태
4. 관리자 승인 처리 흐름
5. 승인 후 링크 재개 흐름

## Out Of Scope
- fuzzy string match
- 이메일/전화번호 기반 고급 중복 탐지
- 다수 후보 자동 랭킹
- 병합 UI 전체 설계

## Ambiguous Match Definition
Phase 2의 최소 기준은 아래와 같다.

애매 매칭으로 보는 경우:

- 같은 관리자 아래
- 이름 동일
- 성별 동일
- 기존 내담자 또는 신규 입력 중 한쪽 이상에서 생년월일이 비어 있음

자동 exact match로 보는 경우:

- 이름 동일
- 성별 동일
- 생년월일 동일

자동 신규 생성으로 보는 경우:

- 이름 불일치
- 성별 불일치
- exact match 후보 없음
- 유사 매칭 후보도 없음

## Proposed User Flow

### 수검자 측
1. 링크 접근
2. 인적사항 입력
3. 서버가 exact match 확인
4. exact match가 아니고 애매 매칭 후보가 있으면 진행 중단
5. 화면에 `유사한 기존 내담자가 있어 관리자 확인이 필요합니다` 안내 표시
6. 관리자 승인 전까지 검사 시작 불가

### 관리자 측
1. 승인 대기 목록 확인
2. 입력 프로필과 기존 후보 내담자 비교
3. 아래 중 하나 선택
   - 기존 내담자로 연결
   - 새 내담자로 생성
   - 거절
4. 승인 결과 저장
5. 수검자가 다시 링크에 접근하거나 재시도하면 결과에 따라 진행

## Proposed Status Model

승인 대기 엔티티 상태 예시:

- `pending`
- `approved_link_existing`
- `approved_create_new`
- `rejected`
- `expired`

의미:

- `pending`: 관리자 확인 전
- `approved_link_existing`: 기존 내담자로 연결 승인됨
- `approved_create_new`: 신규 내담자 생성 승인됨
- `rejected`: 진행 거절
- `expired`: 일정 시간 내 미처리

## Proposed Data Model
아래는 설계안이며 실제 DB 변경은 사용자 승인 후 진행한다.

테이블 예시:

- `admin_client_identity_review`

권장 필드:

- `id`
- `admin_user_id`
- `admin_custom_test_id`
- `access_token`
- `input_profile_json`
- `matched_client_id`
- `review_status`
- `review_note`
- `reviewed_by_admin_user_id`
- `reviewed_at`
- `created_at`

설명:

- `input_profile_json`: 수검자가 입력한 원본 인적사항
- `matched_client_id`: 유사 후보 기존 내담자
- `review_status`: 현재 상태
- `review_note`: 관리자 판단 메모

## Approval Actions

### A. 기존 내담자로 연결
동작:

1. `matched_client_id`를 현재 검사에 배정
2. review 상태를 `approved_link_existing`로 변경
3. 이후 동일 access token 재시도 시 해당 내담자로 진행 허용

### B. 새 내담자로 생성
동작:

1. 입력 프로필로 신규 내담자 생성
2. `created_source`는 별도 값 또는 기존 `assessment_link_auto` 재사용 검토
3. 현재 검사에 배정
4. review 상태를 `approved_create_new`로 변경

### C. 거절
동작:

1. review 상태를 `rejected`로 변경
2. 수검자는 검사 진행 불가
3. 필요 시 관리자에게 재요청 안내만 표시

## API Proposal
실제 엔드포인트 이름은 구현 단계에서 확정하되, 필요한 역할은 아래와 같다.

### 수검자 측
- `POST /api/assessment-links/{access_token}/validate-profile`
  - exact match면 통과
  - ambiguous match면 `pending approval` 코드 반환

- `GET /api/assessment-links/{access_token}/review-status`
  - 현재 승인 상태 조회

### 관리자 측
- `GET /api/admin/client-identity-reviews`
  - 대기 목록 조회

- `POST /api/admin/client-identity-reviews/{review_id}/approve-existing`
  - 기존 내담자 연결 승인

- `POST /api/admin/client-identity-reviews/{review_id}/approve-new`
  - 신규 내담자 생성 승인

- `POST /api/admin/client-identity-reviews/{review_id}/reject`
  - 거절

## UX Proposal

### 수검자 화면
- 모달 또는 안내 카드로 대기 상태 표시
- 문구 예:
  - `유사한 기존 내담자가 있어 관리자 확인이 필요합니다. 승인 후 검사를 진행할 수 있습니다.`
- 진행 버튼 비활성화
- 상태 새로고침 버튼 또는 자동 polling 선택 가능

### 관리자 화면
- 기존 클라이언트 관리와 분리된 `승인 대기` 섹션 또는 탭
- 비교 정보:
  - 입력 이름
  - 입력 성별
  - 입력 생년월일
  - 후보 기존 내담자 정보
  - 현재 검사명
  - 요청 시각

## Open Questions
1. 승인 대기 상태에서 access token별 1건만 유지할지, 재시도마다 새 row를 쌓을지
2. `approve-new` 시 `created_source`를 새 값으로 분리할지
3. 승인 대기 만료 시간을 둘지
4. 수검자 화면에서 polling을 할지, 수동 새로고침으로 갈지

## Recommended Direction
현재 프로젝트 기준 권장안은 아래와 같다.

1. access token + profile hash 기준으로 pending review 1건 유지
2. `approve-new`도 `assessment_link_auto`를 우선 재사용
3. 만료는 초기에 넣지 않고 운영하면서 추가
4. 수검자 화면은 수동 새로고침부터 시작

## Approval Gate
아래 작업은 사용자 승인 후 진행한다.

- 신규 review 테이블 또는 동등한 저장 구조 추가
- 관리자 승인 API 추가
- 수검자 review status API 추가
- 승인 대기 관리자 UI 추가

## Related Documents
- [docs/features/client-intake-policy.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-policy.md)
- [docs/features/client-intake-phase1-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-phase1-spec.md)
- [docs/features/client-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-management.md)
- [docs/features/assessment-link-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/assessment-link-flow.md)
