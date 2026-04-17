# Scoring Flow

## Purpose
제출된 검사 응답을 기준으로 채점 컨텍스트를 만들고, 채점 엔진을 실행해 결과를 저장하는 기능을 다룬다.

## Main Endpoints
- `POST /api/admin/submissions/{submission_id}/score`

## Main Files

### 채점
- `app/router/scoring_router.py`
- `app/services/scoring/submissions.py`
- `app/services/scoring/engine.py`
- `app/services/scoring/base.py`
- `app/services/scoring/utils.py`
- `app/repositories/custom_test_repository.py`
- `app/repositories/parent_test_repository.py`

### 보고서 (채점 결과 활용)
- `app/router/report_router.py` — 보고서 조회 API (토큰 기반 / 관리자 기반)
- `app/services/report/builder.py` — 채점 결과 → 보고서 데이터 변환 로직

## Behavior Summary
- 관리자 인증 후 특정 submission을 채점한다.
- submission의 답변 JSON을 읽어 평탄화한다.
- 커스텀 검사 설정과 프로필을 다시 읽어 현재 제출에 맞는 채점 컨텍스트를 조립한다.
- 선택된 척도 코드와 variant를 기준으로 scoring index를 만든다.
- `ScoringEngine`이 검사별 채점을 수행한다.
- 결과를 JSON으로 직렬화해 scoring result 테이블에 저장한다.

## Context Build Rule
채점 전 아래 요소가 먼저 조립된다.

- `profile`
- `flattened answers`
- `answers_by_test_variant`
- `assessment_payload`
- `scoring_index_by_test_variant`

즉, 채점은 단순 응답 점수 합산이 아니라 "제출 당시 선택된 검사 구간과 척도 구조"를 재구성한 뒤 수행된다.

## Flow Summary
1. 관리자가 특정 제출 건에 대해 채점을 요청한다.
2. 서버가 관리자 인증을 확인한다.
3. submission과 연결된 커스텀 검사를 조회한다.
4. 답변 JSON을 파싱하고 응답 키를 정규화한다.
5. 프로필 기준 질문 payload를 다시 구성한다.
6. variant별 답변 맵과 척도 인덱스를 만든다.
7. `ScoringEngine.score_tests()`를 호출한다.
8. 결과를 직렬화해 scoring result로 저장한다.
9. 상태값과 결과 JSON을 응답으로 반환한다.

## Supported Scorers
검사별 Scorer는 `app/services/scoring/tests/registry.py`에 등록한다.

| test_id | 파일 | 비고 |
|---|---|---|
| STS | `tests/sts.py` | |
| GOLDEN | `tests/golden.py` | |
| PET | `tests/pet.py` | norm 기반 T점수/백분위/범주 변환 포함 |

새 검사 추가 시: `BaseScorer` 상속 → `score()` 구현 → `registry.py` 등록.

## 해석문구 조회

채점 결과의 척도/하위척도 `category`(낮음/보통/높음) 또는 `raw_score`를 기준으로 해석문구를 조회한다.

### 테이블 구조
- `interpretcondition`: 해석문구 적용 조건 (test.id, name, type, condition JSON)
- `interpret`: 해석문구 데이터 (map JSON, condition.id → interpretcondition)

### interpret.map JSON 형식
```json
{
  "B01": { "낮음": "...", "보통": "...", "높음": "..." },
  "A01": { "score_basis": "raw_score", "7-22": "...", "23-30": "..." }
}
```
- `score_basis` 없으면 category 방식, 있으면 range 방식으로 매칭한다.

### 조회 흐름
1. `builder.py`가 `test_id` 기준으로 `interpret` 테이블에서 `map` 조회
2. 척도/하위척도별로 `category` 또는 `raw_score`를 이용해 텍스트 매칭
3. 매칭 실패 시 빈 문자열 반환

## Notes
- 채점 로직은 parent 검사 원본의 `scale_struct`를 해석하는 과정이 중요하다.
- 응답 키 형식, variant 분기, 척도 선택 코드가 틀어지면 채점 결과가 달라질 수 있다.
- 기능 설명 시에는 채점 엔진뿐 아니라 "채점 전 컨텍스트 조립" 단계를 함께 봐야 한다.
- 채점 결과(`submission_scoring_result.result_json`)는 보고서 대시보드의 데이터 소스가 된다.

## Related Documents
- [docs/features/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/README.md)
- [docs/features/report-dashboard.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/report-dashboard.md)
- [docs/features/assessment-link-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/assessment-link-flow.md)
- [docs/features/client-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-management.md)
- [docs/diagrams/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/diagrams/README.md)
- [docs/database/schema-overview.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/schema-overview.md)
- [docs/golden_scale_audit.md](/mnt/c/Users/user/workspace/2.0-modular/docs/golden_scale_audit.md)
- [docs/golden_shared_item_audit.md](/mnt/c/Users/user/workspace/2.0-modular/docs/golden_shared_item_audit.md)
