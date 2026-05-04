# child_test.sub_test_json 구조 개편

## 목적

현재 `child_test.sub_test_json`은 커스텀 검사에 포함된 모든 검사의 실시구간을 하나의 객체로 병합한 값을 저장한다. 병합 로직이 리스트를 단순 append 처리하기 때문에 `start_inclusive: [4,0,0,18,1,3]` 같은 의미 없는 배열이 만들어진다. 또한 어느 구간이 어느 검사(test_id) 소속인지 구분할 수 없다.

이를 **검사별(test_id)로 구분된 실시구간 목록** 구조로 교체한다.

---

## 현재 vs 목표 형태

**현재 (broken)**
```json
{
  "age_range": {
    "start_inclusive": [4, 0, 0, 18, 1, 3],
    "end_exclusive": [15, 0, 0, 100, 3, 7]
  },
  "gender": ["male", "female"]
}
```

**목표**
```json
{
  "GOLDEN": [
    {"school_age_range": {"as_of_time": "00:00:00", "start_inclusive": [4, 0, 0], "end_exclusive": [15, 0, 0]}, "gender": ["male", "female"]},
    {"age_range": {"as_of_time": "00:00:00", "start_inclusive": [18, 0, 0], "end_exclusive": [100, 0, 0]}, "gender": ["male", "female"]}
  ],
  "STS": [
    {"age_range": {"as_of_time": "00:00:00", "start_inclusive": [1, 0, 0], "end_exclusive": [3, 0, 0]}, "gender": ["male", "female"]},
    {"age_range": {"as_of_time": "00:00:00", "start_inclusive": [3, 0, 0], "end_exclusive": [7, 0, 0]}, "gender": ["male", "female"]},
    {"age_range": {"as_of_time": "00:00:00", "start_inclusive": [18, 0, 0], "end_exclusive": [100, 0, 0]}, "gender": ["male", "female"]}
  ]
}
```

각 test_id의 구간은 **선택한 척도가 하나라도 포함되고, item/scale/norm condition이 실제로 겹치는 교집합 구간만** 저장한다.

중요한 보정:
- `sub_test_json`은 itemcondition 원본 구간을 그대로 저장하지 않는다.
- item/scale/norm 조건의 `age_range` 또는 `school_age_range` 교집합을 실제 JSON으로 산출한다.
- 예: item `1-3, 4-5`, scale `1-2, 3-4, 5`, norm `1-4, 5-6`이면 세 테이블에 모두 존재하는 구간만 남아 `1-2, 3, 4, 5`처럼 쪼개진다. `6`은 item/scale에 없으므로 제외된다.
- `age_range`와 `school_age_range`는 같은 연령 축의 다른 표현이므로 서로 합쳐 하나의 조건으로 만들지 않는다.

---

## 원본 DB 각 검사별 실제 구간 현황

원본 DB(`modular.db`)에서 직접 확인한 검사별 condition 목록:

| test_id | 구간 수 | 구간 조건 |
|---------|---------|-----------|
| GOLDEN | 2 | school_age_range [4,0,0]~[15,0,0] (아동), age_range [18,0,0]~[100,0,0] (성인) |
| STS | 3 | age_range [1,0,0]~[3,0,0] (영아), [3,0,0]~[7,0,0] (유아), [18,0,0]~[100,0,0] (성인) |
| K-PSI-4-SF | 1 | age_range [0,0,0]~[100,0,0] |
| PAT-2 | 2 | age_range [0,0,0]~[7,0,0] (유아, informant 포함), [7,0,0]~[100,0,0] (아동/성인, informant 포함) |
| PCT | 1 | age_range [0,0,0]~[20,1,0] |
| PET | 1 | age_range [0,0,0]~[20,0,0] |

**보정:** 현재 운영 DB 기준 GOLDEN, STS도 `normcondition` 구간은 존재한다. 검사 생성 모달은 norm 조건이 없는 검사를 애초에 노출하지 않는 정책이므로, 새 구조 산출은 `fetch_parent_scale_rows_by_test`가 제공하는 item/scale/norm 교집합 record를 기준으로 한다.

## 프로토타입 검증 결과

기존 child_test 6건에 대해 새 구조로 산출한 결과:

