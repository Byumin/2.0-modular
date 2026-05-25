# Scoring Implementation Playbook

## Purpose
새 검사 채점 소스를 받았을 때, 엑셀 로직 시트와 DB 데이터를 논리적으로 비교 검토하고 Scorer 구현까지 이어가기 위한 반복 절차를 정의한다.

이 문서는 운영 절차 문서다. 현재 채점 실행 흐름 자체는 [scoring-flow.md](scoring-flow.md)를 기준으로 본다.

## When To Use
- 새 검사 채점 로직 엑셀을 받았을 때
- 기존 검사가 `UnsupportedScorer` 상태일 때
- DB에는 `scale`/`norm`이 있으나 해석문구나 Scorer가 없을 때
- 채점 결과가 엑셀 또는 운영 프로그램과 맞지 않아 원인 추적이 필요할 때

## Source Inputs
작업 시작 시 아래 자료를 한 세트로 확인한다.

| 자료 | 확인 목적 |
|---|---|
| 엑셀 로직 시트 | 검사별 척도, 역채점, 수준 기준, 해석문구, 예외 규칙 확인 |
| `scale.struct` | 문항별 점수 매핑과 상위/하위척도 구조 확인 |
| `item`/`itemcondition` | 실시 문항 수, 문항 번호, 조건 구간 확인 |
| `norm`/`normcondition` | 원점수 변환표와 규준 조건축 확인 |
| `interpret`/`interpretcondition` | 보고서 해석문구 보유 여부 확인 |
| 기존 Scorer | 재사용 가능한 패턴 확인 |
| `assessment_payload`/`sub_test_json` | 제출 당시 variant 선택 조건 확인 |

## Required Summary
구현 전에 아래 내용을 반드시 정리한다.

| 항목 | 정리할 내용 |
|---|---|
| 검사 ID | DB와 코드에서 사용할 정확한 `test_id` |
| 검사 유형 | 단일 척도, 하위척도, 상위척도+하위척도 여부 |
| 조건축 | age_range, gender, informant, school_age_range 중 실제 norm 분기축 |
| 문항 구조 | 척도별 문항 번호, 문항 수, 전체 문항 중복/누락 여부 |
| 점수척도 | 응답값별 점수 범위, 역채점 문항, 특수 응답값 |
| 합산 방식 | 하위척도 합산, 상위척도 flat 합산, facet 합산, Option B 필요 여부 |
| 위계 보존 | 상위척도와 하위척도 관계, 선택 코드와 채점 구조 코드의 층위 차이 |
| 변환 방식 | raw → t, raw → p, raw → level/category 등 |
| 수준 기준 | 낮음/보통/높음, 미흡함/이상적임/지나침 등 실제 category 문자열 |
| 해석문구 | category 기반인지 raw_score range 기반인지 |
| 예외 규칙 | 무응답, 규준 외 연령, 조합 해석, 점수 산출 불가 처리 |
| DB 반영 범위 | 로컬 `modular.db`, 운영 RDS, 둘 다인지 |
| 검증 케이스 | 대표 응답, 경계값, 역채점 확인, interpret 매칭 확인 |

## Analysis Workflow
### 1. 엑셀 시트 구조 확인
먼저 시트 목록과 대상 시트의 실제 데이터 범위를 확인한다.

확인할 것:
- 대상 시트명
- 숨김 행/열 여부
- 병합 셀 여부
- 수식 여부
- 데이터 범위
- 로직/해석/규준표가 같은 시트에 있는지 여부

예:
```bash
python3 - <<'PY'
import zipfile, xml.etree.ElementTree as ET
from pathlib import Path

path = Path('artifacts/scoring-sources/파일명.xlsx')
with zipfile.ZipFile(path) as z:
    print(z.namelist())
PY
```

`openpyxl`이 있으면 `data_only=True`로 읽고, 없으면 XLSX 내부 XML을 직접 읽는다.

### 2. 엑셀 내용을 도메인 표로 재구성
엑셀 행을 그대로 믿지 말고 아래 관점으로 재구성한다.

- 척도 정의
- 상위척도/하위척도 관계
- 문항 번호 매핑
- 역채점 또는 척도레벨 역채점
- raw score 산출 방식
- raw score 변환 방식
- category/level 기준
- 해석문구
- 예외 규칙

엑셀에 규준표가 없고 DB에만 `norm.map`이 있는 경우, 엑셀은 해석/운영 규칙 소스로 보고 변환표는 DB를 기준으로 한다.

### 3. DB 보유 상태 확인
로컬 DB와 운영 RDS 모두 같은 관점으로 확인한다.

