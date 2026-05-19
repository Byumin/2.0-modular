# 실행계획: test_profile_config 테이블 구조 재편

## 목적

`config_json` 단일 컬럼을 `essential_profile_json` / `optional_profile_json` 두 컬럼으로 분리.
- 필수 인적 정보와 추가(선택) 인적 정보를 DB 수준에서 명확히 구분
- 프론트에서도 필수/선택 필드를 다르게 렌더링 가능

## 새 스키마

```sql
CREATE TABLE test_profile_config (
    test_id                TEXT PRIMARY KEY REFERENCES test(id),
    essential_profile_json TEXT NOT NULL DEFAULT '{}',
    optional_profile_json  TEXT NOT NULL DEFAULT '{}'
)
```

## 각 컬럼 구조

### essential_profile_json
필수 입력 필드 명세. 단일 섹션이면 section 객체 직접, 다중이면 sections 배열.

```json
// 단일 (PCT)
{
  "subject_type": "child",
  "section_hint": "자녀에 대한 정보를 입력해주세요",
  "fields": { "birth_day": {"label": "자녀 생년월일"}, ... }
}

// 다중 (PAT-2)
{
  "sections": [
    { "subject_type": "parent", "section_hint": "...", "required_fields": [...], "fields": {...} },
    { "subject_type": "child",  "section_hint": "...", "required_fields": [...], "fields": {...} }
  ]
}
```

### optional_profile_json
선택 입력 필드 명세. 현재는 모든 검사 `{}`. 향후 선택 수집 항목 추가 시 사용.

## 작업 순서

### 1. DB 마이그레이션 (schema_migrations.py)
- 기존 `test_profile_config` 존재 + `config_json` 컬럼인 경우 → 새 스키마로 재생성
  - `config_json` → `essential_profile_json` 복사
  - `optional_profile_json` = `{}` 기본값
- `ensure_test_profile_config_table()`: 새 스키마로 테이블 최초 생성 시 사용

### 2. 마이그레이션 함수 추가 및 main.py 등록
- `ensure_test_profile_config_restructure()` 추가

### 3. 백엔드 (assessment_links.py)
- `_load_test_profile_config`: SELECT 시 두 컬럼 읽기
- essential → 기존 sections 로직, optional → 향후 확장용 (지금은 무시)

### 4. 프론트엔드
- `types.ts`: 구조 변경 없음 (API 응답 shape 동일 유지)
- `ProfileStep.tsx`: 변경 없음

## 검증
- [ ] PAT-2 링크 API 응답 `profile_config` 구조 유지 확인
- [ ] PCT, GOLDEN 응답 정상 확인
- [ ] 서버 재시작 후 마이그레이션 자동 실행 확인