| id | 검사명 | test_ids | 산출 결과 |
|----|--------|----------|-----------|
| 1 | 봄학기용 검사 | GOLDEN, STS | GOLDEN 2구간, STS 3구간 정상 |
| 3 | 내담자 사전 등록 확인 | GOLDEN, STS | 동일 |
| 4 | 수렴 타당도 검사 | STS | STS 3구간 정상 |
| 5 | PET 부모 효능감 검사 | PET | PET 1구간 정상 |
| 6 | 맹세호 박사 표준화 테스트 생성 | K-PSI-4-SF, PAT-2, PCT | 각 검사별 구간 정상 분리 |

---

## 변경 범위

### 1. 쓰기 경로 — `app/services/admin/custom_tests.py`

**`_build_merged_sub_test_json` 교체**

현재:
```python
def _build_merged_sub_test_json(variants: list[dict]) -> str:
    merged: dict = {}
    for variant in variants:
        ...
        _merge_sub_test_dict(merged, parsed)
    return json.dumps(merged, ensure_ascii=False)
```

변경 후 (`_build_structured_sub_test_json`으로 교체):
```python
def _build_structured_sub_test_json(resolved_test_configs: list[dict]) -> str:
    result: dict[str, list] = {}
    for config in resolved_test_configs:
        test_id = str(config.get("test_id", "")).strip()
        if not test_id:
            continue
        seen = []
        for variant in config.get("sub_test_variants", []):
            raw = variant.get("sub_test_json", "")
            try:
                parsed = json.loads(raw) if isinstance(raw, str) else raw
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, dict) and parsed not in seen:
                seen.append(parsed)
        if seen:
            result[test_id] = seen
    return json.dumps(result, ensure_ascii=False)
```

호출부 (`create_admin_custom_test_batch`) 변경:
```python
# 변경 전
sub_test_json=_build_merged_sub_test_json(flattened_variants),

# 변경 후
sub_test_json=_build_structured_sub_test_json(resolved_test_configs),
```

`_merge_sub_test_dict`는 더 이상 사용되지 않으므로 삭제.

---

### 2. 읽기 경로 영향 분석

| 파일 | 위치 | 용도 | 조치 |
|------|------|------|------|
| `common.py:392` | `parse_custom_test_configs` fallback | `selected_scales_json` 파싱 실패 시 단일 구간 fallback | 새 구조 인식하도록 수정 |
| `custom_tests.py:213` | 카탈로그 상세 API 응답 | `sub_test_json` 그대로 반환 | 그대로 반환 (구조 변경만) |
| `custom_tests.py:216` | `format_age_label` | 나이 레이블 표시 | 새 구조에서 첫 번째 구간의 첫 번째 조건으로 읽도록 수정 |
| `custom_tests.py:655` | fallback sub_test_variants | `selected_scales_json` 없을 때 | 새 구조 파싱하도록 수정 |
| `custom_tests.py:663` | 커스텀 검사 상세 응답 | `sub_test_json` 그대로 반환 | 그대로 반환 |
| `assessment_links.py:771` | `primary_sub_test_json` fallback | 실시 페이로드 구성 | 새 구조에서 첫 번째 구간 추출하도록 수정 |

#### `parse_custom_test_configs` fallback 수정 (`common.py`)

현재 fallback은 `sub_test_json`을 단일 구간 JSON으로 취급한다. 새 구조에서는 `{test_id: [stj, ...]}` 형태이므로 이를 순회하여 `test_configs` 형태로 변환해야 한다.

```python
# 새 구조 인식 fallback 예시
structured = _safe_json_loads(fallback_sub_test_json)
if isinstance(structured, dict) and all(isinstance(v, list) for v in structured.values()):
    # 새 구조: {test_id: [stj, ...]}
    for tid, stjs in structured.items():
        variants = [{"sub_test_json": json.dumps(s, ensure_ascii=False), ...} for s in stjs]
        ...
```

---

### 3. DB 마이그레이션

기존 child_test 행들의 `sub_test_json`을 새 구조로 업데이트한다. `selected_scales_json`에서 재산출 가능하므로 원본 데이터 손실 없음.

```python
# startup 보정 함수 또는 1회성 마이그레이션 스크립트
for row in db.query(AdminCustomTest).all():
    configs = load_custom_test_configs(row)  # selected_scales_json 기반
    new_stj = _build_structured_sub_test_json(configs)
    row.sub_test_json = new_stj
db.commit()
```

