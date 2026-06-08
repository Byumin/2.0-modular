# 사전 등록 내담자 직접/엑셀 등록 검증

## 요청 요약
- 사전 등록 내담자 관리에서 직접 등록과 엑셀 등록을 실제로 수행해 검증한다.
- 엑셀 업로드 시 휴대폰 번호를 체크했는데도 이름 헤더가 없다고 뜨고 DB 등록이 안 되는 문제를 재현/수정한다.
- RDS 반영 확인과 검사 실시 흐름까지 확인한다.

## 작업 목표
- 직접 등록과 엑셀 등록이 동일한 내담자 생성 경로로 안정적으로 저장되는지 확인한다.
- 엑셀 헤더 인식 오류 원인을 찾아 수정한다.
- 운영 기준 DB 모드에서 등록/조회/검사 실시까지 가능한지 근거를 남긴다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] `ARCHITECTURE.md` 확인
- [x] `docs/runtime-run-modes.md` 확인
- [x] `docs/database/runtime-db.md` 확인
- [x] `DESIGN.md` 확인
- [x] `QUALIT_SCORE.md` 확인

## 초기 가설
- 엑셀 업로드 파서가 체크된 필드와 실제 필수 헤더 검증을 따로 처리해 `name`/한국어 헤더 매핑이 어긋났을 가능성이 있다.
- 저장 실패는 프런트 검증 오류로 API 호출이 막혔거나, API가 받은 컬럼명이 기대값과 달라 row 생성이 누락됐을 가능성이 있다.

## 실행 계획
1. 관련 프런트 페이지와 백엔드 API를 찾고 현재 동작을 파악한다.
2. 로컬에서 직접 등록/엑셀 등록 문제를 재현한다.
3. 원인을 수정하고 단위/통합 검증을 실행한다.
4. 가능한 경우 `local.prod` RDS 모드에서 실제 저장과 검사 실시 흐름을 확인한다.
5. 검증 결과와 미검증 항목을 이 문서와 최종 보고에 남긴다.

## 작업 중 변경 사항
- 엑셀 파일 파싱을 위해 프런트 의존성 `xlsx`를 추가했다. Python 백엔드 의존성이 아니므로 `requirements.txt`가 아니라 `frontend/package.json`과 `frontend/package-lock.json`에 반영했다.
- 엑셀 업로드 헤더를 프런트에서 내부 key로 정규화하도록 `frontend/src/pages/TestDetail.tsx`를 수정했다.
- 백엔드 bulk/direct 등록에서도 한글 표시명, 공백/하이픈/언더스코어 차이, `phone`/`phon_num` 계열 alias를 정규화하도록 `app/services/admin/assessment_links.py`를 수정했다.
- 실제 UI의 휴대폰 field key가 `phon_num`, label이 `핸드폰 번호`인 경로에서 기본 `phone` alias가 먼저 적용되는 문제가 있어, 사용 가능 필드와 현재 match key를 기본 alias보다 우선하도록 보정했다.
- 사전 등록 중복 판정이 일부 기준 필드만 맞아도 match로 처리될 수 있어, 모든 match key가 양쪽에 존재하고 동일할 때만 일치하도록 `app/repositories/custom_test_repository.py`를 수정했다.
- 후속 확인 중 validate-profile 매칭 경로가 등록 경로만큼 key alias를 처리하지 못하는 문제를 발견했다. `phon_num`으로는 통과하지만 `phone`, `핸드폰 번호`, 하이픈 포함 전화번호는 실패했다.
- validate-profile 매칭에서도 phone/phon/한글 전화번호 alias를 찾고, 전화번호는 숫자만 비교하도록 보정했다.
- 사전등록 row에 생성된 provisional client id가 flush만 되고 commit되지 않아 재검증 때 새 내담자가 반복 생성될 수 있어, provisional id 업데이트 직후 commit을 추가했다.

## 결과
- 원인: 엑셀 row key가 화면 표시명(`이름`, `핸드폰 번호`, `휴대폰 번호`)으로 들어오는데 서버는 내부 key(`name`, `phone`, `phon_num`)만 검사했다. 이 때문에 헤더가 있어도 필수 필드가 비었다고 처리될 수 있었다.
- 추가 원인: 실제 검사 프로필 설정의 휴대폰 key가 `phon_num`인 경우가 있어, 단순히 `휴대폰 번호 -> phone`으로 고정 매핑하면 화면에서 체크한 `핸드폰 번호` 기준과 저장 key가 다시 어긋날 수 있었다.
- 수정 후 직접 등록과 엑셀 등록 모두 RDS에 저장됨을 확인했다.
- 검사 실시 API에서 프로필 확인, 270문항 제출, 제출 row 생성까지 확인했다.
- FAT는 현재 채점 엔진 지원 대상이 아니라 scoring row의 `scoring_status`는 `skipped`, reason은 `unsupported_test_id`로 남는다. 제출 자체는 성공했다.

## 검증 내용
- `frontend/package.json`: `xlsx` 의존성 반영 확인
- `frontend/package-lock.json`: `xlsx` lockfile 반영 확인
- `npm --prefix frontend run build`: 통과
- `.venv/bin/python -m py_compile app/repositories/custom_test_repository.py app/services/admin/assessment_links.py`: 통과
- `APP_ENV=local.prod` 서버 health: `db=postgresql`
- RDS 검증용 검사:
  - `child_test.id=36`, 이름 `검증-사전등록-FAT-1780641827758`
  - access token `yem2FQ7jXOnLxvgkfhI2vlFUckYc8C49`
- 엑셀 등록 검증:
  - `match_field_keys=["name","phone"]`에서 `이름`/`휴대폰 번호`, `성명`/`핸드폰번호` 헤더로 2건 등록 성공
  - 실제 UI key `phon_num`에서 `이름`/`핸드폰 번호` 헤더로 1건 등록 성공: `assessment_link_pre_registered_client.id=7`
- 직접 등록 및 검사 실시 검증:
  - 실제 UI key `phon_num` 직접 등록 row: `assessment_link_pre_registered_client.id=8`
  - 프로필 확인으로 생성된 내담자: `admin_client.id=134`
  - 제출 row: `admin_custom_test_submission.id=59`
  - 채점 row: `submission_scoring_result.id=64`, `scoring_status=skipped`, reason `unsupported_test_id`
- 후속 부유민 검증:
  - 사전등록 row: `assessment_link_pre_registered_client.id=9`, `{"name":"부유민","phon_num":"01049447545"}`
  - validate-profile 통과 확인:
    - `phon_num=01049447545`
    - `phone=01049447545`
    - `핸드폰 번호=01049447545`
    - `phon_num=010-4944-7545`
  - 연결된 provisional client: `admin_client.id=136`
- UI 스크린샷:
  - `artifacts/screenshots/2026-06-05-pre-registered-test-detail-rds-after-phon-num.png`

## 회고
- 분류: Mixed
- 초기 가설처럼 헤더 표시명과 내부 key 불일치가 핵심이었다.
- 추가로 `phone` 하나로만 정규화하면 실제 프로필 field key인 `phon_num` 경로를 다시 깨뜨릴 수 있다는 점은 중간 UI 캡처 후 발견했다.
- 검증 중 로컬 SQLite `modular.db`에는 `test`/`child_test` 데이터가 없어 실사용 흐름 검증이 불가능했고, RDS `local.prod` 모드에서 검증했다.
