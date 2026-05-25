# K-PSI-4-SF Scoring Implementation

## 작업 제목
- K-PSI-4-SF 채점 로직 구현 및 해석문구 반영

## 요청 요약
- `K-PSI-4 로직` 시트와 DB 데이터를 비교 검토했다.
- 무응답 로직은 구현 범위에서 제외한다.
- 척도별 원점수 합산 후 DB `norm.map`의 `t`, `p`, `level`을 사용한다.
- 엑셀 시트의 해석 문구를 `interpret`에 넣는다.

## 작업 목표
- `app/services/scoring/tests/kpsi4_sf.py` 신규 구현
- `registry.py`에 `K-PSI-4-SF` Scorer 등록
- `interpretcondition`/`interpret`에 K-PSI-4-SF 해석문구 추가
- 기능 문서의 Supported Scorers 표 갱신

## 초기 가설
- K-PSI-4-SF는 `B01` 총 스트레스 상위척도와 `PD`/`PCDI`/`DC` 하위척도로 구성된다.
- `build_choice_score_result()`가 facet 합산으로 `B01`을 만들 수 있으므로 공통 합산 로직을 재사용한다.
- 무응답 로직을 제외하면 별도 특수 점수 계산은 필요 없다.
- 단일 norm row(`NORM_K-PSI-4-SF_00001199`)를 모든 결과에 적용한다.

## 실행 계획
1. K-PSI-4 로직 시트와 DB 구조 확인
2. K-PSI-4-SF Scorer 구현
3. registry 등록
4. 로컬 `modular.db` interpret 반영
5. RDS interpret 반영
6. 로컬 Scorer 단위 검증 및 interpret 매칭 검증
7. 결과 기록

## 작업 중 변경 사항
- 무응답 로직은 사용자 확인에 따라 제외했다.
- K-PSI-4-SF Scorer는 `build_choice_score_result()`를 재사용한다.
- DB scale 구조가 `B01` 상위척도 + `PD`/`PCDI`/`DC` facets로 구성되어 있어, 공통 facet 합산 결과를 그대로 사용한다.
- `norm.map`의 `t`, `p`, `level`을 각각 `t_score`, `percentile`, `category`로 매핑한다.
- 엑셀의 척도별 해석문구는 `B01`/`PD`/`PCDI`/`DC`로 넣고, 공통 해석 템플릿과 조합 케이스는 보존용 `__summary_template`, `__combination_cases` 키에 넣었다.

## 결과
- `app/services/scoring/tests/kpsi4_sf.py` 추가
- `app/services/scoring/tests/registry.py`에 `K-PSI-4-SF` 등록
- `docs/features/scoring-flow.md` Supported Scorers 표에 K-PSI-4-SF 반영
- `docs/exec-plans/2026-05-22-scoring-implementation-plan.md`에 무응답 무효화 규칙 제외 사실 기록
- 로컬 `modular.db`:
  - `interpretcondition`: `INTERP_KPSI4_SF_ALL` 1행 추가
  - `interpret`: `INTERP_KPSI4_SF_ALL` 1행 추가
  - map 구조: `B01`, `PD`, `PCDI`, `DC` x `낮음`/`보통`/`높음`/`매우 높음`
- RDS PostgreSQL:
  - EC2 SSH 터널 경유로 동일 데이터 반영
  - 기존 `INTERP_KPSI4_SF_ALL`이 있으면 삭제 후 재삽입하는 방식으로 upsert

## 검증 내용
- 로컬 Scorer 단위 검증
  - `DATABASE_URL=sqlite:////Users/mac/insight_/2.0-modular/modular.db`
  - 입력: 36문항 모두 `3`
  - 결과: `status=scored`, `scale_count=1`, `score_normalization=t_score_percentile_norm`
  - 예시 결과:
    - B01 raw 108 → T 65.1 → p 93.5 → 매우 높음
    - PD raw 36 → T 56.2 → p 73.2 → 보통
    - PCDI raw 36 → T 69.5 → p 97.4 → 매우 높음
    - DC raw 36 → T 64.6 → p 92.8 → 매우 높음
- interpret map 보고서 매칭 검증
  - `B01`, `PD`, `PCDI`, `DC` 키 존재
  - `B01` category 매칭 정상
- 문법 검증
  - `python3 -m compileall app/services/scoring/tests app/services/scoring app/services/report`
- 로컬 DB row 확인
  - K-PSI-4-SF `interpretcondition` 1행
  - K-PSI-4-SF `interpret` 1행
- RDS 반영 검증
  - `rds_interpretcondition_count = 1`
  - `rds_interpret_count = 1`
  - `rds_interpret_id = INTERP_KPSI4_SF_ALL`
  - `rds_interpret_scale_keys = B01,DC,PCDI,PD`
  - `rds_interpret_levels_B01 = 낮음,높음,매우 높음,보통`

## 회고
- Plan Problem: 초기 실행계획에는 단일 norm 예상만 있었고 무응답 규칙의 구현 여부가 확정되지 않았다.
- Execution Judgment: 구현 전 사용자 확인으로 무응답 무효화 규칙을 제외해 범위를 줄였고, 기존 facet 합산 구조를 그대로 활용했다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] `docs/exec-plans/README.md` 확인
- [x] `docs/database/runtime-db.md` 확인
- [x] K-PSI-4 로직 시트 확인
- [x] 로컬/RDS K-PSI-4-SF scale/norm/interpret 현황 확인