---

## 작업 순서

1. `_build_structured_sub_test_json` 함수 작성 및 `_merge_sub_test_dict`, `_build_merged_sub_test_json` 교체
2. `format_age_label` 새 구조 대응
3. `parse_custom_test_configs` fallback 경로 새 구조 대응
4. `assessment_links.py:771` fallback 새 구조 대응
5. DB 마이그레이션 (startup 보정 또는 스크립트)
6. 서버 재시작 후 child_test 전체 확인

## 검증

```bash
# 1. 서버 재시작 후 child_test 확인
.venv/bin/python -c "
import sqlite3, json
conn = sqlite3.connect('modular.db')
cur = conn.cursor()
cur.execute('SELECT id, custom_test_name, sub_test_json FROM child_test')
for row in cur.fetchall():
    parsed = json.loads(row[2])
    assert isinstance(parsed, dict)
    for tid, variants in parsed.items():
        assert isinstance(variants, list)
        for v in variants:
            assert isinstance(v, dict)
    print(f'id={row[0]} OK: {list(parsed.keys())}')
"

# 2. 실시 링크 진입 → validate-profile 정상 동작 확인
```

## 작업 중 변경 사항

### 2026-05-04 교집합 산출 기준 보정
- `app/repositories/parent_test_repository.py`
  - itemcondition 원본 구간을 그대로 record의 `sub_test_json`으로 쓰던 방식을 중단했다.
  - item/scale/norm condition의 실제 교집합 JSON을 산출하는 `_condition_intersection` 경로를 추가했다.
  - 같은 연령 구간에서 norm categorical 값만 나뉘는 경우 하나의 구간으로 합치도록 `_merge_condition_variants`를 추가했다.
  - `age_range`와 `school_age_range`가 서로 다른 조건에서 섞이면 잘못된 혼합 구간이므로 교집합 없음으로 처리했다.
- `app/db/schema_migrations.py`
  - 기존 `selected_scales_json` 안의 과거 구간을 복사하지 않고, 현재 parent record를 다시 조회해서 `child_test.sub_test_json`을 재산출하도록 변경했다.
  - 읽기 경로가 `selected_scales_json`을 우선 사용하므로, 기존 row의 `selected_scales_json`도 같은 교집합 구간 기준으로 함께 재산출하도록 보정했다.

## 검증 내용

- `fetch_parent_scale_rows_by_test("GOLDEN")` -> 2구간
- `fetch_parent_scale_rows_by_test("STS")` -> 3구간
- `fetch_parent_scale_rows_by_test("PAT-2")` -> 6구간
- 기존 `child_test` 6건 재산출 결과:
  - GOLDEN/STS 검사: GOLDEN 2, STS 3
  - PET 검사: PET 1
  - K-PSI-4-SF/PAT-2/PCT 검사: K-PSI-4-SF 1, PAT-2 6, PCT 1
- 추가 확인:
  - `child_test.id=7`, `id=8`의 `sub_test_json`과 `selected_scales_json` 모두 PAT-2 6구간으로 재산출됨.
  - `load_custom_test_configs(id=8)` 기준 PAT-2 variant count = 6.

## 2026-05-04 재점검 및 보정

### 이전 검증 누락

- 루트 운영 DB(`modular.db`)의 기존 `child_test` 행 전체를 끝까지 확인하지 않았다.
- 생성 저장값 중 `sub_test_json`만 보고, 실제 읽기 경로가 우선 사용하는 `selected_scales_json` 보정을 놓쳤다.
- 서비스 함수 단위 확인에 치우쳐 실제 관리자 생성 API `POST /api/admin/custom-tests` 경로로 검증하지 않았다.

### 보정된 동작

- `app/repositories/parent_test_repository.py`
  - itemcondition 원본 구간이 아니라 item/scale/normcondition의 실제 교집합을 `sub_test_json`으로 만든다.
  - PAT-2는 item `0-7, 7-100`, scale `0-100`, normcondition `0-3, 3-7, 7-10, 10-13, 13-16, 16-100` 교집합 결과로 6구간이 생성된다.
  - 같은 연령 구간에서 informant만 나뉜 normcondition은 하나의 구간으로 합치고 `informant` 배열에 병합한다.
