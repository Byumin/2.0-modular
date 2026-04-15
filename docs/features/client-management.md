# Client Management

## Purpose
관리자가 내담자(클라이언트)를 생성, 조회, 수정, 삭제하고, 커스텀 검사 배정 및 평가 로그/리포트 컨텍스트를 관리하는 기능을 다룬다.

## Main Endpoints
- `GET /api/admin/clients`
- `POST /api/admin/clients`
- `GET /api/admin/clients/{client_id}`
- `PUT /api/admin/clients/{client_id}`
- `POST /api/admin/clients/{client_id}/assignments`
- `DELETE /api/admin/clients/{client_id}/assignments/{custom_test_id}`
- `DELETE /api/admin/clients/{client_id}`
- `POST /api/admin/assessment-logs`
- `GET /api/admin/clients/{client_id}/report-llm-context`
- `POST /api/admin/clients/{client_id}/report-llm-chat`

## Main Files
- `app/router/client_router.py`
- `app/schemas/clients.py`
- `app/services/admin/clients.py`
- `app/repositories/client_repository.py`
- `app/repositories/assessment_repository.py`
- `app/repositories/custom_test_repository.py`

## Behavior Summary
- 관리자별 내담자 목록을 관리한다.
- 내담자마다 배정된 커스텀 검사 정보를 연결할 수 있다.
- 마지막 실시일, 제출 수, 최근 채점 결과 같은 운영 정보도 함께 관리한다.
- 리포트 컨텍스트 조회와 외부 LLM 채팅 프록시 기능도 포함한다.

## Main Capability Areas
### Client CRUD
- 내담자 기본 정보 생성
- 상세 조회
- 수정
- 삭제

### Assignment
- 특정 내담자에게 커스텀 검사를 추가 배정
- 특정 검사 배정만 해제
- 한 내담자에게 여러 커스텀 검사를 동시에 배정
- 검사 제출 시 프로필과 배정된 내담자 매칭 검증에 활용

### Assessment History
- 평가 로그 생성
- 최근 실시일 및 제출 현황 조회
- 클라이언트별 scoring 결과 집계

### Report / LLM Context
- 채점 결과에서 GOLDEN, STS 리포트 컨텍스트를 추출
- 외부 LLM 서버로 대화 요청을 프록시

## Flow Summary
1. 관리자가 내담자 목록 화면에서 클라이언트를 생성한다.
2. 필요 시 특정 커스텀 검사를 배정한다.
3. 수검자가 검사 제출을 하면 배정 정보와 프로필 일치 여부가 검증된다.
4. 관리자는 상세 화면에서 제출/채점 이력을 확인한다.
5. 리포트 화면에서 LLM 컨텍스트 또는 대화 기능을 사용할 수 있다.

## Data Considerations
- 내담자 삭제 시 관련 배정과 로그 정리도 함께 고려된다.
- 리포트 컨텍스트는 최근 scoring 결과 JSON을 해석해서 만든다.
- 외부 LLM 호출 URL은 `LLM_CHAT_URL` 환경변수에 의존한다.

## Notes
- 클라이언트 기능은 단순 주소록이 아니라 검사 운영과 연결된 중심 도메인이다.
- 배정 정보, 제출 이력, 채점 결과, 리포트 컨텍스트가 함께 엮여 있다.
- 내담자 생성/배정 운영 정책 자체는 [docs/features/client-intake-policy.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-policy.md)를 source of truth로 본다.
- `created_source`와 자동 생성 재사용 규칙 같은 Phase 1 상세 변경안은 [docs/features/client-intake-phase1-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-phase1-spec.md)를 본다.
- 다중 동시 배정 구조 변경안은 [docs/features/client-assignment-multi-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-assignment-multi-spec.md)를 본다.
- 내담자 목록 검색/탐색 개선의 제품 방향은 [docs/features/client-search-navigation-plan.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-search-navigation-plan.md)를 본다.
- 내담자 목록 검색/탐색 개선의 API/UI 상세 스펙은 [docs/features/client-search-navigation-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-search-navigation-spec.md)를 본다.

## Related Documents
- [docs/features/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/README.md)
- [docs/features/assessment-link-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/assessment-link-flow.md)
- [docs/features/client-intake-policy.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-policy.md)
- [docs/features/client-intake-phase1-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-phase1-spec.md)
- [docs/features/client-assignment-multi-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-assignment-multi-spec.md)
- [docs/features/client-search-navigation-plan.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-search-navigation-plan.md)
- [docs/features/client-search-navigation-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-search-navigation-spec.md)
- [docs/features/dashboard.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/dashboard.md)
- [docs/features/scoring-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/scoring-flow.md)
- [docs/database/schema-overview.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/schema-overview.md)
