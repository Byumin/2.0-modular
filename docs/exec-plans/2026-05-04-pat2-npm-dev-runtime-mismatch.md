# PAT-2 npm run dev 런타임 구간 불일치 디버깅

## Task Title
- `npm run dev` 실제 런타임에서 PAT-2가 2구간으로 보이는 문제 확인

## Request Summary
- TestClient/DB 검증에서는 PAT-2가 6구간으로 나오지만, 사용자가 `npm run dev`로 검사 생성 시 여전히 PAT-2가 2구간으로 보인다고 보고했다.

## Goal
- 실제 `npm run dev` 서버가 쓰는 엔트리포인트, DB, API 응답을 확인한다.
- 프론트 검사 생성 화면이 어떤 API/필드를 기준으로 PAT-2 구간을 표시하는지 확인한다.
- 실제 HTTP 생성 경로에서 `child_test.sub_test_json`과 `selected_scales_json`이 6구간으로 저장되는지 검증한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: `ARCHITECTURE.md`
  - DB: `docs/database/runtime-db.md`, `docs/database/schema-overview.md`
  - UI/디자인: 해당 없음
  - 문서 체계: `docs/doc-governance.md`
  - 설명/디버깅: `docs/debug/explanation-rule.md`
  - 코드 정리 산출물: 해당 없음
- [x] 운영 DB가 필요한 작업이면 루트 `modular.db` 기준 확인
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- 실제 `npm run dev` 프로세스가 오래된 서버 코드/다른 DB/다른 엔드포인트를 보고 있을 수 있다.
- 또는 생성 저장 로직은 6구간이지만 프론트 화면 표시가 `itemcondition` 기준 2구간을 별도로 쓰고 있을 수 있다.

## Initial Plan
1. `npm run dev` 스크립트와 실제 앱 엔트리포인트/DB 경로를 확인한다.
2. 실제 dev 서버의 `/api/admin/tests/catalog` 응답에서 PAT-2 구간 수를 확인한다.
3. 실제 dev 서버에 로그인 후 `POST /api/admin/custom-tests`로 PAT-2 생성을 호출하고 DB 저장값을 확인한다.
4. 프론트 검사 생성 화면의 catalog/variant 렌더링 코드를 확인한다.
5. 원인이 소스라면 수정하고, 서버 프로세스 문제라면 확인 가능한 근거를 남긴다.

## Progress Updates
### Update 1
- Time: 2026-05-04
- Change: `package.json`의 `npm run dev`가 `uvicorn app.main:app --reload --port 8120`을 실행함을 확인했다.
- Reason: TestClient와 실제 dev 서버 엔트리포인트 불일치 가능성을 먼저 제거하기 위함

### Update 2
- Time: 2026-05-04
- Change: 현재 실행 중인 8120 서버에 HTTP 요청을 보내 `/api/admin/tests/catalog`와 `POST /api/admin/custom-tests`를 확인했다.
- Reason: 사용자가 보는 `npm run dev` 런타임과 TestClient 결과가 다른지 확인하기 위함

### Update 3
- Time: 2026-05-04
- Change: 프론트 검사 생성 화면의 `collectScaleGroups`에서 같은 scale tree signature를 가진 sub_test들을 묶는 로직을 제거했다.
- Reason: catalog가 6구간을 내려줘도 화면에서 PAT-2 norm 구간을 item/scale 구조 기준으로 다시 합쳐 보여주는 문제가 있었기 때문

### Update 4
- Time: 2026-05-04
- Change: 같은 현재 소스를 8121 임시 서버로 실행해 실제 HTTP catalog/create 저장값을 검증했다.
- Reason: 8120에 이미 떠 있는 외부 프로세스가 stale code를 사용 중인지 분리해서 확인하기 위함

## Result
- 현재 8120 서버는 PAT-2 catalog 2구간, 생성 저장값 2구간으로 동작했다.
- 같은 현재 소스를 8121에서 새로 띄우면 PAT-2 catalog 6구간, 생성 저장값 6구간으로 동작했다.
- 따라서 8120은 현재 파일 변경을 반영하지 않은 stale dev server 상태다.
- 프론트 생성 화면도 sub_test 그룹핑을 제거해, 새 catalog 6구간을 6개 실시구간으로 표시하도록 수정했다.
- 생성 경로의 대량 디버그 `logger.info`도 제거했다.

## Verification
- Checked:
  - 현재 8120 HTTP: 로그인 200, PAT-2 catalog sub_tests 2, 생성 row `sub_PAT2=2`, `selected_PAT2=2`
  - 현재 소스 8121 HTTP: 로그인 200, PAT-2 catalog sub_tests 6, 생성 row `sub_PAT2=6`, `selected_PAT2=6`
  - `fetch_parent_scale_rows_by_test("PAT-2") == 6`
  - `npm --prefix frontend run build`
  - `py_compile` 관련 백엔드 파일
- Not checked:
  - 8120 기존 프로세스를 재시작한 뒤 브라우저 화면에서 직접 캡처 검증은 하지 않았다.

## Retrospective
### Classification
- `Mixed`

### What Was Wrong
- 백엔드 TestClient만 확인해 실제 사용자가 붙어 있는 8120 런타임이 stale code인지 확인하지 못했다.
- 프론트 검사 생성 화면에서 sub_test를 다시 scale tree 기준으로 묶는 별도 표시 로직을 놓쳤다.

### Why
- 저장 DB만 확인했고, 실제 `npm run dev` HTTP 서버와 프론트 표시 계층까지 같은 기준으로 검증하지 않았다.

### Next Time
- DB 직접 확인, TestClient, 실제 dev server HTTP, 프론트 표시 로직을 분리해서 검증한다.
- 포트가 이미 사용 중이면 새 서버가 뜬 것으로 간주하지 않고 현재 포트의 응답이 최신 코드인지 먼저 확인한다.

## Related Documents
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
- [docs/database/runtime-db.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/runtime-db.md)
- [docs/database/schema-overview.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/schema-overview.md)
