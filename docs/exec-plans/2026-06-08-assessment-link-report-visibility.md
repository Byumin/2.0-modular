# Execution Plan

## Task Title
- 검사 실시 링크 결과 제공 여부 옵션 추가

## Request Summary
- 검사 실시 링크 생성 시 결과가 제공되는 링크인지 선택할 수 있게 한다.
- 결과 제공이 꺼진 링크로 제출한 수검자는 제출 완료 화면에서 `결과 보기` 버튼이 없어야 한다.

## Goal
- 링크 단위로 수검자 결과 접근 UI를 제어한다.
- 기존 링크는 현재 동작을 보존하기 위해 기본값을 결과 제공으로 유지한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: 기존 access link option 패턴 확인
  - DB: startup schema migration 패턴 확인
  - UI/디자인: `DESIGN.md` 확인
  - 문서 체계: `docs/exec-plans/README.md` 확인
  - 설명/디버깅: 현재 코드 흐름 기준으로 추적
  - 코드 정리 산출물: 해당 없음
- [x] 운영 DB 직접 조작 없음. startup migration으로 컬럼 보강
- [x] 검증 방법: 프론트 빌드, Python compile, 관련 문자열/타입 경로 확인

## Initial Hypothesis
- 기존 `allow_unanswered_submission`과 같은 링크 옵션으로 `show_report_result` boolean을 두면 가장 일관적이다.
- 제출 API는 기존처럼 report token을 반환하되, 프론트 완료 화면에서 버튼 노출만 제어하면 요구사항을 충족한다.

## Initial Plan
1. `child_test`, `admin_custom_test_access_link`에 결과 제공 기본값 컬럼을 추가한다.
2. 검사 생성 payload, 링크 생성, 링크 상세 옵션 저장 API에 결과 제공 플래그를 연결한다.
3. 수검자 초기 payload 및 제출 응답에 결과 제공 여부를 내려준다.
4. `CompleteStep`에서 결과 제공이 켜진 경우에만 `결과 보기` 버튼을 표시한다.
5. 빌드/compile 검증을 수행한다.

## Progress Updates
### Update 1
- Time: 2026-06-08
- Change: 실행계획 작성
- Reason: DB/API/UI 변경이 함께 들어가는 작업이므로 변경 전 계획 기록

### Update 2
- Time: 2026-06-08
- Change: `child_test`, `admin_custom_test_access_link`에 `show_report_result` 기본값 컬럼과 startup migration 추가
- Reason: 검사 생성 기본값과 링크 단위 결과 제공 옵션을 모두 보존하기 위함

### Update 3
- Time: 2026-06-08
- Change: 검사 생성 payload, 링크 생성, 링크 상세 옵션 저장 API, 수검자 payload, 제출 응답에 `show_report_result` 연결
- Reason: 관리자 설정이 수검자 완료 화면까지 일관되게 전달되어야 함

### Update 4
- Time: 2026-06-08
- Change: 완료 화면, 기존 결과 보기 버튼, 연구 안내/검사 안내 문구를 결과 제공 여부에 맞춰 조건부 표시
- Reason: 결과 제공이 꺼진 링크에서 수검자에게 결과 확인을 약속하거나 버튼을 보여주지 않기 위함

## Result
- 검사 생성 시 `제출 완료 후 수검자에게 결과 보기 버튼 제공` 옵션을 선택할 수 있다.
- 링크 상세의 링크 옵션에서도 `제출 후 결과 보기 제공`을 변경할 수 있다.
- 결과 제공이 꺼진 링크에서는 제출 응답이 수검자에게 report access token을 반환하지 않고, 제출 완료 화면의 `결과 보기` 버튼도 표시하지 않는다.
- 결과 제공이 꺼진 링크에서는 과거 실시 내역/재검사 모달의 결과 보기 버튼과 일부 결과 확인 안내 문구도 숨기거나 대체한다.

## Verification
- Checked:
  - `.venv/bin/python -m py_compile app/db/models.py app/db/schema_migrations.py app/main.py app/repositories/custom_test_repository.py app/router/custom_test_router.py app/schemas/custom_tests.py app/services/admin/assessment_links.py app/services/admin/custom_tests.py` 성공
  - `npm --prefix frontend run build` 성공
- Not checked:
  - 실제 브라우저 클릭/스크린샷 검증은 미실행. 현재 `8120` 서버가 `postgresql` DB를 보고 있어 실제 링크 생성/제출 검증은 운영성 데이터 변경 위험이 있다.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 기존 완료 화면은 `submission_id`와 `access_token`이 있으면 항상 `결과 보기` 버튼을 보여줬다.

### Why
- 링크 단위 결과 제공 정책을 저장하거나 수검자 화면에 전달하는 옵션이 없었다.

### Next Time
- 수검자에게 보이는 CTA는 링크 정책 옵션과 같은 데이터 소스에서 조건부 렌더링되도록 처음부터 설계한다.
