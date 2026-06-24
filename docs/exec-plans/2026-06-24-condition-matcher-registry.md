# Execution Plan

## Task Title
- Condition matcher registry and school age index matching

## Request Summary
- 실시구간 검증에서 `age_range`, `school_age_range`, `test_type` 등 검사별 조건축을 유지보수 가능하게 확장하도록 구현한다.

## Goal
- `_profile_matches_sub_test`의 조건별 분기를 matcher registry 구조로 정리한다.
- `school_age_range`를 `SCHOOL_AGE_LABELS` 인덱스 범위로 정확히 검증한다.
- 신규 condition type은 matcher 추가만으로 확장 가능하게 한다.
- 관련 seed와 문서의 condition type 설명을 정리한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: 관련 런타임 소스 직접 확인
  - DB: `docs/database/runtime-db.md`, `docs/database/schema-overview.md`
  - UI/디자인: 해당 없음
  - 문서 체계: 기존 DB 문서에 흡수
  - 설명/디버깅: 이전 흐름 추적 기준 확인
  - 코드 정리 산출물: 해당 없음
- [x] 운영/실행 서버 DB가 필요한 작업이면 `docs/database/runtime-db.md`의 DB 조회 전 확인 규칙 적용
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- 현재 `condition_profile_map`은 `age_range`, `enum`만 직접 처리하고, `school_age_range` dict는 fallback에서 값 존재 여부만 확인한다.
- matcher registry로 분리하면 기존 fallback 호환을 유지하면서 신규 type을 추가하기 쉽다.

## Initial Plan
1. `assessment_links.py`에 matcher registry와 `school_age_index_range` matcher를 추가한다.
2. 기존 fallback 검증도 같은 matcher를 사용하게 정리한다.
3. `schema_migrations.py` seed와 `schema-overview.md` 문서를 새 type 명세에 맞춘다.
4. 단위 수준 스크립트/컴파일로 검증한다.

## Progress Updates
### Update 1
- Time: 2026-06-24
- Change: 계획 작성
- Reason: 코드 수정 전 실행계획 기록

### Update 2
- Time: 2026-06-24
- Change: `assessment_links.py`에 condition matcher registry를 추가하고 `school_age_range`/`school_age_index_range` matcher를 구현했다.
- Reason: 신규 조건축은 matcher 추가만으로 확장하고, 학령 범위는 `SCHOOL_AGE_LABELS` 인덱스로 검증해야 한다.

### Update 3
- Time: 2026-06-24
- Change: `SCHOOL_AGE_LABELS`를 `common.py`로 이동하고 `custom_tests.py`가 공통 상수를 사용하게 했다.
- Reason: 학령 표시와 검증이 같은 라벨 순서를 공유해야 한다.

### Update 4
- Time: 2026-06-24
- Change: GOLDEN condition profile map seed와 DB/기능 문서를 새 타입 설명에 맞췄다.
- Reason: fallback에 의존하지 않고 신규 구조를 명시하기 위해서다.

## Result
- `condition_profile_map.type` 기반 matcher registry를 도입했다.
- `age_range`, `enum`, `school_age_range`, `school_age_index_range` matcher를 지원한다.
- `school_age_range` dict fallback도 값 존재 확인이 아니라 학령 인덱스 범위 비교를 수행한다.
- `test_type` 같은 신규 enum 조건은 `{"type":"enum","profile_field":"test_type"}` 형태로 동작한다.

## Verification
- Checked:
  - `.venv/bin/python -m compileall app/services/admin/assessment_links.py app/services/admin/common.py app/services/admin/custom_tests.py app/db/schema_migrations.py`
  - `.venv/bin/python -m compileall app`
  - 직접 함수 검증: `_profile_matches_sub_test`로 `school_age_range` 라벨/인덱스 범위, 학령 list/string 조건, `test_type` enum, `age_range` 경계값 확인
- Not checked:
  - 운영 RDS 데이터 직접 조회/수정은 수행하지 않았다.
  - 전체 프론트엔드 빌드는 이번 변경 범위가 백엔드 검증 로직과 문서 중심이라 수행하지 않았다.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 기존 검증 로직은 `school_age_range` dict를 범위로 비교하지 않고 값 존재 여부만 확인했다.

### Why
- `age_range`와 같은 형태의 JSON을 쓰지만 의미가 다른 학령 인덱스 범위 타입이 별도 matcher로 분리되어 있지 않았다.

### Next Time
- 신규 조건축을 추가할 때는 `condition_profile_map.type`과 matcher registry entry를 함께 정의한다.

## Related Documents
- [Documentation Hub](../README.md)
- [docs/exec-plans/README.md](README.md)
- [AGENTS.md](../../AGENTS.md)
