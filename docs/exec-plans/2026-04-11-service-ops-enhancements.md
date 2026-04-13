# Execution Plan

## Task Title
- React 관리자 서비스 운영성 보강

## Goal
- 로그인 guard는 보류한다.
- 검사 생성 UX 요약/미리보기, 내담자-검사 배정 흐름, 진행 상태 모니터링, 결과/리포트 진입을 순서대로 보강한다.

## Initial Hypothesis
- 현재 필요한 API는 대부분 존재한다.
- 검사 생성 요약은 `TestManagement.tsx`의 선택 상태로 계산할 수 있다.
- 내담자 배정은 기존 `POST /api/admin/clients/{client_id}/assignments`, `DELETE /api/admin/clients/{client_id}/assignments/{custom_test_id}`, `POST /api/admin/custom-tests/{custom_test_id}/access-link`를 활용한다.
- 진행 상태는 `/api/admin/dashboard`가 이미 `tests`, `stats`, `clients`를 내려주므로 React 대시보드에서 운영 패널을 추가한다.
- 결과/리포트 진입은 `/admin/artifact-viewer?report=...&id=...` 링크를 ClientResult에 추가한다.

## Plan
1. 검사 생성 모달에 선택 검사/척도/실시구간/추가 인적사항/예상 제출 요약 패널 추가
2. 내담자 상세에 배정 가능한 검사 선택, 배정 추가, URL 복사 버튼 추가
3. 대시보드에 운영 검사 진행률, 최근 실시 추이, 미실시 내담자 바로가기 추가
4. 결과 화면에 GOLDEN/STS 리포트 바로가기와 결과 상태 안내 추가
5. 빌드/린트/Playwright 화면 검증

## Progress Updates
- 2026-04-11: 계획 작성. 로그인 guard는 이번 범위에서 제외.
- 2026-04-11: 검사 생성 모달에 선택 검사/척도/포함 실시구간/제외 예정/예상 문항/추가 조사사항을 보여주는 구성 요약 패널 추가.
- 2026-04-11: 내담자 상세에서 기존 운영 검사를 선택해 배정하고, 배정된 검사별 URL을 생성/복사할 수 있는 흐름 추가.
- 2026-04-11: 대시보드에 운영 검사 진행률과 최근 실시 추이 패널 추가.
- 2026-04-11: 내담자 결과 화면에 GOLDEN/STS 리포트 바로가기와 결과 상태 안내 추가.
- 2026-04-11: Playwright로 로그인 후 대시보드, 검사 생성, 내담자 상세, 결과 화면을 캡처해 확인. 내담자 2번에 운영 검사 2번 배정 DB 쓰기까지 확인.

## Result
- 완료.
- 로그인 guard는 사용자 요청에 따라 이번 범위에서 제외했다.
- 검사 생성 화면은 기존 세부 척도 선택과 동일한 선택 모델을 유지하면서 구성 요약을 추가했다.
- 내담자 상세 화면에서 검사 배정과 배정 URL 진입점을 바로 처리할 수 있게 했다.
- 대시보드는 운영 검사 진행률과 최근 실시 추이를 한 화면에서 확인하도록 보강했다.
- 결과 화면은 리포트 진입 버튼과 결과 준비/채점 대기 상태를 함께 보여준다.

## Verification
- Checked:
  - `npm run lint`
  - `npm run build`
  - Playwright 로그인 후 화면 캡처
    - `artifacts/screenshots/2026-04-11-service-dashboard-ops.png`
    - `artifacts/screenshots/2026-04-11-service-create-summary.png`
    - `artifacts/screenshots/2026-04-11-service-client-assignment.png`
    - `artifacts/screenshots/2026-04-11-service-client-result-report-links.png`
  - 운영 DB `admin_client_assignment`에 `admin_client_id=2`, `admin_custom_test_id=2` 배정 생성 확인.
- Not checked:
  - 로그인 guard 적용은 이번 범위에서 제외.

## Retrospective
- 핵심 API는 이미 존재했기 때문에 프런트 흐름 연결과 화면 진입점 보강 중심으로 진행했다.
- Playwright 배정 검증 중 메시지 기대 문구를 실제 응답과 다르게 잡아 1회 타임아웃이 있었지만, 서버 로그와 DB 확인 결과 구현 문제가 아니라 검증 스크립트 조건 문제였다.

## Related Documents
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [docs/exec-plans/2026-04-10-react-migration.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/2026-04-10-react-migration.md)
