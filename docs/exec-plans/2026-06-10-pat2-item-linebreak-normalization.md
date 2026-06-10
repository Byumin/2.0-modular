# Execution Plan

## Task Title
- PAT-2 문항 `<br>` 제거 및 화면 줄바꿈 유지

## Request Summary
- RDS `item.text`에 들어간 PAT-2 문항의 `<br>`을 없애되, 실제 검사 문항 화면에서는 줄바꿈이 유지되게 한다.

## Goal
- DB/응답 payload에는 HTML 태그 대신 줄바꿈 문자 기준 텍스트를 사용한다.
- 프론트 문항 표시 위치에서는 줄바꿈 문자를 시각적으로 유지한다.
- RDS 데이터 정리는 현재 실행 DB와 대상 건수를 확인한 뒤 수행한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - [x] DB: `docs/database/runtime-db.md`
  - [x] UI/디자인: `DESIGN.md`, `QUALIT_SCORE.md`
  - [x] 실행계획: `docs/exec-plans/README.md`
- [x] 운영/실행 서버 DB가 필요한 작업이면 `docs/database/runtime-db.md`의 DB 조회 전 확인 규칙 적용
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- `item.text`의 `<br>`은 문항 원본 데이터의 표시용 HTML 태그가 DB에 섞인 상태다.
- React는 현재 문항 텍스트를 HTML이 아닌 텍스트로 출력하므로, DB 값을 `\n`으로 정규화하고 `whitespace-pre-line`을 적용하면 안전하게 줄바꿈을 유지할 수 있다.

## Initial Plan
1. 백엔드 문항 payload 생성 경로에서 `<br>`류 태그를 줄바꿈 문자로 정규화하는 방어 함수를 추가한다.
2. 집중형/카드형/행렬형/주관식 문항 텍스트 표시 요소에 `whitespace-pre-line`을 적용한다.
3. RDS의 PAT-2 대상 row 개수를 조회하고, 검증 가능한 범위에서 `<br>`을 `\n`으로 업데이트한다.
4. 프론트 빌드와 백엔드 문법 검사를 실행한다.

## Progress Updates
### Update 1
- Time: 2026-06-10
- Change: 문서와 현재 코드 경로 확인.
- Reason: DB 정규화와 화면 렌더링 책임을 분리하기 위해.

### Update 2
- Time: 2026-06-10
- Change: `assessment_links.py`에 `<br>`류 HTML line break를 줄바꿈 문자로 정규화하는 방어 함수를 추가.
- Reason: DB 정리가 늦거나 다른 검사에 같은 데이터가 들어와도 수검자 payload에 태그가 노출되지 않게 하기 위해.

### Update 3
- Time: 2026-06-10
- Change: 집중형, 카드형, 행렬형, 주관식 문항 표시 요소에 `whitespace-pre-line` 적용.
- Reason: HTML 렌더링 없이 텍스트 줄바꿈을 실제 화면에서 유지하기 위해.

### Update 4
- Time: 2026-06-10
- Change: RDS PAT-2 `<br>` 포함 문항 9건을 실제 줄바꿈 문자로 업데이트하고 잔여 건수 확인.
- Reason: DB 원본에서 HTML 태그를 제거하기 위해.

## Result
- RDS `item` 테이블에서 `PAT-2` 문항 9건의 `<br>`을 실제 줄바꿈 문자로 변경했다.
- `SELECT * FROM item i WHERE i."text" LIKE '%<br>%';` 기준 전체 잔여 건수는 0건으로 확인했다.
- 문항 payload 생성 경로에 `<br>` 방어 정규화를 추가했다.
- 수검자 문항 화면의 주요 문항 텍스트 렌더링 위치에 줄바꿈 유지 스타일을 적용했다.

## Verification
- Checked:
  - RDS PAT-2 `<br>` 포함 건수 사전 확인: 9건
  - RDS 업데이트 후 PAT-2 `LIKE '%<br>%'`: 0건
  - RDS 업데이트 후 전체 `item.text LIKE '%<br>%'`: 0건
  - `.venv/bin/python -m py_compile app/services/admin/assessment_links.py`
  - `npm --prefix frontend run build`
- Not checked:
  - Playwright 브라우저 바이너리가 없어 실제 브라우저 스크린샷 검증은 수행하지 못함.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 원본 문항 데이터에 표시 목적의 `<br>` HTML 태그가 섞여 있었다.

### Why
- 문항 데이터 저장 계층과 화면 표시 계층의 책임이 분리되지 않아 표시용 태그가 데이터에 남았다.

### Next Time
- 문항 원본에는 HTML 태그 대신 줄바꿈 문자 같은 순수 텍스트 표현을 저장한다.
- 화면 줄바꿈은 `whitespace-pre-line` 같은 렌더링 계층의 스타일로 처리한다.

## Related Documents
- [AGENTS.md](../../AGENTS.md)
- [docs/database/runtime-db.md](../database/runtime-db.md)
- [DESIGN.md](../../DESIGN.md)
- [QUALIT_SCORE.md](../../QUALIT_SCORE.md)
