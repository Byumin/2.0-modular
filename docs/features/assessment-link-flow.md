# Assessment Link Flow

## Purpose
커스텀 검사에 대한 접근 링크 발급, 수검자 진입, 인적사항 검증, 질문 로딩, 답변 제출 흐름을 다룬다.

## Main Endpoints
- `POST /api/admin/custom-tests/{custom_test_id}/access-link`
- `GET /api/assessment-links/{access_token}`
- `POST /api/assessment-links/{access_token}/validate-profile`
- `POST /api/assessment-links/{access_token}/submit`
- `GET /assessment/custom/{access_token}`

## Main Files
- `app/router/custom_test_router.py`
- `app/router/assessment_link_router.py`
- `app/router/page_router.py`
- `app/schemas/assessment_links.py`
- `app/services/admin/assessment_links.py`
- `app/services/admin/clients.py`
- `static/assessment-custom.html`
- `static/assessment-custom.js`

## Behavior Summary
- 관리자가 커스텀 검사에 대해 접근 링크를 생성한다.
- 수검자는 토큰이 포함된 URL로 검사 페이지에 진입한다.
- 서버는 커스텀 검사 설정을 읽어 필요한 인적사항 필드와 검사 메타를 제공한다.
- 사용자가 입력한 프로필이 해당 검사 구간과 맞는지 검증한다.
- 프로필에 맞는 sub-test variant를 선택해 질문 payload를 만든다.
- 제출 시 프로필, 응답, 선택된 검사 구성을 함께 저장한다.

## Profile Matching Rule
- 성별
- 생년월일 기준 나이 범위
- 학령 정보

위 정보가 `sub_test_json`의 허용 조건과 맞아야 해당 variant를 선택할 수 있다.

## Submission Flow Summary
1. 수검자가 접근 링크로 페이지에 진입한다.
2. 프론트엔드가 토큰 기반 검사 메타를 요청한다.
3. 서버가 필요한 인적사항 필드 목록과 검사 설정을 반환한다.
4. 사용자가 프로필을 입력한다.
5. 서버가 프로필과 일치하는 검사 구간을 찾는다.
6. 일치하는 구간 기준으로 문항 bundle을 조립한다.
7. 사용자가 응답을 제출한다.
8. 서버는 답변 JSON과 프로필 정보를 저장하고 이후 채점 대상이 되는 submission을 만든다.

## Assignment Check
- 검사에 특정 내담자가 배정된 경우, 제출 전 `find_assigned_client_for_profile`로 이름/성별/생년월일 일치 여부를 검증한다.
- 배정 정보와 맞지 않으면 제출이 막힌다.

## Notes
- 이 기능은 단순 링크 조회가 아니라 프로필 기반 variant 선택이 핵심이다.
- 수검자 화면의 질문 구성은 고정이 아니라 입력 프로필에 따라 달라질 수 있다.

## Related Documents
- [docs/features/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/README.md)
- [docs/features/client-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-management.md)
- [docs/features/custom-test-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/custom-test-management.md)
- [docs/features/scoring-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/scoring-flow.md)
- [docs/diagrams/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/diagrams/README.md)
- [docs/design/design-system.md](/mnt/c/Users/user/workspace/2.0-modular/docs/design/design-system.md)
