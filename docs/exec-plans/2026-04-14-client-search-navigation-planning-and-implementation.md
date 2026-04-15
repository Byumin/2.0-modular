# Execution Plan

## Task Title
- 내담자 검색/탐색 기획 및 스펙 정리 후 구현

## Request Summary
- 내담자 검색 영역이 현재 내담자 특성을 충분히 반영하지 못하고, 검사별 목록도 커스텀 검사와 실시 내담자가 늘어나면 찾아보기 힘들다는 문제를 기준으로 기획 문서와 스펙 문서를 만들고 진행한다.

## Goal
- 내담자 관리 검색/탐색 개선의 기획 문서와 구현 스펙 문서를 작성한다.
- 기존 기능 문서 허브에 새 문서 링크를 연결한다.
- 문서화한 방향에 맞춰 현재 React SPA 내담자 관리 화면과 API를 단계적으로 구현한다.

## Initial Hypothesis
- 현재 `GET /api/admin/clients` 중심 목록은 내담자 중심 탐색에는 쓸 수 있지만, 검사 운영 현황 중심 탐색에는 부족하다.
- 검사별 보기는 검사 목록 요약과 선택한 검사 내 내담자 목록을 분리해야 커스텀 검사 수 증가에 대응할 수 있다.
- 통합 검색과 상세 필터를 분리하고, 검사별 현황 API를 별도로 두는 것이 장기적으로 관리하기 쉽다.

## Initial Plan
1. 문서 거버넌스 기준에 따라 새 문서 역할과 source of truth를 명확히 정한다.
2. `docs/features/client-search-navigation-plan.md`에 기획 문서를 만든다.
3. `docs/features/client-search-navigation-spec.md`에 API/UI/상태/단계별 구현 스펙을 만든다.
4. `docs/features/README.md`와 `docs/features/client-management.md`에 새 문서 링크를 추가한다.
5. 검사별 현황 API와 React 화면을 스펙 1차 범위로 구현한다.
6. 빌드/린트와 UI 스크린샷으로 확인한다.

## Progress Updates
### Update 1
- Time: 2026-04-14 21:14:39 KST
- Change: 문서 역할과 작업 순서를 확정했다.
- Reason: 새 문서 추가가 들어가므로 중복 문서를 만들지 않고 기존 기능 문서 허브에 연결하기 위해서다.

### Update 2
- Time: 2026-04-14 21:21:01 KST
- Change: 기획 문서와 스펙 문서를 추가하고, `GET /api/admin/client-test-overview` 및 검사별 현황 요약 UI를 구현했다.
- Reason: 검색/탐색 문제를 문서 기준으로 고정한 뒤, 1차 구현 범위인 검사 현황 요약과 선택 검사 내담자 목록을 반영하기 위해서다.

## Result
- [docs/features/client-search-navigation-plan.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-search-navigation-plan.md)를 추가했다.
- [docs/features/client-search-navigation-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-search-navigation-spec.md)를 추가했다.
- 기능 허브와 내담자 관리 문서에 새 문서 링크를 추가했다.
- `GET /api/admin/client-test-overview`를 추가했다.
- 검사별 화면을 검사 현황 요약 테이블과 선택 검사 내담자 목록으로 분리했다.

## Verification
- Checked:
  - `.venv/bin/python -m compileall app/router/client_router.py app/services/admin/clients.py`
  - `npm run build`
  - `npm run lint` (`badge.tsx`, `button.tsx`, `sidebar.tsx` 기존 fast-refresh 경고 3건만 남음)
  - `git diff --check`
  - Playwright 세션에서 `GET /api/admin/client-test-overview` 응답 확인
  - 스크린샷: `artifacts/screenshots/client-search-navigation-client-view-after.png`
  - 스크린샷: `artifacts/screenshots/client-search-navigation-test-overview-after.png`
- Not checked: 대량 커스텀 검사/대량 내담자 데이터 기준 성능 측정.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 기존 검색/검사별 보기 개선 작업이 기능 동작 위주였고, 내담자 특성 기반 탐색과 검사 운영 현황 탐색의 제품 기준이 문서로 분리되어 있지 않았다.

### Why
- React 전환 과정에서 목록 화면의 정보 구조보다 기능 복원과 API 연결이 우선되었기 때문이다.

### Next Time
- 검색/탐색 UI를 바꿀 때는 제품 기획 문서와 API/UI 스펙 문서를 먼저 만들고, 구현은 phase 단위로 제한한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
