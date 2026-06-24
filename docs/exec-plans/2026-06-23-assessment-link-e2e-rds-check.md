# Execution Plan

## Task Title
- Assessment link E2E submission and RDS persistence check

## Request Summary
- 운영 검사 링크에서 인적사항 입력, 문항 응답, 제출까지 정상 진행되는지 확인하고, 제출 결과가 RDS에 저장되는지 확인한다.

## Goal
- 점수 유도 없이 합성 QA 프로필과 기계적 응답값으로 수검 플로우가 끝까지 동작하는지 검증한다.
- 제출 후 RDS 기준 `admin_custom_test_submission` 및 `submission_scoring_result` 저장 여부를 확인한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: `ARCHITECTURE.md`
  - DB: `docs/database/runtime-db.md`
  - UI/디자인: 해당 없음
  - 문서 체계: `docs/doc-governance.md`
  - 설명/디버깅: 이전 흐름에서 `docs/debug/explanation-rule.md` 확인
  - 코드 정리 산출물: 해당 없음
- [x] 운영/실행 서버 DB가 필요한 작업이면 `docs/database/runtime-db.md`의 DB 조회 전 확인 규칙 적용
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- 운영 도메인의 React 수검 화면은 `/api/assessment-links/{token}` 계열 API를 통해 프로필 검증과 제출을 수행한다.
- 제출 성공 시 `admin_custom_test_submission` row가 생기고, 저장 직후 채점 엔진이 `submission_scoring_result` row를 생성한다.

## Initial Plan
1. 운영 URL/API에서 검사 기본 정보와 필수 프로필 필드를 확인한다.
2. Playwright 또는 API를 통해 합성 QA 프로필로 프로필 입력 및 문항 응답 제출을 수행한다.
3. 반환된 `submission_id`를 기준으로 RDS 저장 row와 채점 결과 row 존재를 확인한다.

## Progress Updates
### Update 1
- Time: 2026-06-23
- Change: 작업 시작 전 source-of-truth 문서 확인 완료.
- Reason: 저장소 작업 규칙과 운영 DB 확인 규칙 준수.

### Update 2
- Time: 2026-06-23
- Change: API 기준 QA 제출을 완료하고 `submission_id=83`, `scoring_result_id=91` RDS 저장을 확인했다.
- Reason: 운영 링크 제출/저장/채점 저장의 기본 백엔드 플로우를 먼저 검증했다.

### Update 3
- Time: 2026-06-23
- Change: Playwright로 운영 페이지를 열어 동의 체크, 인적사항 입력, 자동 신규등록, 전체 문항 응답, 최종 제출까지 완료했다.
- Reason: 사용자 브라우저 화면 경로에서 같은 플로우가 실제로 동작하는지 확인하기 위해 API 직접 제출과 별도로 UI E2E를 수행했다.

## Result
- 운영 링크의 수검 플로우는 정상 동작했다.
- API 기준 제출:
  - `client_id=166`
  - `submission_id=83`
  - `scoring_result_id=91`
  - 제출 문항 수 244개
- Playwright UI 제출:
  - `client_id=168`
  - `submission_id=84`
  - `scoring_result_id=92`
  - 제출 문항 수 244개
- 두 제출 모두 RDS PostgreSQL에서 `admin_custom_test_submission`, `submission_scoring_result`, `admin_client`, `admin_client_assignment`, `client_consent_record` 저장이 확인됐다.
- Playwright UI 제출 후 draft row는 남지 않았다.
- 공개 보고서 API도 `submission_id=84` 기준 200 응답과 12개 scale payload를 반환했다.
- 특이사항: 채점 결과는 `K-PSI-4-SF`, `PAT-2`, `PCT`는 `scored`, `PSES`는 `unsupported_test_id`로 `skipped` 처리되어 DB의 `scoring_status`는 `scored,skipped`로 저장된다.

## Verification
- Checked:
  - `AGENTS.md`
  - `docs/database/runtime-db.md`
  - `docs/runtime-run-modes.md`
  - `docs/doc-governance.md`
  - `docs/exec-plans/README.md`
  - 운영 링크 초기 payload 조회
  - 프로필 검증 API
  - 신규 QA 내담자 등록 API
  - 동의 저장 API
  - 제출 API
  - Playwright 브라우저 UI 경로
  - RDS 직접 조회(`APP_ENV=ec2.prod`)
  - 공개 보고서 API
- Not checked:
  - 관리자 화면에서 해당 제출이 목록에 표시되는지 여부

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 제출/저장 플로우 자체의 실패는 발견하지 못했다.
- `PSES`는 채점기 미지원으로 `skipped` 처리된다.

### Why
- `app.services.scoring.tests.registry`에 해당 test id용 scorer가 등록되지 않은 상태로 보인다.

### Next Time
- 채점 완료 상태를 모든 구성 검사에서 `scored`로 기대한다면 `PSES` scorer 지원 여부를 별도 이슈로 확인한다.

## Related Documents
- [Documentation Hub](../README.md)
- [docs/exec-plans/README.md](README.md)
- [AGENTS.md](../../AGENTS.md)
- [docs/database/runtime-db.md](../database/runtime-db.md)
- [docs/runtime-run-modes.md](../runtime-run-modes.md)
