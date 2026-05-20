# Execution Plan

## Task Title
- `condition_profile_map` 기반 실시구간 프로필 필드 매핑

## Request Summary
- `test_profile_config`에 `condition_profile_map` 구조를 반영한다.
- `sub_test_json`의 각 조건 키가 어떤 profile 필드를 기준으로 판별되는지 명시하고, 실시구간 매칭 로직에서 사용한다.

## Goal
- `K-PSI-4-SF`는 부모 생년월일/성별 기준으로 실시구간을 판별한다.
- `PAT-2`, `PCT`는 자녀 생년월일/성별 기준으로 실시구간을 판별한다.
- 매핑이 없는 기존 검사는 기존 `birth_day`, `gender`, `informant`, `school_age` fallback 동작을 유지한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: `ARCHITECTURE.md`
  - DB: `docs/database/runtime-db.md`
  - UI/디자인: 해당 없음
  - 문서 체계: `docs/doc-governance.md`
  - 설명/디버깅: `docs/debug/explanation-rule.md`
  - 코드 정리 산출물: 해당 없음
- [x] 운영 DB가 필요한 작업이면 RDS PostgreSQL 기준 확인
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- `test_profile_config.essential_profile_json`은 이미 검사별 인적사항 구조를 담고 있으므로 `condition_profile_map`을 추가하기에 적합하다.
- 별도 컬럼 없이 기존 JSON에 추가하면 스키마 변경 없이 운영 DB와 코드에 반영할 수 있다.
- 실시구간 매칭 함수에 `condition_profile_map`을 인자로 넘기면 검사별/조건별 profile 필드 기준을 적용할 수 있다.

## Initial Plan
1. `test_profile_config`에서 검사별 `condition_profile_map`을 읽는 helper를 추가한다.
2. `_profile_matches_sub_test()`가 매핑을 받으면 `sub_test_json` 조건 키별로 지정된 profile 필드를 사용하도록 변경한다.
3. `build_custom_assessment_question_payload()`와 관련 호출 경로에 DB 세션을 전달해 매핑을 사용할 수 있게 한다.
4. 운영 RDS의 `K-PSI-4-SF`, `PAT-2`, `PCT`, `PSES` 설정에 `condition_profile_map`을 추가한다.
5. 부모/자녀 생년월일이 서로 다른 테스트 케이스로 검증한다.

## Progress Updates
### Update 1
- Time: 2026-05-20
- Change: 프로젝트 규칙, 구조, DB, 문서 거버넌스, 설명 규칙 문서를 확인했다.
- Reason: 코드와 운영 DB 설정을 함께 바꾸는 작업이기 때문이다.

### Update 2
- Time: 2026-05-20
- Change: `assessment_links` 실시구간 매칭 로직에 `condition_profile_map` 로딩/적용 경로를 추가하고, 제출 채점 컨텍스트 생성도 동일한 payload 생성 경로를 사용하도록 DB 세션을 전달했다.
- Reason: 같은 `sub_test_json` 키라도 검사별로 부모/자녀/응답자 프로필 중 어떤 필드를 기준으로 해석할지 달라질 수 있기 때문이다.

### Update 3
- Time: 2026-05-20
- Change: `test_profile_config.essential_profile_json`에 `condition_profile_map` seed/보정 마이그레이션을 추가하고 운영 RDS에 적용했다.
- Reason: 운영 링크에서 즉시 검사별 실시구간 기준을 명시적으로 읽을 수 있어야 하기 때문이다.

### Update 4
- Time: 2026-05-20
- Change: `docs/database/schema-overview.md`에 `condition_profile_map` 구조와 fallback 규칙을 문서화했다.
- Reason: `sub_test_json` 조건 키와 profile 입력 필드의 관계를 DB 문서에서 추적할 수 있어야 하기 때문이다.

## Result
- `condition_profile_map` 기반 실시구간 매칭을 반영했다.
- `K-PSI-4-SF`, `PSES`는 부모 생년월일/성별 기준으로 age/gender 조건을 판별한다.
- `PAT-2`, `PCT`는 자녀 생년월일/성별 기준으로 age/gender 조건을 판별한다.
- `PAT-2`는 `informant` 조건도 명시적으로 `informant` profile 필드에 매핑한다.
- 매핑이 없는 검사와 기존 단일 인적사항 링크는 기존 fallback 동작을 유지한다.

## Verification
- Checked:
  - `.venv/bin/python -m compileall app/services/admin/assessment_links.py app/services/scoring/submissions.py app/db/schema_migrations.py app/main.py`
  - 운영 RDS `test_profile_config.essential_profile_json.condition_profile_map` 확인:
    - `K-PSI-4-SF`: `age_range -> parent_birth_day`, `gender -> parent_gender`
    - `PAT-2`: `age_range -> child_birth_day`, `gender -> child_gender`, `informant -> informant`
    - `PCT`: `age_range -> child_birth_day`, `gender -> child_gender`
    - `PSES`: `age_range -> parent_birth_day`, `gender -> parent_gender`
  - 직접 서비스 검증:
    - 부모/자녀 정상 범위: `AUTO_CREATE_CONFIRM_REQUIRED`
    - 부모 100세, 자녀 정상: `K-PSI-4-SF` 범위 불일치
    - 부모 정상, 자녀 20세 1개월: `PCT` 범위 불일치
    - 자녀 성별 조건 불일치: `PAT-2` 범위 불일치
    - 부모 99세, 자녀 20세 0개월 29일: `AUTO_CREATE_CONFIRM_REQUIRED`
  - 단일 인적사항 fallback 검증:
    - 매핑 필드가 `child_birth_day`여도 profile에 `birth_day`만 있는 경우 기존 방식으로 age range 판별 가능
- Not checked:
  - 운영 FastAPI 프로세스 재시작 후 실제 브라우저 링크에서의 화면 동작

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- `sub_test_json`의 `age_range`, `gender`, `informant` 같은 조건 키가 어떤 profile 필드에 대응되는지 DB에 명시되어 있지 않았다.

### Why
- 기존 구조는 단일 대상자 인적사항 기준을 전제로 동작했고, 부모/자녀 인적사항이 동시에 들어오는 custom link에서는 조건 키의 주체를 코드가 안정적으로 알 수 없었다.

### Next Time
- 신규 검사를 추가할 때는 `required_profile_fields`와 별개로 `condition_profile_map`까지 함께 정의해 실시구간 판별 기준을 명시한다.

## Related Documents
- [AGENTS.md](../../AGENTS.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [docs/database/runtime-db.md](../database/runtime-db.md)
- [docs/doc-governance.md](../doc-governance.md)
- [docs/debug/explanation-rule.md](../debug/explanation-rule.md)
