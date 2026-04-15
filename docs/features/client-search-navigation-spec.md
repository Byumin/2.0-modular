# Client Search And Navigation Spec

## Document Role
- 역할: 상세 스펙 문서
- 독자: API와 React SPA 내담자 관리 화면 구현자
- Source of truth: 내담자 검색/탐색 개선의 API, 상태, UI 구현 기준
- 연결 문서: 제품 방향은 [client-search-navigation-plan.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-search-navigation-plan.md)를 따른다.

## Scope
이 문서는 내담자 관리 화면의 검색/탐색 개선을 다룬다.

1차 구현 범위:
- `GET /api/admin/clients` 검색/필터 파라미터 정리
- 검사별 현황 요약 API 추가
- React SPA 내담자 관리 화면의 검사별 탐색 구조 개선

## API Spec
### GET /api/admin/clients
목적: 내담자 중심 목록 검색.

Query parameters:
- `q`: 통합 검색어
- `group_id`: 내담자 그룹 ID
- `gender`: `male` 또는 `female`
- `status`: `배정대기`, `미실시`, `실시완료`

검색 대상:
- `name`
- `gender`
- `birth_day`
- `phone`
- `address`
- `memo`
- `tags`
- `groups.name`
- `assigned_custom_tests.custom_test_name`
- `assigned_custom_tests.parent_test_name`
- `last_assessed_on`
- `status`

Response:
```json
{
  "items": [
    {
      "id": 1,
      "name": "홍길동",
      "gender": "male",
      "birth_day": "2013-12-30",
      "phone": "",
      "address": "",
      "tags": [],
      "memo": "",
      "assigned_custom_tests": [
        {
          "id": 10,
          "custom_test_name": "내담자 사전 등록 확인",
          "parent_test_name": "GOLDEN, STS"
        }
      ],
      "assigned_custom_test_count": 1,
      "last_assessed_on": "2026-04-14",
      "status": "실시완료",
      "groups": []
    }
  ]
}
```

### GET /api/admin/client-test-overview
목적: 검사 운영 현황 중심 목록 검색.

Query parameters:
- `q`: 검사명 또는 기반 검사명 검색어
- `status`: 선택 시 해당 상태의 내담자가 있는 검사만 반환한다. `미실시`, `실시완료`, `배정대기`를 허용한다.

Response:
```json
{
  "items": [
    {
      "custom_test_id": 10,
      "custom_test_name": "내담자 사전 등록 확인",
      "parent_test_name": "GOLDEN, STS",
      "assigned_count": 4,
      "pending_count": 0,
      "not_started_count": 1,
      "completed_count": 3,
      "last_assessed_on": "2026-04-14"
    }
  ]
}
```

Status rules:
- `실시완료`: 마지막 실시일이 있는 내담자
- `미실시`: 배정 검사가 있고 마지막 실시일이 없는 내담자
- `배정대기`: 배정 검사가 없는 내담자. 검사별 현황에서는 별도 검사 ID가 없으므로 1차 구현에서는 요약 API의 검사 항목에 포함하지 않는다.

### Future API
후속 단계에서 아래 API를 추가한다.

- `GET /api/admin/clients/search-facets`: 필터 옵션과 count 제공
- `GET /api/admin/client-test-overview/{custom_test_id}/clients`: 검사별 내담자 목록의 서버 페이지네이션/정렬 제공

## Frontend State Spec
`ClientManagement` 주요 상태:
- `viewMode`: `client` 또는 `test`
- `search`: 통합 검색어
- `gender`: 내담자 성별 필터
- `status`: 실시 상태 필터
- `groupId`: 내담자별 보기에서만 사용하는 그룹 필터
- `testOverviewItems`: 검사별 현황 요약 목록
- `selectedTestGroupId`: 선택한 검사 ID
- `clients`: 현재 목록에 표시할 내담자 목록

## UI Spec
### Common Search Area
- 통합 검색 입력은 항상 상단에 둔다.
- 내담자별 보기에서는 그룹 필터를 노출한다.
- 검사별 보기에서는 그룹 필터를 숨기고, 검사 요약/선택 흐름에 집중한다.
- 상태 필터는 두 보기에서 모두 사용할 수 있다.

### Client View
표시 열:
- 번호
- 이름
- 그룹
- 배정 검사
- 마지막 실시일
- 상태
- 상세 이동

### Test View
표시 구조:
1. 검사별 현황 요약
2. 선택한 검사 설명
3. 선택한 검사에 속한 내담자 목록

검사 요약 표시:
- 검사명
- 기반 검사
- 배정 수
- 미실시 수
- 실시완료 수
- 마지막 실시일

선택 검사 내담자 목록 표시:
- 번호
- 이름
- 마지막 실시일
- 상태
- 상세 이동

## Data Rules
- 검사별 현황은 배정된 커스텀 검사 기준으로 계산한다.
- 한 내담자가 여러 커스텀 검사를 배정받으면 각 검사 현황에 각각 포함된다.
- `last_assessed_on`은 내담자 기준 최근 실시일이다. 1차 구현에서는 검사별 제출일이 아니라 기존 내담자 목록의 최근 실시일을 사용한다.
- 후속 단계에서는 커스텀 검사별 마지막 제출일을 별도 계산할 수 있다.

## Validation
필수 확인:
- `npm run build`
- `npm run lint`
- `GET /api/admin/clients?q=...` 응답 확인
- `GET /api/admin/client-test-overview` 응답 확인
- 내담자별 화면 스크린샷
- 검사별 화면 스크린샷

## Related Documents
- [docs/features/client-search-navigation-plan.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-search-navigation-plan.md)
- [docs/features/client-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-management.md)
- [docs/features/custom-test-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/custom-test-management.md)
- [docs/features/client-assignment-multi-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-assignment-multi-spec.md)