필수 카운트:
```sql
SELECT 'scale', count(*) FROM scale WHERE "test.id" = :test_id
UNION ALL SELECT 'scalecondition', count(*) FROM scalecondition WHERE "test.id" = :test_id
UNION ALL SELECT 'item', count(*) FROM item WHERE "test.id" = :test_id
UNION ALL SELECT 'itemcondition', count(*) FROM itemcondition WHERE "test.id" = :test_id
UNION ALL SELECT 'norm', count(*) FROM norm WHERE "test.id" = :test_id
UNION ALL SELECT 'normcondition', count(*) FROM normcondition WHERE "test.id" = :test_id
UNION ALL SELECT 'interpret', count(*) FROM interpret WHERE "test.id" = :test_id
UNION ALL SELECT 'interpretcondition', count(*) FROM interpretcondition WHERE "test.id" = :test_id;
```

필수 상세:
- `scalecondition.condition`
- `itemcondition.condition`
- `normcondition.condition`
- `scale.struct`
- `norm.map` key와 value 구조
- `interpret.map` key와 value 구조

### 4. 조건축 판정
조건 JSON에 들어있다고 모두 분기축은 아니다.

판정 기준:
- 값이 모든 row에서 동일하게 전체 허용이면 분기축이 아니다.
- row마다 값이 나뉘고 `normcondition.id`도 달라지면 분기축이다.
- `sub_test_json`과 `normcondition.condition`이 의미상 같아도 배열 순서가 다를 수 있으므로, 비교 시 JSON object key와 scalar list 정렬을 고려한다.

예:
- PAT-2: `gender`는 `male/female` 전체 허용이라 분기축이 아니고, 실제 분기축은 `age_range + informant`.
- K-PSI-4-SF: 단일 조건으로 `age_range + gender`가 있지만 norm 분기 row는 1개다.

### 5. 척도 구조 검산
`scale.struct`에서 다음을 계산한다.

- 척도별 문항 수
- 원점수 가능 범위
- 전체 문항 누락/중복
- 역채점 문항
- `choice_score`와 `facet_scale` 동시 존재 여부

구조 판단:
- 하위척도만 있으면 각 척도를 직접 결과로 만든다.
- 상위척도에 `facet_scale`만 있으면 facet 합산으로 상위 raw를 만든다.
- 상위척도에 flat `choice_score`와 `facet_scale`이 함께 있으면 flat raw를 상위 raw로 쓰고, facets를 하위척도로 산출한다.
- 척도레벨 역채점이 있으면 Option B를 검토한다.

위계 보존 규칙:
- `scale.struct`의 상위척도/하위척도 관계는 채점 결과와 보고서 출력까지 유지한다.
- 검사 생성 시 선택된 코드가 하위척도 코드여도, 그 하위척도를 포함하는 상위척도 구조를 버리지 않는다.
- 선택 코드와 `scale.struct` 최상위 코드가 다를 수 있다. 예를 들어 선택 코드는 `A01`일 수 있고 최상위 코드는 `B01`일 수 있다.
- 선택 코드 필터링은 최상위 코드 비교에서 끝내지 말고, `facet_scale` 하위 코드까지 내려가서 포함 여부를 판단한다.
- 결과 JSON은 상위척도를 scale로 만들고, 하위척도는 해당 scale의 `facets`에 보존한다.

Option B 규칙:
- 상위척도에 flat `choice_score`와 `facet_scale`이 동시에 있으면 Option B로 본다.
- Option B에서는 상위척도 raw를 하위척도 합산으로 대체하지 않는다.
- 상위척도 raw는 상위척도의 flat `choice_score`로 계산한다.
- 하위척도 raw는 각 facet의 `choice_score`로 별도 계산한다.
- 같은 문항이라도 상위척도와 하위척도의 점수표가 다를 수 있으므로, 점수표를 공유한다고 가정하지 않는다.
- 상위척도 norm/interpret는 상위 코드 기준으로, 하위척도 norm/interpret는 facet 코드 기준으로 매핑한다.

구조별 예:
```text
PAT-2:
A01~A08 각각 flat choice_score
=> A01~A08을 직접 scale로 산출

K-PSI-4-SF:
B01
  ├─ PD
  ├─ PCDI
  └─ DC
=> B01에 flat choice_score가 없으면 PD/PCDI/DC facet을 계산하고 B01은 facet 합산

PCT:
B01/B02/B03 각각 flat choice_score + facet_scale 동시 보유
=> B01/B02/B03은 flat choice_score로 산출하고 A01~A07은 facet choice_score로 산출
```

### 6. Norm 구조 검산
`norm.map`에서 다음을 확인한다.

- scale code가 `scale.struct` 결과와 맞는가
- raw score 범위가 가능한 원점수 범위를 커버하는가
- 특수 raw key가 있는가: 예 `999`
- value key가 무엇인가: `t`, `p`, `level`, `percentile`, `category`, `plevel`
- category 문자열이 `interpret.map`의 key와 정확히 맞는가

