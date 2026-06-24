# Execution Plan

## Task Title
- 사전등록 내담자 생년월일 매칭 형식 보정

## Request Summary
- 운영 실시 링크 `QBxWeYuN6Bivdn5h4_5Uk3sJtS9bZwvJ`에서 인적사항을 제대로 입력했는데 `사전 등록되지 않은 내담자` 오류가 발생하는 원인을 확인한다.

## Goal
- 해당 링크의 검사/매칭 설정과 사전등록 데이터를 운영 RDS 기준으로 확인한다.
- 실제 실패 원인을 코드 흐름과 데이터 형식 기준으로 확정한다.
- 필요한 경우 사전등록 매칭 함수를 보정해 수검자 date input 형식과 업로드 데이터 형식 차이로 인한 오탐을 막는다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: `ARCHITECTURE.md`
  - DB: `docs/database/runtime-db.md`
  - UI/디자인: 해당 없음
  - 문서 체계: 해당 없음
  - 설명/디버깅: `docs/debug/explanation-rule.md`
  - 코드 정리 산출물: 해당 없음
- [x] 운영/실행 서버 DB가 필요한 작업이면 `docs/database/runtime-db.md`의 DB 조회 전 확인 규칙 적용
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- 해당 검사는 `pre_registered_only`이고 링크의 확인 기준 필드가 여러 개라서, 사전등록 데이터와 수검자 입력 profile의 key 또는 값 형식이 맞지 않을 가능성이 높다.

## Initial Plan
1. 운영 RDS에서 링크, 검사, 확인 기준 필드, 사전등록 row 수를 확인한다.
2. 공개 assessment payload에서 수검자 profile field key와 input 형식을 확인한다.
3. 매칭 함수를 동일 데이터로 시뮬레이션해 실패 원인을 확정한다.
4. 생년월일 형식 차이라면 매칭 함수에서 date 계열 key를 숫자 비교로 보정한다.
5. 컴파일과 함수 단위 매칭 검증을 수행한다.

## Progress Updates
### Update 1
- Time: 2026-06-22
- Change: 운영 RDS 확인 결과 링크 id 38, 검사 id 39, `pre_registered_only`, 확인 기준 `name`, `birth_day`, `phon_num`, 사전등록 400건임을 확인.
- Reason: 에러가 링크/검사 설정 때문인지 사전등록 데이터 때문인지 구분하기 위해서다.

### Update 2
- Time: 2026-06-22
- Change: 공개 assessment payload에서 `birth_day`가 `type: date`로 내려가는 것을 확인.
- Reason: 브라우저 date input은 `YYYY-MM-DD`로 전송되므로 업로드 데이터 형식과 비교가 필요하다.

### Update 3
- Time: 2026-06-22
- Change: 사전등록 row의 `birth_day=YYYYMMDD`와 수검자 profile의 `birth_day=YYYY-MM-DD` 조합으로 매칭 함수가 `None`을 반환함을 확인.
- Reason: 실패 원인을 데이터 형식 차이로 확정하기 위해서다.

### Update 4
- Time: 2026-06-22
- Change: 사전등록 매칭 함수에서 생년월일/date 계열 key를 숫자 8자리로 정규화해 비교하도록 수정.
- Reason: 업로드 데이터의 `YYYYMMDD`와 브라우저 date input의 `YYYY-MM-DD`를 같은 값으로 처리하기 위해서다.

### Update 5
- Time: 2026-06-22
- Change: 운영 RDS 샘플 row로 동일 매칭 함수 재검증 및 운영 API 프로세스 재기동 확인.
- Reason: 실제 링크에서 같은 오류가 재발하지 않게 런타임 반영 상태를 확인하기 위해서다.

## Result
- 완료.
- 원인: 해당 링크는 `pre_registered_only`이고 확인 기준이 `name`, `birth_day`, `phon_num`인데, 사전등록 데이터의 생년월일은 `YYYYMMDD`, 수검자 화면 date input 값은 `YYYY-MM-DD`라 기존 문자열 비교에서 불일치했다.
- 조치: 사전등록 매칭 함수에서 birth/date 계열 key는 숫자만 추출한 8자리 값으로 비교하도록 수정했다.

## Verification
- Checked:
  - 운영 RDS에서 링크 id 38, 검사 id 39, 사전등록 400건, 확인 기준 `["name", "birth_day", "phon_num"]` 확인.
  - 공개 assessment payload에서 `birth_day`가 `type: date`, `phon_num`이 `type: phone`으로 내려가는 것 확인.
  - 수정 전 동일 샘플에서 `birth_day=YYYY-MM-DD` profile이 `matched=None`임을 확인.
  - 수정 후 동일 샘플에서 `matched=21`로 정상 매칭됨을 확인.
  - `python3 -m compileall app/repositories/custom_test_repository.py` 통과.
  - `npm run ec2:api` 재기동 시도 후 현재 `8120` 프로세스가 PostgreSQL에 붙고 최신 빌드 JS를 서빙하는 것 확인.
- Not checked:
  - 실제 수검자 브라우저에서 로그인 없는 검사 전체 제출 E2E는 개인정보/운영 제출 side effect 때문에 수행하지 않았다.

## Retrospective
### Classification
- 기능 버그

### What Was Wrong
- 사전등록 내담자 매칭에서 생년월일을 일반 문자열로 비교했다.

### Why
- 사전등록 엑셀/업로드 값은 `YYYYMMDD`로 저장될 수 있고, 수검자 화면 date input은 `YYYY-MM-DD`로 전송되는데 이 형식 차이를 정규화하지 않았다.

### Next Time
- 사전등록 매칭 기준 필드는 phone/date처럼 입력 UI와 업로드 데이터 형식이 달라질 수 있는 필드부터 정규화 규칙을 명시한다.

## Related Documents
- [AGENTS.md](../../AGENTS.md)
- [docs/database/runtime-db.md](../database/runtime-db.md)
