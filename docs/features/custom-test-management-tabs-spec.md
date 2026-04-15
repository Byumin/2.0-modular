# Custom Test Management Tabs Spec

## Document Role
- 역할: 상세 스펙 문서
- 독자: 검사 관리 API와 React SPA 화면 구현자
- Source of truth: 검사 관리 탭 구조의 API, 상태, UI 구현 기준
- 연결 문서: 제품 방향은 [custom-test-management-tabs-plan.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/custom-test-management-tabs-plan.md)를 따른다.

## Scope
1차 구현 범위:
- 검사 관리 화면에 `커스텀 검사`, `실시 현황`, `검사 결과` 탭을 추가한다.
- 기존 커스텀 검사 목록은 첫 번째 탭에서 유지한다.
- 실시 현황 탭은 검사별 운영 요약을 표시한다.
- 검사 결과 탭은 제출/채점 결과 목록을 표시한다.

## API Spec
### GET /api/admin/custom-tests/management
목적: 커스텀 검사 목록 관리.

기존 API를 사용한다.

Query parameters:
- `q`
- `status`
- `created_from`
- `created_to`

### GET /api/admin/client-test-overview
목적: 검사별 실시 현황 요약.

기존 내담자 검색/탐색 개선에서 추가한 API를 사용한다.

Query parameters:
- `q`
- `status`

### GET /api/admin/custom-tests/results
목적: 검사 결과 중심 목록.

Query parameters:
- `q`: 내담자명, 응답자명, 커스텀 검사명, 기반 검사명 검색
- `limit`: 기본 100, 최대 300

Response:
```json
{
  "items": [
    {
      "submission_id": 1,
      "scoring_result_id": 1,
      "custom_test_id": 3,
      "custom_test_name": "내담자 사전 등록 확인",
      "parent_test_name": "GOLDEN, STS",
      "client_id": 10,
      "client_name": "김민정",
      "responder_name": "김민정",
      "submitted_at": "2026-04-13T10:00:00",
      "scored_at": "2026-04-13T10:00:01",
      "scoring_status": "scored"
    }
  ]
}
```

## Frontend State Spec
`TestManagement` 주요 상태:
- `activeTab`: `custom-tests`, `status`, `results`
- `search`: 탭별 검색어
- `tests`: 커스텀 검사 목록
- `testOverviewItems`: 검사별 실시 현황 목록
- `resultItems`: 검사 결과 목록
- `loading`, `overviewLoading`, `resultsLoading`

## UI Spec
### Common Header
- 제목은 `검사 관리`를 유지한다.
- `검사 생성` 버튼은 `커스텀 검사` 탭에서만 주요 액션으로 노출한다.
- 탭은 제목 아래에 배치한다.

### Custom Tests Tab
표시 열:
- 검사명
- 기반 검사
- 척도 수
- 배정 / 실시
- 진행 상태
- URL, 상세, 삭제 액션

### Status Tab
표시 열:
- 검사명
- 기반 검사
- 배정
- 미실시
- 실시완료
- 마지막 실시일

### Results Tab
표시 열:
- 제출일
- 내담자
- 커스텀 검사
- 기반 검사
- 채점 상태
- 결과 확인 액션

## Data Rules
- 실시 현황의 완료/미실시 기준은 `client-test-overview` API를 따른다.
- 검사 결과 탭은 제출이 있는 항목을 기준으로 표시한다.
- 채점 결과가 없는 제출은 `scoring_result_id`가 `null`일 수 있다.
- 내담자 ID가 없는 제출은 결과 확인 액션을 비활성화하거나 내담자명을 `미연결`로 표시한다.

## Validation
필수 확인:
- 수정 전 검사 관리 화면 스크린샷
- 수정 후 세 탭 화면 스크린샷
- `GET /api/admin/custom-tests/results` 응답 확인
- `npm run build`
- `npm run lint`

## Related Documents
- [docs/features/custom-test-management-tabs-plan.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/custom-test-management-tabs-plan.md)
- [docs/features/custom-test-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/custom-test-management.md)
- [docs/features/client-search-navigation-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-search-navigation-spec.md)
- [docs/features/scoring-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/scoring-flow.md)