Scorer는 가능하면 DB에 있는 변환 결과를 그대로 사용한다. 엑셀의 수준 기준은 DB 값 검증과 해석문구 정리에 사용한다.

### 7. Interpret 구조 결정
보고서 빌더는 기본적으로 아래 구조를 기대한다.

```json
{
  "B01": {
    "낮음": "...",
    "보통": "...",
    "높음": "..."
  }
}
```

raw score range 기반 해석이 필요하면:
```json
{
  "A01": {
    "score_basis": "raw_score",
    "7-22": "...",
    "23-30": "..."
  }
}
```

조합 해석이나 OZ 템플릿처럼 현재 보고서 빌더가 직접 쓰지 않는 내용은 보존용 key에 넣는다.

예:
```json
{
  "__summary_template": "...",
  "__combination_cases": {
    "case_1": "..."
  }
}
```

### 8. Scorer 구현 방식 선택
먼저 공통 함수 재사용이 가능한지 본다.

기본 패턴:
- `build_choice_score_result(test_id, context)`로 raw 산출
- 검사별 Scorer에서 norm 적용
- `registry.py`에 등록

전용 로직이 필요한 경우:
- 무응답이 척도 무효화로 이어짐
- 상위척도 산출 방식이 단순 합산이 아님
- 특정 문항이 상위척도에서만 역채점됨
- 조건축 선택이 제출 variant와 1:1로 맞지 않음
- 규준 외 연령을 fallback norm으로 처리해야 함

선택 코드와 위계 코드 처리:
- 공통 채점 인덱스는 `selected_scale_codes`를 최상위 코드에만 적용하지 않는다.
- 최상위 scale이 선택되지 않았더라도 선택된 facet을 포함하면 해당 최상위 scale을 유지한다.
- 최상위 scale이 유지되면 선택된 facet만 계산하되, Option B 상위 raw 산출에 필요한 flat `choice_score`는 유지한다.
- 선택 코드가 최상위 코드이면 해당 scale 전체를 계산한다.
- 선택 코드가 facet 코드이면 해당 facet과 그 parent scale을 함께 계산한다.
- 선택되지 않은 sibling facet은 결과에서 제외하되, parent scale의 flat `choice_score` 계산에 필요한 문항 포함 여부는 검사별 규칙으로 명시한다.

### 9. DB 반영 순서
로컬과 RDS를 모두 반영할 때는 순서를 명확히 남긴다.

1. 로컬 `modular.db`에 `interpretcondition`/`interpret` 반영
2. 로컬 Scorer 검증
3. EC2 SSH 터널로 RDS 접속
4. RDS에 동일 데이터 반영
5. RDS row count와 map key 검증
6. 터널 종료

RDS는 EC2 경유로만 접근한다.

### 10. 검증
최소 검증:
- Scorer import 가능
- `registry.py`에서 Scorer 반환
- 대표 응답으로 `status=scored`
- raw score 예상값 일치
- norm의 t/p/category 매핑 일치
- facets가 있으면 상위/하위 모두 매핑
- interpret category 매칭
- `python3 -m compileall app/services/scoring/tests app/services/scoring app/services/report`

권장 검증:
- 역채점 문항만 응답값을 바꿔 raw 차이 확인
- category 경계 raw 확인
- 조건축별 norm 선택 확인
- RDS와 로컬 DB 구조 차이 확인

## Implementation Output Checklist
작업 완료 시 아래 산출물이 있어야 한다.

- [ ] `docs/exec-plans/YYYY-MM-DD-{test-id}-scoring-implementation.md`
- [ ] 엑셀 시트 구조 요약
- [ ] DB 구조 비교 요약
- [ ] Scorer 파일
- [ ] `registry.py` 등록
- [ ] `interpretcondition`/`interpret` 반영 여부
- [ ] 로컬 DB 검증 결과
- [ ] RDS 검증 결과
- [ ] 대표 응답 검증 결과
- [ ] 미구현 또는 제외한 규칙 명시

## Existing Examples
| 검사 | 구현상 핵심 |
|---|---|
| PCT | Option B. 상위 `B01`/`B02`/`B03`은 flat `choice_score`로 계산하고, 하위 `A01`~`A07`은 facet `choice_score`로 계산한다. 위계는 결과 JSON에 유지한다. |
| PAT-2 | 연령 x 보고자 유형 norm 선택, `p`/`plevel` 사용, T점수 없음 |
| K-PSI-4-SF | `B01` parent와 `PD`/`PCDI`/`DC` facets를 함께 유지한다. `B01`에 flat `choice_score`가 없으면 facet 합산으로 parent raw를 만든다. 무응답 무효화는 제외한다. |

## Related Documents
- [scoring-flow.md](scoring-flow.md)
- [report-dashboard.md](report-dashboard.md)
- [docs/database/runtime-db.md](../database/runtime-db.md)
- [docs/exec-plans/README.md](../exec-plans/README.md)
