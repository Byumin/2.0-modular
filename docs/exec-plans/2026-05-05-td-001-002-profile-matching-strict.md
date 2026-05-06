# Execution Plan

## Task Title
- TD-001 / TD-002: `_profile_matches_sub_test` 엄격 모드 적용

## Request Summary
- 조건에 필드가 명시됐는데 profile에 해당 값이 없으면 해당 variant 거부
- 각 검사별 실시구간 조건에서 요구하는 모든 인적사항 필드를 반드시 입력해야 검사 실시 가능하도록 백엔드에서 강제
- TD-003 (멀티 매칭)은 DB 설계 책임으로 분류 → wontfix

## Goal
- gender / informant / birth_day 중 조건에 있는 필드가 profile에 없으면 즉시 거부
- 정상 경로(required_profile_fields로 프론트 입력 강제 → 모든 필드 채워진 profile)에서는 동작 변화 없음
- API 직접 호출·프론트 검증 우회 시에도 잘못된 norm이 조용히 선택되지 않음

## Preflight Checklist
- [x] AGENTS.md 확인
- [x] exec-plan 먼저 작성
- [x] 관련 코드 탐색 완료
- [x] UI 수정 없음 → 스크린샷 불필요
- [x] 검증 방법 정의

## 변경 대상

**파일**: `app/services/admin/assessment_links.py`
**함수**: `_profile_matches_sub_test` (line 196)

### gender — 빈 문자열이면 거부

```python
# 변경 전
if profile_gender and profile_gender not in allowed:
    return False

# 변경 후
if not profile_gender or profile_gender not in allowed:
    return False
```

### informant — 빈 문자열이면 거부

```python
# 변경 전
if profile_informant and profile_informant not in allowed_informants:
    return False

# 변경 후
if not profile_informant or profile_informant not in allowed_informants:
    return False
```

### birth_day — None이면 age_range 조건이 있을 때 거부

```python
# 변경 전
if isinstance(age_range, dict) and birth_day is not None:
    ...

# 변경 후
if isinstance(age_range, dict):
    if birth_day is None:
        return False
    ...
```

### 5. school_age — 조건에 있으면 엄격 강제

```python
# 변경 전
if profile_school_age:                             # school_age 미입력이면 체크 전체 skip
    if isinstance(school_raw, list) and school_raw:
        if profile_school_age not in allowed_school:
            return False
    ...

# 변경 후
if isinstance(school_raw, list) and school_raw:
    allowed_school = {str(x).strip() for x in school_raw if str(x).strip()}
    if not profile_school_age or profile_school_age not in allowed_school:
        return False                               # 미입력 또는 허용 목록 외 값 → 거부
elif isinstance(school_raw, str) and school_raw.strip():
    if not profile_school_age or profile_school_age != school_raw.strip():
        return False
```

### 6. school_age_range (dict) — 체인에 추가 + 엄격 강제

현재 `school_raw` 체인에 `school_age_range`가 없어서 dict 형 조건이 완전히 무시됨.
`school_age_range`는 age_range와 동일한 `{start_inclusive, end_exclusive}` 구조이지만
profile의 `school_age`는 "초1" 같은 문자열 → 수치 변환 없이는 범위 비교 불가.
현재 이 구조를 사용하는 검사가 없으므로: 체인에 추가하되 dict이면 `profile_school_age` 비어있을 때만 거부.
범위 비교는 해당 조건을 사용하는 검사가 생길 때 추가 구현.

## 검증 방법
- gender 없이 PAT-2 문항 요청 → 400 에러
- informant 없이 PAT-2 문항 요청 → 400 에러
- birth_day 없이 age_range 있는 검사 요청 → 400 에러
- 정상 프로필(만 5세, male, mother)로 PAT-2 요청 → [3,7) × mother variant 선택 확인
- K-PSI-4-SF, PCT (informant 없음) → 기존 동작 유지 확인

## Related Documents
- [docs/technical-debt.md](/Users/mac/insight_/2.0-modular/docs/technical-debt.md)
- [AGENTS.md](/Users/mac/insight_/2.0-modular/AGENTS.md)
