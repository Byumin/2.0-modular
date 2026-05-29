# Execution Plan

## Task Title
- 결과 화면 실시한 검사 정보 요약 표기 수정

## Request Summary
- `실시한 검사 정보` 영역에서 검사 영문명이 중복 표시되는 문제를 수정한다.
- 각 검사 항목을 `검사 영문명`, `검사 한국명`, `척도 수`, `주의 수`, `긍정 수` 순서로 보이게 한다.

## Goal
- `TestInfoPanel`의 접힌 헤더 정보 구조를 변경한다.
- 검사별 한국명 매핑을 추가한다.
- 주의 수는 `tone === "negative"`, 긍정 수는 `tone === "positive"` 기준으로 계산한다.
- 빌드와 Playwright 캡처로 화면 반영을 확인한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] UI 변경 기준 확인: `DESIGN.md`, `QUALIT_SCORE.md`
- [x] DB 스키마 변경 없음
- [x] 보고서 API 응답 필드 보강 있음: `test_names`

## Initial Plan
1. 테스트 ID별 한국명 helper를 추가한다.
2. `TestInfoPanel` 헤더에서 영문명 중복을 제거하고 한국명/척도/주의/긍정 수를 한 줄 요약으로 배치한다.
3. 빌드로 타입 오류를 확인한다.
4. Playwright로 `admin/report/48` 화면을 캡처하고 텍스트를 확인한다.

## Progress Updates
### Update 1
- Time: 2026-05-27 16:23 KST
- Change: 작업 시작
- Reason: 실시한 검사 정보 카드의 검사 요약 정보 구조 변경

### Update 2
- Time: 2026-05-27 16:30 KST
- Change: 운영 RDS `test` 테이블 확인
- Reason: 사용자가 지적한 대로 검사 한국명은 프론트 하드코딩이 아니라 DB `test.name`에 존재함

### Update 3
- Time: 2026-05-27 16:34 KST
- Change: 보고서 API에 `test_names` 추가, 프론트는 DB 이름 기반으로 한국명 표시
- Reason: `test_id`별 DB 이름을 내려주고, 화면에서는 앞의 영문 ID를 제거해 한국명 영역에 표시하기 위함

## Result
- `app/services/report/builder.py`에서 `test` 테이블의 `id`, `name`을 조회해 보고서 응답에 `test_names`를 포함했다.
- `ReportPage.tsx`는 `test_names`를 기준으로 `VirtualTest.korean_name`을 구성한다.
- `실시한 검사 정보` 영역은 검사 영문명, DB 기반 검사 한국명, 척도 수, 주의 수, 긍정 수를 표시한다.
- DB 이름이 `PAT-2 부모양육태도검사 2판`처럼 영문 ID를 포함하므로, UI 한국명 영역에서는 앞의 `test_id`만 제거해 `부모양육태도검사 2판`으로 표시한다.

## Verification
- Checked:
- 운영 RDS 조회:
  - `test` columns: `id`, `name`, `descript`
  - `K-PSI-4-SF`: `K-PSI-4-SF 한국판 부모 양육스트레스 검사 4판 (단축형)`
  - `PAT-2`: `PAT-2 부모양육태도검사 2판`
  - `PCT`: `PCT 부모양육특성 검사`
- `npm run build:frontend`
- `.venv/bin/python -m py_compile app/services/report/builder.py`
- 수정된 백엔드를 `http://127.0.0.1:8122`에 임시 실행해 Playwright 확인
- API 응답 `test_names` 확인
- Screenshot: `artifacts/screenshots/2026-05-27-report-test-info-db-names.png`
- Not checked:
- 운영 배포 서버 반영 여부. 로컬 `8122` 운영 모드 임시 서버 기준으로 확인했다.

## Retrospective
### Classification
- UI 표시 구조 변경 + API 응답 보강

### What Was Wrong
- 처음에는 프론트 레퍼런스 기반 하드코딩 매핑으로 처리하려 했으나, 실제 운영 DB에 검사 한국명이 존재했다.

### Why
- 기존 보고서 API가 `test_id`만 scale row에 포함하고, 검사 마스터 이름(`test.name`)은 내려주지 않아 프론트에서 바로 사용할 수 없었다.

### Next Time
- 마스터 데이터성 표시값은 먼저 DB/API 출처를 확인한 뒤 프론트 fallback을 결정한다.
- 보고서 화면에서 검사 단위 메타가 필요하면 scale row가 아니라 별도 `test_names` 같은 검사 단위 맵으로 내려준다.

## Related Documents
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [ReportPage.tsx](/mnt/c/Users/user/workspace/2.0-modular/frontend/src/pages/report/ReportPage.tsx)
