# Local Report Preview Fallback

## Request Summary
프런트 결과 화면이 잘 수정되었는지 확인하려는 목적에서는 RDS나 실제 제출 데이터가 없어도 `/admin/report/{id}` UI를 볼 수 있어야 한다.

## Goal
- 로컬호스트에서 관리자 결과 API가 401/404 등으로 실패해도 report UI를 mock 데이터로 렌더링한다.
- 운영 도메인에서는 mock fallback이 동작하지 않게 제한한다.
- `http://127.0.0.1:8120/admin/report/47`에서 프런트 결과 화면을 직접 확인할 수 있게 한다.

## Preflight Checklist
- `AGENTS.md` 확인 완료.
- `DESIGN.md` 확인 완료.
- `QUALIT_SCORE.md` 확인 완료.
- `docs/exec-plans/README.md` 확인 완료.

## Initial Hypothesis
현재 report 화면은 데이터 fetch 실패 시 error UI만 렌더링하므로, 실제 report UI 검증이 DB 상태에 묶인다. 로컬호스트 한정 mock fallback을 두면 프런트 검증과 데이터 검증을 분리할 수 있다.

## Plan
1. `ReportPage.tsx`에 로컬 프리뷰 fixture를 추가한다.
2. admin mode에서 로컬호스트 API 실패 시 fixture를 사용한다.
3. 빌드 후 `/admin/report/47` 실제 렌더링을 확인한다.
4. 스크린샷으로 UI 확인 결과를 남긴다.

## Changes During Work
- `ReportPage.tsx`에 `LOCAL_REPORT_PREVIEW` fixture를 추가했다.
- `localhost` 또는 `127.0.0.1`의 admin report 화면에서 API 실패 시 fixture를 렌더링하도록 fallback을 추가했다.
- fallback은 `mode === "admin"`에서만 동작한다.

## Result
- `http://127.0.0.1:8120/admin/report/47`에서 RDS나 로컬 제출 데이터 없이 결과 프론트 UI가 렌더링된다.
- API가 401/404/네트워크 오류를 반환해도 로컬호스트 admin report에서는 fixture 기반 화면을 표시한다.

## Verification
- `npm run build:frontend` 성공.
- `http://127.0.0.1:8120/admin/report/47` HTML이 새 asset `/assets/index-D_5KBbs4.js`를 참조하는 것 확인.
- 빌드 asset에 fixture 문자열이 포함된 것 확인.
- Playwright 데스크톱 렌더링 확인 및 스크린샷 저장: `artifacts/screenshots/2026-05-26-local-report-preview.png`.
- Playwright 모바일 폭 렌더링 확인 및 스크린샷 저장: `artifacts/screenshots/2026-05-26-local-report-preview-mobile.png`.

## Retrospective
- 이전 대응은 프런트 검증 목적과 데이터 검증 목적을 분리하지 못했다.
- 결과 UI 검증은 DB/RDS 상태와 무관하게 가능해야 하며, 실제 데이터 연동 검증은 별도 단계로 봐야 한다.