- `app/db/schema_migrations.py`
  - 기존 `child_test.sub_test_json`뿐 아니라 `selected_scales_json`도 parent record 기준으로 함께 재산출한다.
  - 기존 저장값의 과거 구간을 복사하지 않고 현재 item/scale/norm 교집합 record를 다시 조회한다.
- `app/main.py`
  - startup에서 기존 DB 행을 새 구조로 보정한다.

### 루트 DB 확인 결과

2026-05-04 기준 루트 `modular.db`의 `child_test` 전체 확인 결과:

| id | 검사명 | sub_test_json | selected_scales_json |
|----|--------|---------------|----------------------|
| 1 | 봄학기용 검사 | GOLDEN 2, STS 3 | GOLDEN 2, STS 3 |
| 3 | 내담자 사전 등록 확인 | GOLDEN 2, STS 3 | GOLDEN 2, STS 3 |
| 4 | 수렴 타당도 검사 | STS 3 | STS 3 |
| 5 | PET 부모 효능감 검사 | PET 1 | PET 1 |
| 6 | 맹세호 박사 표준화 테스트 생성 | K-PSI-4-SF 1, PAT-2 6, PCT 1 | K-PSI-4-SF 1, PAT-2 6, PCT 1 |
| 7 | 맹맹맹test | K-PSI-4-SF 1, PAT-2 6, PCT 1 | K-PSI-4-SF 1, PAT-2 6, PCT 1 |

PAT-2 parent record 직접 확인:

| start_inclusive | end_exclusive | informant |
|-----------------|---------------|-----------|
| [0,0,0] | [3,0,0] | etc, father, mother |
| [3,0,0] | [7,0,0] | etc, father, mother |
| [7,0,0] | [10,0,0] | etc, father, mother |
| [10,0,0] | [13,0,0] | etc, father, mother |
| [13,0,0] | [16,0,0] | etc, father, mother |
| [16,0,0] | [100,0,0] | etc, father, mother |

### 실제 생성 API 검증

- `TestClient(app)`로 `/api/admin/login` 후 `POST /api/admin/custom-tests` 호출.
- PAT-2 전체 척도 선택으로 검사를 생성했다.
- 생성된 검증 row의 `sub_test_json`과 `selected_scales_json` 모두 PAT-2 6구간임을 확인했다.
- 검증용 row는 확인 후 삭제했다.

---

## Result

- `child_test.sub_test_json`이 `{test_id: [condition, ...]}` 구조로 전환됐다.
- 각 condition은 item/scale/norm 세 테이블 condition의 수학적 교집합으로 산출된다.
- PAT-2: normcondition 경계(0-3, 3-7, 7-10, 10-13, 13-16, 16-100)를 반영해 6구간 생성.
- GOLDEN: school_age_range와 age_range가 별도 구간으로 정확히 분리.
- `selected_scales_json`도 동일한 교집합 구간 기준으로 재산출됐다.
- startup 보정 함수(`migrate_child_test_sub_test_json_to_structured`)가 기존 row를 자동 갱신한다.

## Retrospective

### Classification
- `No Major Issue`

### What Was Wrong
- 기존 `_build_merged_sub_test_json`이 여러 구간의 배열 값을 단순 append해서 `[4,0,0,18,1,3]` 같은 의미 없는 값을 만들었다.
- itemcondition 하나를 anchor로 쓰는 방식은 세 테이블 경계가 달라질 때 올바른 atomic interval을 구하지 못했다.

### Why
- 초기 설계 시 item/scale/norm이 항상 같은 condition 경계를 공유한다고 가정했기 때문이다.
- PAT-2처럼 normcondition이 itemcondition보다 세밀하게 나뉜 경우를 고려하지 않았다.

### Next Time
- 여러 테이블의 condition을 결합할 때는 수학적 교집합을 먼저 계산한 뒤 구간을 확정한다.
- `age_range`와 `school_age_range`는 같은 축의 다른 표현이므로 혼합 교집합을 만들지 않는다.

## Related Documents
- [docs/database/schema-overview.md](../database/schema-overview.md)
- [docs/features/custom-test-management.md](../features/custom-test-management.md)
