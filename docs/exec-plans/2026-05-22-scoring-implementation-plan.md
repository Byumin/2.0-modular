# Execution Plan

## Task Title
- 채점 없는 검사들 채점 로직 구현 (PCT → PAT-2 → K-PSI-4-SF → PSES 순)

## Request Summary
- 엑셀 파일(`artifacts/scoring-sources/`)에 담긴 채점 로직을 분석해 검사별 Scorer를 구현한다.
- 시작 시점에 `UnsupportedScorer` 상태인 검사: PCT, PAT-2, K-PSI-4-SF, PSES

## Goal
- 각 검사에 대해 `app/services/scoring/tests/` 하위에 Scorer를 구현하고 registry에 등록한다.
- 채점 결과에는 하위척도/상위척도의 원점수 → T점수 → 수준 → 해석텍스트가 포함된다.

## Status (2026-05-23 현재)
- ✅ PCT 완료 (구현 + RDS 데이터 반영 + end-to-end 검증)
- ⬜ PAT-2 미착수
- ⬜ K-PSI-4-SF 미착수
- ⬜ PSES 미착수 (엑셀 미수령)

---

## 결정된 아키텍처 원칙 (PCT 작업 중 확정)

### 1. 해석 텍스트 위치
- **DB `norm` 테이블에는 해석 텍스트 저장하지 않는다.** (수치만: t, p, level, sum)
- 해석 텍스트는 **`interpret` 테이블**에 저장한다.
- `interpret.map` 구조: `{척도코드: {수준: 해석텍스트}}`
  - 예: `{"A01": {"낮음": "...", "보통": "...", "높음": "..."}}`
- `interpretcondition`은 PCT의 `normcondition`/`scalecondition`과 동일 패턴(`age_range` + `gender`)으로 작성한다.

### 2. 척도 struct 표현 방식 (Option B 채택)
- 부모척도(B코드)에 **flat `choice_score`**(전체 문항)와 **`facet_scale`**(하위 A코드)을 동시에 둔다.
- 척도레벨 역채점(예: A02 → B01 합산 시 역채점)이 `B01.choice_score`에 미리 반영된다.
- A척도 자체 raw score는 `facet_scale.A0X.choice_score`로 별도 계산.
- 결과: Scorer는 검사별 특수 로직 없이 `build_choice_score_result + norm 조회`만으로 동작 (PET와 동일 패턴).

### 3. 코드 측 변경
- 기존 `_build_variant_scoring_index`/`build_choice_score_result`는 한 척도에서 `choice_score` OR `facet_scale` 중 하나만 처리 (either/or).
- Option B 도입을 위해 **두 개 동시 처리**하도록 수정 완료.
- 영향 검사: PCT만 BOTH 패턴 사용. PET/STS/GOLDEN 등 기존 검사는 영향 없음 (한쪽만 채워져 있어 동일 동작).

---

## PCT 작업 상세 (완료)

### 척도 구조
| B척도 | A척도 | 문항 | 점수척도 | 비고 |
|---|---|---|---|---|
| B01 부모양육효능감 | A01 유능감 | 1~8 (8문항) | 5점 | |
| | A02 불안감 | 9~15 (7문항) | 5점 | B01 합산 시 척도역채점 |
| B02 배우자양육협력 | A03 양육참여 | 16~22 (7문항) | 5점 | |
| | A04 의견일치 | 23~29 (7문항) | 5점 | |
| B03 부모(IBSP) | A05 반응성 | 30~36 (7문항) | 4점 | |
| | A06 효율성 | 37~43 (7문항) | 4점 | |
| | A07 지시성 | 44~50 (7문항) | 4점 | B03 합산 시 척도역채점 (46_R 제외) |

- 수준 구분: T ≤ 39 낮음 / 40~59 보통 / 60 ≤ 높음
- 연령: 7~20세 실시. 규준 외 연령은 6세 11개월 규준 + OZ 안내문구
- norm condition: `PCT_00000240`

### RDS 데이터 변경 사항
1. `interpretcondition` 신규 1행 (`INTERP_PCT_ALL`)
2. `interpret` 신규 1행 (`INTERP_PCT_ALL`, map에 A01~A07/B01~B03 × 3수준 텍스트)
3. `scale.struct` 전면 교체 (Option B 형태)
   - 기존 DB 버그 수정: A06 (효율성) choice_score가 잘못된 역방향이었음 → 정방향으로 정정
   - A02 정방향 유지, B01.choice_score에 A02 문항을 역방향 매핑으로 추가
   - A07 비46번 정방향 유지, B03.choice_score에 비46번을 역방향 매핑으로 추가
   - 46_R은 A07 자체에서 이미 역방향, B03.choice_score에서도 그대로 역방향

