# Execution Plan

## Task Title
- Skip client link confirmation modal for unassigned assessment link entries

## Request Summary
- 검사 실시 링크에서 새 내담자 인적정보가 들어올 때, 미리 배정되지 않은 내담자에 대해 뜨는 `내담자 연결 확인` 모달을 항상 `예`로 처리해 생략 가능한지 확인하고 반영한다.

## Goal
- 새 인적정보 제출 시 사용자가 추가 확인 모달을 거치지 않고 기존 `예` 동작과 동일하게 검사 시작 흐름으로 진행한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: 부분 확인 예정
  - DB: 해당 없음으로 판단, 필요 시 확인
  - UI/디자인: 시각 변경이 아니라 흐름 변경으로 판단
  - 문서 체계: 해당 없음
  - 설명/디버깅: 해당 없음
  - 코드 정리 산출물: 해당 없음
- [x] 운영 DB가 필요한 작업이면 루트 `modular.db` 기준 확인: 운영 DB 직접 작업 없음
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- 모달은 React 수검자 화면에서 클라이언트 매칭 API 응답에 따라 열리며, `예` 버튼 핸들러가 이미 존재할 가능성이 높다. 해당 분기에서 모달 상태를 만들지 않고 같은 핸들러를 바로 호출하면 된다.

## Initial Plan
1. 수검자 custom assessment 화면에서 `내담자 연결 확인` 모달과 `예` 핸들러 위치를 찾는다.
2. 미배정 내담자 분기에서 모달을 생략하고 기존 승인 함수로 자동 진행하도록 수정한다.
3. 타입/빌드 또는 관련 테스트를 실행하고 결과를 기록한다.

## Progress Updates
### Update 1
- Time: 2026-06-01
- Change: 실행계획 생성.
- Reason: 코드 변경 작업 지침 준수.

### Update 2
- Time: 2026-06-01
- Change: `AssessmentPage.tsx`에서 `내담자 연결 확인` 모달 상태/렌더링을 제거하고, `AUTO_CREATE_CONFIRM_REQUIRED_CODE` 응답 시 `/register-client`를 자동 호출한 뒤 재검증하도록 변경.
- Reason: 기존 모달의 `예` 버튼 동작과 동일한 흐름을 사용자 확인 없이 수행하기 위함.

## Result
- 수검자 인적정보 검증에서 미배정/불일치 auto-create 확인 코드가 오면 `내담자 연결 확인` 모달을 띄우지 않고 기존 `예` 버튼과 동일하게 내담자 등록/검사 배정을 자동 실행한다.
- 모호 매칭(`내담자 확인`) 모달은 후보 선택이 필요한 별도 흐름이므로 유지했다.

## Verification
- Checked: `npm run build:frontend` 성공.
- Not checked: 실제 브라우저 E2E 흐름은 테스트 데이터/링크가 필요해 미실행.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 사용자가 항상 `예`를 선택하는 운영 흐름에서는 미배정 내담자 확인 모달이 불필요한 추가 클릭을 만들고 있었다.

### Why
- 기존 구현은 auto-create 허용 검사에서도 백엔드가 확인 필요 코드를 반환하면 프론트가 수동 확인 모달을 열도록 되어 있었다.

### Next Time
- 확인이 의미 있는 분기와 단순 승인 분기를 구분해, 필요한 경우에만 사용자 선택 UI를 유지한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
