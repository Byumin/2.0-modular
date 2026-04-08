# Custom Test Management

## Purpose
관리자가 검사 카탈로그를 확인하고, 커스텀 검사를 생성하고, 목록/상세 조회, 수정, 삭제, 일괄 삭제까지 수행하는 기능을 다룬다.

## Main Endpoints
- `GET /api/admin/tests/catalog`
- `GET /api/admin/custom-tests`
- `GET /api/admin/custom-tests/management`
- `POST /api/admin/custom-tests`
- `GET /api/admin/custom-tests/{custom_test_id}`
- `PUT /api/admin/custom-tests/{custom_test_id}`
- `DELETE /api/admin/custom-tests/{custom_test_id}`
- `POST /api/admin/custom-tests/bulk-delete`

## Main Files
- `app/router/custom_test_router.py`
- `app/schemas/custom_tests.py`
- `app/services/admin/custom_tests.py`
- `app/services/admin/common.py`
- `app/repositories/custom_test_repository.py`
- `app/repositories/parent_test_repository.py`

## Behavior Summary
- 원본(parent) 검사 데이터를 카탈로그로 보여준다.
- 관리자가 선택한 검사, 척도, 인적사항 필드, 실시 구간 정보를 조합해 커스텀 검사를 만든다.
- 생성된 커스텀 검사는 관리자별로 목록화된다.
- 관리 화면에서는 검색, 상태 필터, 생성일 필터를 적용할 수 있다.
- 수정과 삭제, 일괄 삭제도 관리자 권한 범위 안에서 수행된다.

## Catalog Role
- 카탈로그는 parent 검사 원본을 읽어 화면에서 선택 가능한 검사 단위를 제공한다.
- 나이/학령 범위, 문항 수, 척도 구조, 응답 옵션을 같이 계산해서 내려준다.

## Create Rule
- 관리자가 선택한 `test_id`와 척도 코드 조합을 기준으로 실시 가능한 sub-test variant를 정규화한다.
- 연령/학령 구간이 여러 개인 경우 variant를 나눠 저장한다.
- 추가 인적사항 필드도 함께 정규화해 저장한다.

## Management Flow Summary
1. 관리자가 검사 생성 화면에서 검사와 척도를 고른다.
2. 서버는 parent 검사 원본에서 가능한 sub-test variant를 계산한다.
3. 선택한 척도와 variant 구성을 기준으로 커스텀 검사 설정을 저장한다.
4. 관리자가 목록 화면에서 생성된 커스텀 검사들을 조회한다.
5. 필요 시 상태/검색 조건으로 필터링한다.
6. 상세 조회 후 수정하거나 삭제한다.

## Main Data Considerations
- 커스텀 검사는 단일 parent 검사만이 아니라 variant 구성을 포함한 test config 단위로 저장될 수 있다.
- 나이/학령 범위는 `sub_test_json`을 해석해서 라벨화한다.
- 관리 화면용 목록 데이터는 공통 직렬화 로직을 통해 만들어진다.

## Notes
- 검사 생성 로직은 단순 CRUD보다 구성 정규화가 중요하다.
- 문항 구간, 척도 코드, 추가 인적사항 필드를 함께 보지 않으면 동작을 잘못 이해하기 쉽다.

## Related Documents
- [docs/features/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/README.md)
- [docs/features/assessment-link-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/assessment-link-flow.md)
- [docs/features/dashboard.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/dashboard.md)
- [docs/database/schema-overview.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/schema-overview.md)
- [docs/diagrams/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/diagrams/README.md)