### 코드 변경 사항
- `app/services/scoring/submissions.py` — `_build_variant_scoring_index`: 한 척도에서 `choice_score`/`facet_scale` 동시 처리
- `app/services/scoring/utils.py` — `build_choice_score_result`: 한 척도에서 `items`/`facets` 동시 처리. items 있으면 그 합산을 B raw로 사용, 동시에 facets도 채워 A척도 결과 산출.
- `app/services/scoring/tests/pct.py` — 신규 Scorer (`build_choice_score_result` + `_apply_norm`)
- `app/services/scoring/tests/registry.py` — `PctScorer` 등록

### 검증 결과 (가상 응답 — 모든 문항 3 + 일부 변형)
| 척도 | raw | t | category |
|---|---|---|---|
| B01 | 43 | 40 | 보통 |
| ↳ A01 | 24 | 43 | 보통 |
| ↳ A02 | 23 | 61 | 높음 |
| B02 | 42 | 39 | 낮음 |
| B03 | 57 | 38 | 낮음 |
| ↳ A05 | 21 | 49 | 보통 |
| ↳ A06 | 20 | 38 | 낮음 |
| ↳ A07 | 22 | 73 | 높음 |

- A02 척도역채점 반영 확인: B01(43) ≠ A01+A02(47) — 차이 4 = 문항9에서 정방향 5점 vs 역방향 1점
- A07 비46번 척도역채점 반영 확인: B03(57) ≠ A05+A06+A07(63) — 차이 6 = 6문항에서 정방향(3) vs 역방향(2)
- norm 조회 + interpret 텍스트 조회 모두 정상

---

## 엑셀 파일 탐색 프로세스 (매 검사 공통)

엑셀 파일을 받으면 아래 순서로 파악한다.

### Step 0: 시트 목록 파악
```bash
.venv/bin/python3 -c "
import openpyxl
wb = openpyxl.load_workbook('파일경로.xlsx', data_only=True)
print(wb.sheetnames)
"
```

### Step 1: 해당 검사 시트 전체 출력
```bash
.venv/bin/python3 -c "
import openpyxl
wb = openpyxl.load_workbook('파일경로.xlsx', data_only=True)
ws = wb['시트명']
for row in ws.iter_rows(values_only=True):
    if any(c is not None for c in row):
        print(row)
"
```

### Step 2: 척도 구조 정리
| 항목 | 확인 내용 |
|------|-----------|
| 척도 구조 | 상위척도(B코드) → 하위척도(A코드) → 문항번호 매핑 |
| 역채점 문항 | `*`, `**`, `_R` 표기 문항 및 적용 범위 (척도레벨 vs 문항레벨) |
| 점수 변환 | 원점수 → T점수 변환 방식 |
| 수준 기준 | T점수 구간별 낮음/보통/높음 임계값 |
| 해석 텍스트 | 척도×수준 조합별 텍스트 |
| 연령/성별 조건 | 규준이 연령/성별로 분리되는지 여부 |
| 예외 처리 | 규준 외 연령 처리 방침 |

### Step 3: DB 검증 (RDS)
EC2 통한 SSH 터널 필요. 본 머신(WSL)에서는 RDS 직접 접근 불가.

```bash
# 터널 설정 (이미 PEM 파일을 /tmp/2.0-modular.pem에 chmod 600으로 복사한 상태)
ssh -i /tmp/2.0-modular.pem -o StrictHostKeyChecking=no -fN \
    -L 15432:modular-db.czaugqusch3a.ap-northeast-2.rds.amazonaws.com:5432 \
    ubuntu@3.35.46.61

# Python에서 접속
set -a && source .env && set +a
.venv/bin/python3 -c "
import os, psycopg2, json
conn = psycopg2.connect(host='127.0.0.1', port=15432,
    dbname=os.environ['DB_NAME'], user=os.environ['DB_USER'],
    password=os.environ['DB_PASSWORD'])
cur = conn.cursor()
cur.execute('SELECT id, name FROM norm WHERE \"test.id\" = %s', ('검사ID',))
print(cur.fetchall())
conn.close()
"
```

