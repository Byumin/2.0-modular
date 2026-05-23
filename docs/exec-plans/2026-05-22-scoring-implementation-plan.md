# Execution Plan

## Task Title
- 채점 없는 검사들 채점 로직 구현 (PCT → PAT-2 → K-PSI-4-SF 순)

## Request Summary
- 엑셀 파일(`artifacts/scoring-sources/`)에 담긴 채점 로직을 분석해 검사별 Scorer를 구현한다.
- 현재 UnsupportedScorer 상태인 검사: PCT, PAT-2, K-PSI-4-SF, PSES

## Goal
- 각 검사에 대해 `app/services/scoring/tests/` 하위에 Scorer를 구현하고 registry에 등록한다.
- 채점 결과에는 하위척도/상위척도의 원점수 → T점수 → 수준 → 해석텍스트가 포함된다.

---

## 엑셀 파일 탐색 프로세스 (매 검사 공통)

엑셀 파일을 받으면 아래 순서로 파악한다.

### Step 0: 시트 목록 파악
```bash
python3 -c "
import openpyxl
wb = openpyxl.load_workbook('파일경로.xlsx', data_only=True)
print(wb.sheetnames)
"
```

### Step 1: 해당 검사 시트 전체 출력
```bash
python3 -c "
import openpyxl
wb = openpyxl.load_workbook('파일경로.xlsx', data_only=True)
ws = wb['시트명']
for row in ws.iter_rows(values_only=True):
    if any(c is not None for c in row):
        print(row)
"
```

### Step 2: 아래 항목을 읽어서 정리

| 항목 | 확인 내용 |
|------|-----------|
| **척도 구조** | 상위척도(B코드) → 하위척도(A코드) → 문항번호 매핑 |
| **역채점 문항** | `*`, `**`, `_R` 표기 문항 및 적용 범위 (하위척도 자체 vs 상위척도 합산 시) |
| **점수 변환** | 원점수 → T점수 변환 방식 (norm 테이블 lookup vs 공식) |
| **수준 기준** | T점수 구간별 낮음/보통/높음 임계값 |
| **해석 텍스트** | 척도×수준 조합별 텍스트 위치 (시트 내 vs DB norm map에 내장) |
| **연령/성별 조건** | 규준이 연령/성별로 분리되는지 여부 |
| **예외 처리** | 규준 외 연령 처리 방침 |

### Step 3: DB 검증
```bash
# 1. norm 테이블 확인 - 해당 검사 norm id 목록
python3 -c "
import sqlite3, json
conn = sqlite3.connect('modular.db')
cur = conn.cursor()
cur.execute('SELECT id, name FROM norm WHERE \"test.id\" = \"검사ID\"')
print(cur.fetchall())
"

# 2. norm map 구조 확인 (상위키, 첫 번째 엔트리)
python3 -c "
import sqlite3, json
conn = sqlite3.connect('modular.db')
cur = conn.cursor()
cur.execute('SELECT map FROM norm WHERE id = \"NORM_ID\"')
data = json.loads(cur.fetchone()[0])
print('키:', list(data.keys()))
first_key = list(data.keys())[0]
print('첫 엔트리 샘플:', dict(list(data[first_key].items())[:3]))
"

# 3. scale 테이블에서 척도 구조 확인
python3 -c "
import sqlite3
conn = sqlite3.connect('modular.db')
cur = conn.cursor()
cur.execute('PRAGMA table_info(scale)')
print([r[1] for r in cur.fetchall()])
cur.execute('SELECT * FROM scale WHERE \"test.id\" = \"검사ID\" LIMIT 10')
print(cur.fetchall())
"
```

### Step 4: 구현 전 확인 체크리스트
- [ ] norm map 키가 척도 코드(A01, B01 등)와 일치하는가
- [ ] norm map 값에 t, level(category), percentile, text 필드가 있는가 (또는 없어서 별도 처리 필요한가)
- [ ] 역채점 문항이 DB item 정의에 이미 반영됐는가, 아니면 Scorer에서 처리해야 하는가
- [ ] 상위척도 합산 시 역채점 척도가 있는가 (PCT A02→B01, A07→B03 패턴)
- [ ] 연령/성별별 norm 분리 여부 및 해당 condition.id 명명 규칙

