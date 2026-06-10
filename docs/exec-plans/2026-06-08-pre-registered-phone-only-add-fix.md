# Execution Plan

## Task Title
- 사전 등록 내담자 휴대폰 번호 단독 추가 실패 수정

## Request Summary
- 검사 링크 상세의 사전 등록 내담자 관리 카드에서 확인 기준 필드를 휴대폰 번호만 선택하고 값을 입력한 뒤 추가하면 등록되지 않는 문제를 확인하고 수정한다.
- 이어서 확인 기준 필드 저장 버튼 제거, 사전 등록 중복 메시지 구체화, 미응답 제출 확인 UX 강화를 반영한다.

## Goal
- 관리자가 기준 필드를 변경한 직후 별도 저장 버튼을 누르지 않아도, 내담자 추가와 엑셀 업로드가 현재 화면의 기준 필드 기준으로 동작하게 한다.
- 별도 저장 버튼 없이 자동 반영되는 흐름을 명확히 하고, 실패/주의 상황에서 사용자가 무엇을 해야 하는지 바로 알 수 있게 한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: 현재 변경은 프론트 호출 흐름 중심이며 기존 계층을 유지
  - DB: 기존 스키마 변경 없음
  - UI/디자인: `DESIGN.md`, `QUALIT_SCORE.md` 확인
  - 문서 체계: 새 실행계획은 `docs/exec-plans/README.md` 기준으로 작성
  - 설명/디버깅: `docs/debug/explanation-rule.md` 확인
  - 코드 정리 산출물: 해당 없음
- [x] 운영 DB가 필요한 작업이면 루트 `modular.db` 기준 확인: 운영 DB 직접 조작 없음
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- 프론트의 `matchFieldKeys` 상태는 즉시 바뀌지만, 사전 등록 POST API는 DB에 저장된 `link.match_field_keys_json`을 다시 읽는다.
- 사용자가 `기준 필드 저장`을 누르지 않고 바로 `추가`를 누르면 DB 기준 필드는 여전히 `["name"]`이라서 백엔드가 이름 누락 오류를 반환한다.

## Initial Plan
1. `TestDetail.tsx`에서 기준 필드 저장 로직을 재사용 가능한 함수로 분리한다.
2. `handleAddEntry`와 엑셀 업로드 처리 전에 현재 `matchFieldKeys`를 먼저 저장한다.
3. 프론트 빌드로 타입/번들 오류를 확인하고, 가능하면 UI 화면 확인을 진행한다.

## Progress Updates
### Update 1
- Time: 2026-06-08
- Change: 실행계획 작성 및 원인 분석 완료
- Reason: 코드 수정 전 계획과 검증 기준을 남기기 위함

### Update 2
- Time: 2026-06-08
- Change: `TestDetail.tsx`에서 기준 필드 저장 API 호출을 `saveMatchKeysToServer`로 분리하고, 내담자 추가/엑셀 업로드 직전에 현재 `matchFieldKeys`를 먼저 저장하도록 수정
- Reason: 사용자가 `기준 필드 저장`을 별도로 누르지 않고 바로 `추가`를 누르면 백엔드가 이전 기준 필드(`name`)로 검증하는 문제를 제거하기 위함

### Update 3
- Time: 2026-06-08
- Change: 확인 기준 필드 저장 버튼을 제거하고 자동 반영 안내 문구로 대체
- Reason: 저장 버튼과 추가 버튼이 공존하면 사용자가 어떤 버튼을 먼저 눌러야 하는지 헷갈릴 수 있기 때문

### Update 4
- Time: 2026-06-08
- Change: 사전 등록 중복 오류에 기준 필드 값을 포함하고, 엑셀 업로드 중복 행도 errors에 표시하도록 수정
- Reason: 운영자가 어떤 값 때문에 실패했는지 바로 파악할 수 있게 하기 위함

### Update 5
- Time: 2026-06-08
- Change: 수검자 미응답 제출 확인 모달에 미응답 개수, 빨간 경고 배지, 문항 번호 바로 이동, `미응답 N개 남기고 제출` CTA를 추가
- Reason: 무응답 제출 허용 상태에서도 실수 제출을 줄이고, 미응답 위치를 강하게 드러내기 위함

## Result
- 사전 등록 내담자 추가와 엑셀 업로드가 현재 화면에서 선택한 확인 기준 필드를 먼저 서버에 반영한 뒤 등록 API를 호출하도록 수정했다.
- 휴대폰 번호만 체크한 상태에서 바로 추가해도 백엔드의 `match_field_keys_json`이 먼저 `["phone"]` 계열 값으로 갱신되도록 했다.
- 확인 기준 필드 저장 버튼을 제거하고 자동 반영 안내로 단순화했다.
- 중복 사전 등록 오류는 `이미 등록된 내담자입니다. (휴대폰 번호=010...)`처럼 기준 값을 포함한다.
- 미응답 제출 허용 모달은 미응답 개수와 문항 번호 이동을 명확히 보여준다.

## Verification
- Checked:
  - `npm --prefix frontend run build` 성공
  - `.venv/bin/python -m py_compile app/services/admin/assessment_links.py` 성공
  - `frontend/dist/assets/index-BM5g1a96-v2.js`에 기준 필드 저장 후 사전 등록 POST를 호출하는 순서 반영 확인
- Not checked:
  - 실제 브라우저에서 사전 등록 내담자 추가 버튼 클릭 및 수검자 미응답 모달 스크린샷 검증은 미실행. `8120` 포트에 이미 실행 중인 서버가 있고 `/health` 기준 DB가 `postgresql`이라 운영성 데이터 변경 위험을 피했다.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 프론트 화면 상태의 기준 필드와 백엔드 DB에 저장된 기준 필드가 분리되어 있었다.
- 기준 필드를 휴대폰 번호만 선택해도 `기준 필드 저장`을 누르지 않으면 사전 등록 POST API는 기존 DB 값인 `["name"]` 기준으로 검증했다.

### Why
- `handleAddEntry`와 `handleExcelUpload`가 현재 `matchFieldKeys`를 저장하지 않고 바로 `/pre-registered` 또는 `/pre-registered/bulk`를 호출했다.

### Next Time
- 화면에서 기준 설정과 실행 액션이 같은 카드 안에 있을 때는 실행 액션 전에 현재 설정을 자동 저장하거나, 저장되지 않은 설정 상태를 명확히 막아야 한다.

## Related Documents
- [Documentation Hub](/home/ubuntu/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/home/ubuntu/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/home/ubuntu/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/home/ubuntu/workspace/2.0-modular/AGENTS.md)
