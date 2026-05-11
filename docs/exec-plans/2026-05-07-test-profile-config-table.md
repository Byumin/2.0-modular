# 실행계획: test_profile_config 테이블 추가

## 목적

검사마다 인적사항 수집 방식이 다른 문제 해결.
- PAT-2, PCT: 자녀 생년월일 기준
- GOLDEN, STS, K-PSI-4-SF, PET: 본인(수검자) 생년월일 기준
- 현재 ProfileStep에는 누구의 정보인지 안내가 없음

## 설계

### 새 테이블: `test_profile_config`

```sql
CREATE TABLE test_profile_config (
    test_id     TEXT PRIMARY KEY REFERENCES test(id),
    config_json TEXT NOT NULL DEFAULT '{}'
);
```

`config_json` 구조:
```json
{
  "subject_type": "child",           -- "child" | "self" | "parent"
  "section_hint": "자녀에 대한 정보를 입력해주세요",
  "field_labels": {
    "name":      "자녀 이름",
    "birth_day": "자녀 생년월일",
    "gender":    "자녀 성별"
  }
}
```

모든 필드 optional — NULL/누락 시 ProfileStep이 기본값 사용.

### 초기 데이터

| test_id | subject_type | section_hint | field_labels |
|---|---|---|---|
| PAT-2 | child | 자녀에 대한 정보를 입력해주세요 | name/birth_day/gender → 자녀 OOO |
| PCT | child | 자녀에 대한 정보를 입력해주세요 | name/birth_day/gender → 자녀 OOO |
| GOLDEN | self | (기본값) | (기본값) |
| STS | self | (기본값) | (기본값) |
| K-PSI-4-SF | self | (기본값) | (기본값) |
| PET | self | (기본값) | (기본값) |

## 작업 순서

### 1. DB 마이그레이션
- `app/db/schema_migrations.py`에 migration 추가
- 테이블 생성 + 초기 데이터 INSERT

### 2. 백엔드: InitialPayload에 profile_config 포함
- `app/services/admin/common.py`에서 `InitialPayload` 조립 시
  `test_profile_config` 조인하여 `profile_config` 필드 추가

### 3. 프론트엔드: ProfileStep 라벨/힌트 반영
- `payload.profile_config`를 읽어:
  - `section_hint` → 인적사항 섹션 안내문 대체
  - `field_labels.name` → "이름" 라벨 대체
  - `field_labels.birth_day` → "생년월일" 라벨 대체
  - `field_labels.gender` → "성별" 라벨 대체

### 4. 타입 추가
- `frontend/src/pages/assessment/types.ts`의 `InitialPayload`에 `profile_config` 타입 추가

## 미검증 항목

- [ ] STS는 영유아(부모 대리응답)와 성인(본인 응답) 혼재 — 일단 `self`로 유지, 별도 이슈
- [ ] `test_profile_config`가 없는 test_id(미래 신규 검사) → ProfileStep 기본값으로 안전하게 fallback 확인