### Step 4: 구현 전 확인 체크리스트
- [ ] scale.struct의 choice_score 매핑이 엑셀 채점 규칙과 일치하는가
- [ ] 척도레벨 역채점이 필요한 척도가 있는가 → Option B 적용
- [ ] norm map에 t, level, p가 있는가 (text는 없어야 정상)
- [ ] interpret 테이블에 해당 검사 행이 있는가
- [ ] norm/scale/interpret/item condition이 동일 패턴인가 (age_range / gender / informant)

---

## 다음 작업

### PAT-2 (다음 차례)
- 엑셀 시트: `PAT-2 로직`
- 주요 특이사항: 연령×성별 norm 분리 (PAT-2 normcondition 행이 많음)
  - `PAT-2_000000_030000_MO`, `_FA`, `_ETC`
  - `PAT-2_030000_070000_MO`, `_FA`, `_ETC`
  - `PAT-2_070000_100000_MO`, `_FA`, `_ETC`
  - 이후 13세 구간, 16세 구간 등으로 세분화
- Scorer가 응답자 프로필(나이/성별/응답자관계 informant)로 condition_id를 선택해 norm 조회해야 함
- PET는 `condition_id = "PET_ALL"` 한 개만 쓰지만 PAT-2는 다중. **공통 헬퍼 함수 필요할 수 있음.**
- 척도 구조 / 역채점 / 해석문구도 엑셀에서 추출 필요

### K-PSI-4-SF
- 엑셀 시트: `K-PSI-4 로직`
- 단축형, 단일 norm 예상 (`K-PSI-4-SF_ALL`)

### PSES
- 엑셀 미수령
- scalecondition에 `PSES_ALL` 만 존재

---

## 작업 환경 세팅 (새 PC에서 시작 시)

### 1. 저장소 클론 + 브랜치 체크아웃
```bash
cd /mnt/c/Users/user/workspace/   # 또는 원하는 경로
git clone <repo>
cd 2.0-modular
git checkout scoring-pct-implementation   # 본 작업 브랜치
```

### 2. Python venv + 의존성
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt  # 또는 필요 시 pip install psycopg2-binary openpyxl
```

### 3. .env 파일 받기 (.gitignore 처리됨)
- RDS 접속 정보 포함된 `.env` 별도 채널로 공유
- 키 항목: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

### 4. RDS SSH 터널 설정 (로컬에서 RDS 직접 접근 불가)
- EC2 PEM: `2.0-modular-web-server-admin` (HostName 3.35.46.61, User ubuntu)
- PEM 위치: `C:/Users/user/noname/2.0-modular.pem` (Windows) → WSL에서 `/mnt/c/Users/user/noname/2.0-modular.pem`
- PEM 권한 문제 시: `cp /mnt/c/Users/user/noname/2.0-modular.pem /tmp/2.0-modular.pem && chmod 600 /tmp/2.0-modular.pem`
- 터널: `ssh -i /tmp/2.0-modular.pem -fN -L 15432:modular-db.czaugqusch3a.ap-northeast-2.rds.amazonaws.com:5432 ubuntu@3.35.46.61`
- Python에서는 `host='127.0.0.1', port=15432`로 접속

---

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 구조: `ARCHITECTURE.md` — scoring service 패턴 확인 (pet.py 참조)
- [x] DB norm 테이블 스키마 확인
- [x] 엑셀 텍스트 ↔ DB norm 텍스트 일치 검증 (PCT) — norm에는 텍스트 없는 것이 정상으로 결정
- [x] scale 테이블에서 역채점 문항 반영 여부 확인 (PCT) — Option B 적용
- [x] PCT Scorer 구현 + 검증 완료

## Related Documents
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [app/services/scoring/tests/pet.py](/mnt/c/Users/user/workspace/2.0-modular/app/services/scoring/tests/pet.py) — 참조 패턴
- [app/services/scoring/tests/pct.py](/mnt/c/Users/user/workspace/2.0-modular/app/services/scoring/tests/pct.py) — 신규
- [app/services/scoring/tests/registry.py](/mnt/c/Users/user/workspace/2.0-modular/app/services/scoring/tests/registry.py)
- 엑셀 원본: `artifacts/scoring-sources/26-0511 PCT, PAT-2, K-PSI-4 단축형 로직 정리.xlsx`
