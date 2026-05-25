# PAT-2 Scoring Implementation

## 작업 제목
- PAT-2 채점 로직 구현 및 해석문구 반영

## 요청 요약
- PAT-2는 연령 x 보고자 유형으로 규준을 선택한다.
- DB `norm.map`에 이미 있는 `p`와 `plevel`을 사용한다.
- Scorer는 척도별 원점수 합산 후 norm 조회만 수행한다.
- 엑셀 `PAT-2 로직` 시트의 해석 문구를 `interpret`에 넣는다.

## 작업 목표
- `app/services/scoring/tests/pat2.py` 신규 구현
- `registry.py`에 `PAT-2` Scorer 등록
- `interpretcondition`/`interpret`에 PAT-2 해석문구 추가
- 채점 문서의 Supported Scorers와 기존 실행계획의 PAT-2 조건 설명 정정

## 초기 가설
- PAT-2는 상위척도 없이 A01~A08 하위척도 원점수만 계산하면 된다.
- 원점수 변환은 18개 `normcondition` 중 제출 당시 선택된 `sub_test_json`과 일치하는 condition의 norm을 사용하면 된다.
- `norm.map` entry의 `p`를 `percentile`, `plevel`을 `category`로 매핑한다.
- 엑셀 시트의 해석문구는 단체검사용 설명이지만 현재 보고서 해석문구 자원으로 저장한다.

## 실행 계획
1. PAT-2 엑셀 시트와 로컬 DB 구조 교차 확인
2. 기존 실행계획의 "연령 x 성별" 오기 정정
3. PAT-2 Scorer 구현
4. `registry.py` 등록
5. `interpretcondition`/`interpret` 로컬 DB 반영
6. 로컬 검증: DB row 확인, Scorer 단위 실행 또는 정적 로직 검증
7. 결과와 미검증 항목 기록

## 작업 중 변경 사항
- PAT-2 조건축을 연령 x 보고자 유형으로 확정했다.
- `gender`는 `male/female` 전체 허용 조건이라 norm 분기축으로 사용하지 않는다.
- `PAT-2` Scorer는 `build_choice_score_result()`를 재사용하고, norm 적용만 별도 구현했다.
- `normcondition.condition`과 제출 variant `sub_test_json` 비교 시 `gender` 배열 순서가 다를 수 있어, Scorer 내부 JSON 정규화에서 scalar list를 정렬하도록 했다.
- 엑셀 `PAT-2 로직` 시트의 해석문구를 `INTERP_PAT2_ALL`로 로컬 `modular.db`에 반영했다.

## 결과
- `app/services/scoring/tests/pat2.py` 추가
- `app/services/scoring/tests/registry.py`에 `PAT-2` 등록
- `docs/features/scoring-flow.md` Supported Scorers 표에 PCT/PAT-2 반영
- `docs/exec-plans/2026-05-22-scoring-implementation-plan.md`의 PAT-2 조건축 설명 정정
- 로컬 `modular.db`:
  - `interpretcondition`: `INTERP_PAT2_ALL` 1행 추가
  - `interpret`: `INTERP_PAT2_ALL` 1행 추가
  - map 구조: A01~A08 x `미흡함`/`이상적임`/`지나침`
- RDS PostgreSQL:
  - EC2 SSH 터널(`127.0.0.1:15432 -> RDS:5432`) 경유로 동일 데이터 반영
  - 기존 `INTERP_PAT2_ALL`이 있으면 삭제 후 재삽입하는 방식으로 upsert

## 검증 내용
- `DATABASE_URL=sqlite:////Users/mac/insight_/2.0-modular/modular.db`로 로컬 DB에 연결해 PAT-2 Scorer 단위 검증
  - 입력: 3~7세, mother variant, 43문항 모두 `3`
  - 결과: `status=scored`, `scale_count=8`, `score_normalization=percentile_norm`
  - 예시 결과: A01 raw 27 → p 2 → 미흡함, A05 raw 12 → p 50 → 이상적임
- interpret map 보고서 매칭 검증
  - A01~A08 모두 `미흡함`/`이상적임`/`지나침` 키 존재
  - `_get_interpretation()` category 매칭 정상
- 문법 검증
  - `python3 -m compileall app/services/scoring/tests app/services/scoring app/services/report`
- DB row 확인
  - PAT-2 `interpretcondition` 1행
  - PAT-2 `interpret` 1행
- RDS 반영 검증
  - `rds_interpretcondition_count = 1`
  - `rds_interpret_count = 1`
  - `rds_interpret_id = INTERP_PAT2_ALL`
  - `rds_interpret_scales = A01,A02,A03,A04,A05,A06,A07,A08`
  - `rds_interpret_levels_A01 = 미흡함,이상적임,지나침`
- 참고
  - 현재 로컬에는 앱이 기대하는 `env.local.dev`가 없고 `.env.local.dev`만 있어, 로컬 검증은 명시적 SQLite `DATABASE_URL`로 수행했다.

## 회고
- Plan Problem: 기존 실행계획의 "연령 x 성별" 표현은 실제 DB 조건과 맞지 않았다.
- Execution Judgment: 구현 전 DB와 엑셀을 교차 확인해 조건축을 바로잡았고, JSON 배열 순서 차이까지 검증 중 발견해 Scorer 정규화에 반영했다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] `docs/exec-plans/README.md` 확인
- [x] `docs/doc-governance.md` 확인
- [x] `docs/database/runtime-db.md` 확인
- [x] 기존 PAT-2 실행계획/엑셀/DB 구조 확인
