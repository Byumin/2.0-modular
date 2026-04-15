# Execution Plan

## Task Title
- 내담자 목록 검색 스펙 및 검사별 보기 구조 수정

## Request Summary
- 내담자 목록 검색 영역이 현재 프론트 스펙/서비스 정보 구성과 맞는지 검토하고 수정한다.
- 검사별 보기에서 커스텀 검사가 많아질수록 검사 섹션이 계속 아래로 나열되는 구조를 개선한다.

## Goal
- `/api/admin/clients` 목록 API가 검색어, 성별, 상태 필터를 직접 처리하도록 맞춘다.
- 검색어가 이름/메모뿐 아니라 목록에서 의미 있는 그룹, 배정 검사, 태그, 연락처 등 주요 내담자 정보와 맞도록 정리한다.
- 검사별 보기는 모든 검사 그룹을 카드로 누적 렌더링하지 않고, 검사 선택 후 선택한 검사에 속한 내담자만 보여준다.

## Initial Hypothesis
- 현재 프론트는 전체 내담자 목록을 받은 뒤 브라우저에서 일부 필터만 적용하고 있어 API 스펙과 UI 설명이 어긋나 있다.
- 검사별 보기의 누적 카드 구조는 커스텀 검사가 늘어날수록 목록 탐색과 렌더링 비용이 커져서 운영 화면에 맞지 않다.

## Initial Plan
1. 수정 전 내담자 목록 화면과 검사별 보기 화면을 스크린샷으로 확인한다.
2. 실행 계획 문서를 먼저 만들고 작업 중 변경 사항을 갱신한다.
3. 백엔드 `GET /api/admin/clients`에 `q`, `gender`, `status` 쿼리를 추가하고 서비스에서 필터링한다.
4. 프론트 `ClientManagement` 검색/필터 요청을 서버 파라미터 기준으로 변경한다.
5. 검사별 보기를 전체 카드 나열에서 검사 선택 기반 단일 테이블 구조로 변경한다.
6. 빌드/린트와 수정 후 스크린샷으로 결과를 검증한다.

## Progress Updates
### Update 1
- Time: 2026-04-14 20:36:22 KST
- Change: 작업 계획을 작성하고 백엔드/프론트 수정 범위를 확정했다.
- Reason: 검색 스펙 정렬과 검사별 보기 구조 변경이 함께 필요한 UI/API 변경이므로 실행 계획과 회고 근거를 먼저 남긴다.

### Update 2
- Time: 2026-04-14 20:46:56 KST
- Change: 내담자 목록 API에 `q`, `gender`, `status` 필터를 추가하고 프론트 검색/필터를 서버 파라미터 기반으로 변경했다. 검사별 보기는 검사 그룹 전체 카드 나열에서 선택형 단일 테이블 구조로 변경했다.
- Reason: 검색 기준을 서비스 응답 구조와 맞추고, 커스텀 검사가 늘어도 화면이 검사 수만큼 계속 길어지지 않도록 하기 위해서다.

### Update 3
- Time: 2026-04-14 20:55:29 KST
- Change: 좁은 화면에서 헤더와 검사 선택 영역의 텍스트가 한 글자씩 세로로 깨지지 않도록 반응형 배치와 최소 작업 폭을 보정했다.
- Reason: 관리자 테이블 화면은 좁은 모바일 폭에서 완전 재배치보다 작업 가능한 최소 폭을 유지하는 편이 데이터 가독성에 더 맞다.

## Result
- `/api/admin/clients`는 `group_id`, `q`, `gender`, `status` 쿼리를 받아 서버에서 필터링한다.
- 검색어는 이름, 성별, 생년월일, 연락처, 주소, 메모, 태그, 그룹명, 배정 커스텀 검사명, 기반 검사명, 상태, 실시일을 대상으로 맞춘다.
- 프론트 목록 검색은 클라이언트 내부 필터링을 제거하고 API 파라미터로 요청한다.
- 검사별 보기는 선택한 검사 하나의 내담자 테이블만 렌더링한다.

## Verification
- Checked:
  - 수정 전 스크린샷: `artifacts/screenshots/client-list-search-before.png`, `artifacts/screenshots/client-list-test-view-before.png`
  - 수정 후 스크린샷: `artifacts/screenshots/client-list-search-after.png`, `artifacts/screenshots/client-list-test-view-after.png`, `artifacts/screenshots/client-list-test-view-after-search.png`
  - 좁은 화면 스크린샷: `artifacts/screenshots/client-list-search-after-mobile.png`, `artifacts/screenshots/client-list-test-view-after-mobile.png`
  - `.venv/bin/python -m compileall app/router/client_router.py app/services/admin/clients.py`
  - `npm run build`
  - `npm run lint` (`badge.tsx`, `button.tsx`, `sidebar.tsx`의 기존 fast-refresh 경고 3건만 남음)
  - Playwright 브라우저 세션에서 `/api/admin/clients?q=React`, `/api/admin/clients?status=미실시` 응답 확인
- Not checked: 대량 커스텀 검사 데이터 생성 후 성능 측정.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 기존 검사별 보기 구조는 검사 수가 늘수록 카드가 계속 누적되는 구조였다.
- 목록 검색은 프론트에서 일부 필드만 필터링해서 API 스펙과 화면 정보 구성이 분리되어 있었다.

### Why
- 초기 React 전환 과정에서 빠른 목록 구현을 위해 클라이언트 필터링과 검사별 카드 그룹핑을 그대로 사용한 것으로 보인다.

### Next Time
- 목록 화면 필터는 처음부터 API 파라미터와 검색 대상 필드를 같이 정의한다.
- 그룹/분류형 뷰는 데이터 수가 늘어나는 기준을 먼저 보고 탭/셀렉트/검색 기반 구조를 우선 검토한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
