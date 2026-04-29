# Catalog Condition Overlap

## 요청 요약
검사 카탈로그 표시 조건을 `condition.id` 직접 매칭이 아니라 `item`, `scale`, `norm`의 condition 값 overlap 기준으로 변경한다.

## 작업 목표
- 검사 카탈로그 생성 시 `itemcondition`, `scalecondition`, `normcondition`의 condition JSON이 서로 겹치는 구간이 있는 검사만 노출한다.
- `condition.id`가 서로 달라도 condition 속성 값이 겹치면 카탈로그 sub_test를 만들 수 있게 한다.
- 루트 `modular.db` 기준을 유지한다.

## 초기 가설
- 현재 PAT-2는 `scale.condition.id = PAT-2_ALL`, `item.condition.id = PAT-2_INFAND/PAT-2_CHILD_ADULT`라서 기존 id 매칭 방식에서 제외된다.
- PAT-2는 condition 값 기준으로는 item, scale, norm이 겹치므로 카탈로그에 노출되어야 한다.

## 실행 계획
1. `parent_test_repository.py`의 카탈로그 record 생성 흐름을 확인한다.
2. condition JSON overlap 유틸을 추가한다.
3. itemcondition 기준으로 sub_test variant를 만들고, overlap되는 scale과 norm이 모두 있을 때만 record를 생성한다.
4. PAT-2가 catalog rows에 포함되는지 확인한다.
5. 현재 카탈로그 노출 검사 변화도 확인한다.

## 작업 중 변경 사항
- `parent_test_repository.py`에 condition JSON overlap 판정 유틸을 추가했다.
- 카탈로그 record 생성 기준을 기존 `scale.condition.id == item.condition.id`에서 `itemcondition`, `scalecondition`, 실제 `norm` row의 `normcondition` condition 값이 함께 겹치는지 확인하는 방식으로 바꿨다.
- 생성/실시에서 같은 variant를 조회할 수 있도록 `fetch_parent_scale_rows_by_test`, `fetch_parent_scale_struct`, `fetch_parent_item_bundle` 경로가 같은 overlap 기반 record를 보도록 맞췄다.

## 결과
- PAT-2는 카탈로그 record 2개로 노출된다.
- 현재 루트 `modular.db` 기준 카탈로그 노출 검사는 `K-PSI-4-SF`, `PAT-2`, `PCT`, `PET`다.
- `GOLDEN`, `STS`는 실제 `norm` row가 없어 이번 정책 기준에서는 카탈로그 record가 생성되지 않는다.

## 검증 내용
- `.venv/bin/python -m py_compile app/repositories/parent_test_repository.py`
- `fetch_parent_catalog_rows()` JSON 파싱 검증
- `fetch_parent_scale_rows_by_test("PAT-2")` 결과 2건 확인
- PAT-2 각 variant에서 `fetch_parent_scale_struct`, `fetch_parent_item_bundle` 조회 가능 확인

## 회고
- Plan Problem: 없음.
- Execution Judgment Problem: 현재 condition overlap은 `age_range`, `school_age_range`, 기타 categorical key의 교집합만 다룬다. 새 condition 축이 범위형으로 추가되면 overlap 유틸 확장이 필요하다.
