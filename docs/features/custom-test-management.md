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
- `frontend/src/pages/TestManagement.tsx`
- `frontend/src/pages/TestDetail.tsx`

현재 `/admin/create`와 `/admin/create/{id}` browser route는 React SPA를 서빙한다.

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

## 실시구간 산출 알고리즘

커스텀 검사를 생성하거나 카탈로그를 조회할 때, 각 원본 검사(test_id)의 유효 실시구간은 다음 알고리즘으로 결정된다.

### 원칙

**item/scale/norm 세 테이블 condition의 교집합만 유효한 구간으로 인정한다.**

어느 한 테이블을 기준으로 다른 테이블의 overlap 여부만 확인하면, 테이블 간 경계가 다를 때 잘못된 구간이 생긴다. 따라서 세 테이블 모두에서 실제로 데이터가 있는 구간의 교집합을 계산한다.

### 동작 흐름

```
1. item/scale/norm 세 테이블에서 condition JSON을 모두 수집
2. 각 (item condition × scale condition × norm condition) 조합의 수학적 교집합 계산
   - age_range: max(start_inclusives) ~ min(end_exclusives)
   - categorical(informant, gender): 교집합(intersection)
   - 교집합이 빈 구간이면 제외
3. 같은 연령 범위 안에서 categorical 값만 다른 조건은 하나의 구간으로 병합
   (예: [0-3, mother] + [0-3, father] + [0-3, etc] → [0-3, informant=[mother,father,etc]])
4. 결과 구간 목록을 연령 오름차순으로 정렬
```

### PAT-2 실제 예시

| 테이블 | 조건 수 | 구간 내용 |
|--------|---------|-----------|
| itemcondition | 2 | 유아 0-7, 아동/성인 7-100 (각각 informant 통합) |
| scalecondition | 1 | 0-100 전체 (informant 통합) |
| normcondition | 18 | 6 연령 구간 × 3 보고자(mother/father/etc) |

교집합 산출 결과: **6구간** (normcondition의 연령 경계가 가장 세밀하므로 이 경계가 최종 구간을 결정)

```
[0,0,0]~[3,0,0]   informant=[etc,father,mother]
[3,0,0]~[7,0,0]   informant=[etc,father,mother]
[7,0,0]~[10,0,0]  informant=[etc,father,mother]
[10,0,0]~[13,0,0] informant=[etc,father,mother]
[13,0,0]~[16,0,0] informant=[etc,father,mother]
[16,0,0]~[100,0,0] informant=[etc,father,mother]
```

informant별 norm 조건 3개가 같은 연령 범위에서 병합되어 하나의 구간으로 합쳐진다.

### age_range와 school_age_range

GOLDEN처럼 아동 구간은 `school_age_range`, 성인 구간은 `age_range`를 쓰는 검사는 두 키가 섞이지 않는다. 같은 교집합 계산에서 서로 다른 range key를 쓰는 조건이 만나면 교집합 없음으로 처리한다.

```
GOLDEN 결과:
  {"school_age_range": {4,0,0 ~ 15,0,0}, "gender": ["female","male"]}  ← 아동
  {"age_range": {18,0,0 ~ 100,0,0}, "gender": ["female","male"]}       ← 성인
```

### 저장 위치

산출된 구간은 두 곳에 저장된다.

- `child_test.sub_test_json` — `{test_id: [condition, ...]}` 형태. 프로필 매칭 기준.
- `child_test.selected_scales_json` — 같은 구간 + 해당 구간의 선택 척도 코드.

런타임에서 수검자 프로필이 들어오면 `selected_scales_json`의 각 구간과 프로필을 비교해 매칭 구간을 찾고, 그 구간의 sub_test_json 키로 문항 번들을 조회한다.

### 관련 코드

- 구간 산출 핵심: `app/repositories/parent_test_repository.py` — `_build_records_for_test`, `_condition_intersection`, `_merge_condition_variants`
- 검사 생성 저장: `app/services/admin/custom_tests.py` — `create_admin_custom_test_batch`, `_build_structured_sub_test_json`
- 런타임 프로필 매칭: `app/services/admin/assessment_links.py` — `_resolve_active_variants`, `_profile_matches_sub_test`

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
- 향후 검사 생성 시 내담자 수집 정책 필드가 추가되면 상세 변경안은 [docs/exec-plans/2026-04-10-client-intake-phase1-detailed-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/2026-04-10-client-intake-phase1-detailed-spec.md)를 기준으로 본다.
- 현재 검사 생성/수정에는 `client_intake_mode` 필드가 포함되어 있으며, 상세 구현 상태는 [docs/exec-plans/2026-04-10-client-intake-phase1-detailed-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/2026-04-10-client-intake-phase1-detailed-spec.md)를 기준으로 본다.
- 검사 관리 화면의 `커스텀 검사`, `실시 현황`, `검사 결과` 탭 정보 구조는 [docs/exec-plans/2026-04-14-custom-test-management-tabs-plan.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/2026-04-14-custom-test-management-tabs-plan.md)를 본다.
- 검사 관리 탭 구조의 API/UI 상세 스펙은 [docs/features/custom-test-management-tabs-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/custom-test-management-tabs-spec.md)를 본다.

## Related Documents
- [docs/features/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/README.md)
- [docs/features/assessment-link-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/assessment-link-flow.md)
- [docs/exec-plans/2026-04-14-custom-test-management-tabs-plan.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/2026-04-14-custom-test-management-tabs-plan.md)
- [docs/features/custom-test-management-tabs-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/custom-test-management-tabs-spec.md)
- [docs/exec-plans/2026-04-10-client-intake-phase1-detailed-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/2026-04-10-client-intake-phase1-detailed-spec.md)
- [docs/features/dashboard.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/dashboard.md)
- [docs/database/schema-overview.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/schema-overview.md)
- [docs/diagrams/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/diagrams/README.md)
