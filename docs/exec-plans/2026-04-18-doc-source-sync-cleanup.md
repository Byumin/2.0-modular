# Execution Plan

## Task Title
- 문서 source-of-truth 싱크 및 과상세 정리

## Request Summary
- 현재 문서가 실제 소스 구조와 맞는지 검토한 결과를 바탕으로, 충돌된 route/API/DB 설명과 과도하게 상세한 문서 규칙을 정리한다.

## Goal
- 운영 기준 문서가 현재 코드 구조와 맞도록 갱신한다.
- source-of-truth 문서와 허브/운영 문서의 역할 중복을 줄인다.
- 과거 실행 계획 문서는 역사 기록으로 유지하되, 현재 기준 문서와 혼동되지 않도록 한다.

## Initial Hypothesis
- 핵심 구조 설명은 대체로 맞지만 `/report` route, 개인정보동의 API, DB startup 보정, schema overview, DB asset inventory 일부가 현재 코드와 어긋나 있다.
- `docs/interactive-flow-spec.md`와 `docs/code-cleanup/playbook.md` 사이에는 상세 품질 기준 반복이 있어 역할 경계를 조정할 필요가 있다.

## Initial Plan
1. `AGENTS.md`, `ARCHITECTURE.md`, `report-dashboard.md`, `privacy-consent-spec.md`의 route/API 충돌을 바로잡는다.
2. `runtime-db.md`, `schema-overview.md`, `assets-inventory.md`를 현재 `app/main.py`, `models.py`, 파일 목록 기준으로 갱신한다.
3. `interactive-flow-spec.md`, `code-cleanup/playbook.md`, `design-system.md`에서 과도하게 상세하거나 중복된 내용을 줄인다.
4. `docs/exec-plans/README.md`에 과거 계획 문서의 해석 기준을 추가한다.
5. 검색으로 오래된 표현 잔여를 확인한다.

## Progress Updates
### Update 1
- Time: 2026-04-18
- Change: 계획 문서 작성.
- Reason: 문서 체계 변경은 작업 전 실행 계획을 남긴다는 저장소 규칙을 따른다.

### Update 2
- Time: 2026-04-18
- Change: route/API/DB 기준 문서와 코드 정리/디자인 문서의 과상세 항목을 갱신했다.
- Reason: 실제 소스와 다른 `/report`, 개인정보동의 API, DB startup/schema/assets 설명을 바로잡고, 운영 문서와 원칙 문서의 중복을 줄이기 위해서다.

## Result
- `/report` 공개 browser route를 `/report/{submissionId}?token={accessToken}` 기준으로 통일했다.
- 개인정보동의 수검자 API 경로를 실제 `/api/assessment-links/{access_token}/consent` 기준으로 수정했다.
- DB runtime/schema/assets 문서를 현재 `app/main.py`, `app/db/models.py`, 실제 파일 목록 기준으로 갱신했다.
- `docs/exec-plans/README.md`에 날짜별 실행 계획은 현재 기준이 아니라 역사 기록이라는 해석 규칙을 추가했다.
- `docs/code-cleanup/playbook.md`와 `docs/design/design-system.md`의 과도한 구현 상세를 줄였다.
- 주요 source-of-truth 문서의 `/mnt/c/...` 절대 링크를 상대 링크로 정리했다.

## Verification
- Checked:
  - `git diff --check -- ...` 통과
  - `rg '/report/\{token\}|/api/assessment/custom/.+consent|_INTERPRETATIONS|legacy_parent\.db|검사 결과 탭 제거|TestManagement.*검사 결과' ...` 결과 없음
  - 주요 source 문서 범위에서 `/mnt/c/Users/user/workspace/2.0-modular` 잔여 검색 결과 없음
  - `python3 -m compileall app` 통과
  - `npm ci --force --cache /tmp/npm-cache-2-modular` 통과
  - `npm run build` 통과
- Not checked:
  - `npm run lint`는 문서 변경과 무관한 기존 React 소스 lint 에러로 실패
    - `frontend/src/pages/report/ReportPage.tsx:614`의 ternary side-effect expression
    - 기존 Fast Refresh warning 3건: `badge.tsx`, `button.tsx`, `sidebar.tsx`
  - 서버/프런트 브라우저 런타임 테스트는 실행하지 않음

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 일부 문서가 이전 구현 기준(`/report/{token}`, 과거 동의 API 경로, 짧은 DB startup 목록)을 유지하고 있었다.
- 일부 운영 문서가 구현 세부값까지 source-of-truth처럼 담고 있었다.

### Why
- 기능이 단계적으로 구현되면서 source-of-truth 문서 갱신이 일부 누락되었다.
- 실행 계획 문서의 과거 기록과 현재 기준 문서의 역할 구분이 충분히 명시되어 있지 않았다.

### Next Time
- 기능 변경 시 route/API/DB startup/schema 문서를 같은 작업 범위에서 함께 검색 검증한다.
- 구현 세부 CSS/grid 값은 디자인 시스템에 고정하지 않고 실제 컴포넌트를 기준으로 확인하도록 둔다.

## Related Documents
- [Documentation Hub](../README.md)
- [docs/exec-plans/README.md](README.md)
- [QUALIT_SCORE.md](../../QUALIT_SCORE.md)
- [AGENTS.md](../../AGENTS.md)
