# Execution Plan

## Task Title
- 커스텀 검사 생성 시 누락 척도 실시구간 제외 확인 흐름 추가

## Request Summary
- 커스텀 검사 생성 시 관리자가 선택한 척도가 일부 실시구간에 없으면 사용자에게 확인을 받고, 해당 실시구간을 제외한 뒤 생성하도록 수정한다.
- 구현 후 코드 리뷰까지 수행해 결과를 정리한다.

## Goal
- 선택 척도가 없는 실시구간을 서버가 자동으로 전체 척도로 확장하지 않도록 막는다.
- 생성 직전 프론트에서 누락 실시구간을 명시적으로 보여주고, 사용자 동의 시 해당 실시구간만 제외해서 생성한다.
- 서버도 동일한 규칙으로 재검증해 프론트 우회나 오동작 시 잘못된 저장이 발생하지 않게 한다.

## Initial Hypothesis
- 현재 생성 UI는 이미 모달 기반이므로, 별도 확인 모달을 추가하는 방식이 기존 UX와 가장 잘 맞는다.
- 생성 payload에 `excluded_variants` 같은 확인 결과를 포함하면 서버가 자동 확장 대신 명시적 제외만 허용하도록 바꿀 수 있다.
- 현재 저장소의 `modular.db` 데이터에서는 즉시 재현 케이스가 많지 않아도, 코드상 fallback 제거와 제외 처리만으로 문제를 차단할 수 있다.

## Initial Plan
1. 실행 계획 문서를 작성하고 생성 화면/생성 서비스 흐름을 재확인한다.
2. 프론트엔드에 누락 실시구간 계산, 확인 모달, 제외 정보 포함 요청을 구현한다.
3. 백엔드에서 자동 확장을 제거하고 제외된 실시구간만 저장하도록 스키마와 서비스를 수정한다.
4. 생성 흐름을 검증하고 코드 리뷰 관점에서 회귀 위험을 점검한다.

## Progress Updates
### Update 1
- Time: 2026-04-10 09:53:40 +0900
- Change: 실행 계획 작성 전 생성 화면 모달 구조와 현재 생성 서비스 흐름을 확인했다.
- Reason: 확인 모달 추가 위치와 서버 변경 범위를 먼저 좁혀야 안전하게 수정할 수 있기 때문이다.

### Update 2
- Time: 2026-04-10 10:00:12 +0900
- Change: 생성 폼에 실시구간 제외 확인 모달을 추가하고, payload에 `excluded_sub_test_jsons`를 넣도록 프론트/백엔드를 함께 수정했다. 서버에서는 누락 척도 구간 자동 확장을 제거하고, 명시적으로 제외된 구간만 skip하도록 변경했다.
- Reason: 프론트 확인만으로는 우회 요청이나 회귀를 막을 수 없으므로, UI와 저장 로직을 동시에 맞춰야 했다.

### Update 3
- Time: 2026-04-10 10:24:41 +0900
- Change: Claude 리뷰 지적 1번과 2번을 반영해 `AdditionalProfileFieldIn`에 선택형 옵션 필수 검증을 추가하고, `excluded_sub_test_jsons` 비교를 canonical JSON 문자열 비교로 보강했다.
- Reason: 선택형 추가 인적사항의 모호한 400 에러와 실시구간 제외 매칭의 문자열 포맷 의존을 줄여야 했다.

## Result
- 생성 시 선택 척도가 없는 실시구간이 있으면 바로 저장하지 않고 확인 모달을 띄우도록 변경했다.
- 사용자가 진행을 선택하면 해당 실시구간만 제외한 payload를 서버로 전송한다.
- 서버는 누락 실시구간을 전체 척도로 자동 확장하지 않고, 제외되지 않은 누락 구간은 400 에러로 막는다.
- 선택 척도가 존재하는 실시구간을 임의로 제외하려는 요청도 400 에러로 막는다.
- 선택형 추가 인적사항은 스키마 단계에서 옵션 1개 이상을 강제한다.
- 실시구간 제외 비교는 raw JSON 문자열 대신 canonicalized JSON 문자열로 비교한다.

## Verification
- Checked:
  - `python3 -m py_compile app/schemas/custom_tests.py app/services/admin/custom_tests.py`
  - `node --check static/admin.js`
  - `.venv/bin/python` 스니펫으로 `_resolve_sub_test_variant_configs()`의 세 가지 분기 확인
    - 누락 구간 미확인 시 400
    - 명시적 제외 시 해당 구간만 저장
    - 유효한 구간을 임의 제외 시 400
  - `.venv/bin/python` 스니펫으로 `AdditionalProfileFieldIn(type='select', options=[])` 검증 오류 확인
  - `.venv/bin/python` 스니펫으로 `{\"b\":2,\"a\":1}` / `{\"a\":1,\"b\":2}` canonical 비교 일치 확인
  - `static/admin-create.html`에 확인 모달 마크업 삽입 여부 확인
- Not checked:
  - 브라우저 스크린샷 전/후 검증
  - 실제 `uvicorn` 구동 후 Playwright 기반 E2E
  - 사유: 현재 로컬 가상환경에서 `uvicorn app.main:app` 실행 시 `Router.__init__() got an unexpected keyword argument 'on_startup'` 오류로 서버가 뜨지 않음

## Retrospective
### Classification
- `Execution Judgment Problem`

### What Was Wrong
- UI 변경 요청인데도 수정 전 스크린샷 검증까지 완료하기 전에 구현을 먼저 진행했다.

### Why
- 서버 실행 환경이 즉시 동작할 것이라고 가정하고 구현을 앞당겼고, 런타임 검증 준비를 더 일찍 하지 않았다.

### Next Time
- UI 작업은 수정 전에 서버 실행 상태와 캡처 가능 여부부터 먼저 확인한다.
- 서버 런타임 검증이 막히면 즉시 대체 검증 경로와 한계를 문서에 남긴다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