---

## PCT 채점 구현 계획

### 파악된 구조

**척도 구조**
```
B01 부모양육효능감
  └ A01 유능감       (문항 1-8, 8개)
  └ A02 불안감*      (문항 9-15, 7개)  ← B01 합산 시 역채점

B02 배우자양육협력
  └ A03 양육참여     (문항 16-22, 7개)
  └ A04 의견일치     (문항 23-29, 7개)

B03 부모(IBSP)
  └ A05 반응성       (문항 30-36, 7개)
  └ A06 효율성       (문항 37-43, 7개)
  └ A07 지시성**     (문항 44-50, 7개)  ← B03 합산 시 역채점 (단, 46번은 이미 46_R로 역채점됨)
```

**수준 기준**
- 낮음: T ≤ 39
- 보통: 40 ≤ T ≤ 59
- 높음: T ≥ 60

**DB 현황**
- norm: `NORM_PCT_00000240` 존재, map에 A01~A07, B01~B03 키, 각 원점수별 `t`, `p`, `level`, `text` 내장
- 엑셀 텍스트와 DB 텍스트 일치 여부: **검증 필요** (현재 불일치 의심)

**연령 처리**
- 7세~20세 실시 가능, 규준 외 연령이면 6세 11개월 규준 사용 + OZ(안내문구) 추가

### 구현 태스크

| # | 태스크 | 상태 |
|---|--------|------|
| 1 | norm map 텍스트 vs 엑셀 텍스트 일치 여부 검증 | 대기 |
| 2 | scale 구조 DB 확인 (하위척도 item 역채점 반영 여부) | 대기 |
| 3 | `app/services/scoring/tests/pct.py` Scorer 구현 | 대기 |
| 4 | registry.py에 PctScorer 등록 | 대기 |
| 5 | 실제 제출 데이터로 수동 검증 | 대기 |

### Scorer 구현 핵심 로직

```python
# 하위척도(A코드) 원점수 → norm 조회 → T점수/수준/텍스트
# 상위척도(B코드) 합산 시:
#   B01 = A01 원점수 + (A02 역채점 원점수)   # A02는 문항 수 * 최대점수 - A02 원점수
#   B02 = A03 원점수 + A04 원점수
#   B03 = A05 + A06 + (A07 역채점, 단 46번 제외)
# B코드 합산 원점수 → norm 조회
```

---

## 이후 검사 계획 (엑셀 제공 후 진행)

| 검사 | 엑셀 시트 | 주요 특이사항 |
|------|-----------|---------------|
| PAT-2 | `PAT-2 로직` | 연령×성별 norm 분리 (6개 이상 norm) |
| K-PSI-4-SF | `K-PSI-4 로직` | 단축형, 단일 norm 예상 |
| PSES | 별도 엑셀 예정 | 미확인 |

---

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 구조: `ARCHITECTURE.md` — scoring service 패턴 확인 (pet.py 참조)
- [x] DB norm 테이블 스키마 확인
- [ ] 엑셀 텍스트 ↔ DB norm 텍스트 일치 검증 (PCT)
- [ ] scale 테이블에서 역채점 문항 반영 여부 확인 (PCT)

## Verification
- Checked: 엑셀 시트 구조, DB norm 존재 여부, Scorer 패턴(pet.py)
- Not checked: 실제 채점 결과 정합성, 엑셀-DB 텍스트 일치

## Related Documents
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [app/services/scoring/tests/pet.py](/mnt/c/Users/user/workspace/2.0-modular/app/services/scoring/tests/pet.py)
- [app/services/scoring/tests/registry.py](/mnt/c/Users/user/workspace/2.0-modular/app/services/scoring/tests/registry.py)
- 엑셀 원본: `artifacts/scoring-sources/26-0511 PCT, PAT-2, K-PSI-4 단축형 로직 정리.xlsx`
