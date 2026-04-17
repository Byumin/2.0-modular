# Execution Plan

## Task Title
- 해석문구 테이블 신설 (interpretcondition + interpret)

## Request Summary
- norm/normcondition 패턴과 동일하게 해석문구 전용 테이블 두 개를 추가한다.
- `builder.py`의 하드코딩 `_INTERPRETATIONS` dict를 제거하고 DB 조회로 전환한다.
- modular.mwb 모델링 문서에 두 테이블 추가 반영한다.
- docs에 해석문구 조회 방식 기록한다.

## Goal
- 해석문구를 DB에서 관리 → 코드 배포 없이 문구 수정 가능
- 인구통계 조건별 해석문구 분리 가능 (norm과 독립적인 condition 체계)
- category / range 두 가지 매칭 방식 수용

## 테이블 스키마

### interpretcondition
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | TEXT PK | e.g. `INTERP_PET_ALL` |
| test.id | TEXT | e.g. `PET` |
| name | TEXT | e.g. `모두` |
| type | TEXT | e.g. `all`, `age_range` |
| condition | TEXT | JSON, 적용 조건 (normcondition.condition과 동일 형식) |

### interpret
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | TEXT PK | e.g. `INTERP_PET_ALL` |
| name | TEXT | e.g. `PET 전체 해석문구` |
| map | TEXT | JSON, 척도별 해석문구 |
| condition.id | TEXT | → interpretcondition.id |
| test.id | TEXT | → test.id |

### interpret.map JSON 형식
```json
{
  "B01": {
    "낮음": "...",
    "보통": "...",
    "높음": "..."
  },
  "A01": {
    "score_basis": "raw_score",
    "7-22": "...",
    "23-30": "...",
    "31-40": "..."
  }
}
```
category 방식: 수준 레이블(낮음/보통/높음)을 키로 직접 사용.  
range 방식: `score_basis` + `"min-max"` 형식 키 사용.

## Initial Plan
1. DB 마이그레이션 — `interpretcondition`, `interpret` 테이블 생성
2. PET_ALL 데이터 삽입 (interpretcondition + interpret)
3. modular.mwb XML에 두 테이블 추가
4. `builder.py` — `_INTERPRETATIONS` 제거, DB 조회 함수로 교체
5. `docs/features/scoring-flow.md` — 해석문구 조회 방식 추가
6. `docs/features/report-dashboard.md` — interpretation 데이터 소스 설명 수정

## Progress Updates

### Update 1
- Time: 2026-04-17
- Change: 계획서 작성

### Update 2
- Time: 2026-04-17
- Change: DB 마이그레이션 — interpretcondition, interpret 테이블 생성 + PET_ALL 데이터 삽입
- Result: 성공

### Update 3
- Time: 2026-04-17
- Change: modular.mwb — interpretcondition, interpret 테이블 두 개 추가
- Result: 성공 (검증 통과)

### Update 4
- Time: 2026-04-17
- Change: builder.py — _INTERPRETATIONS 하드코딩 제거, DB 조회(_load_interpret_map, _get_interpretation)로 전환
- Result: 성공

### Update 5
- Time: 2026-04-17
- Change: docs/features/scoring-flow.md, report-dashboard.md 해석문구 조회 방식 기록
- Result: 성공

## Result
- interpretcondition/interpret 테이블 신설 및 PET_ALL 데이터 적재
- builder.py DB 조회 전환 완료
- modular.mwb, docs 반영 완료

## Verification
- Checked: DB 테이블 생성/데이터 삽입, builder.py 수정, mwb XML 검증, docs 업데이트
- Not checked: 실제 보고서 API 호출로 해석문구 렌더링 확인

## Related Documents
- [docs/features/scoring-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/scoring-flow.md)
- [docs/features/report-dashboard.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/report-dashboard.md)
- [app/services/report/builder.py](/mnt/c/Users/user/workspace/2.0-modular/app/services/report/builder.py)
- [modular.mwb](/mnt/c/Users/user/workspace/2.0-modular/modular.mwb)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
