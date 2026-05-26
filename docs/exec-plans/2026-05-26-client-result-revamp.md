# Execution Plan

## Task Title
- ClientResult(관리자 검사 결과 페이지) 시각/기능 개선

## Request Summary
- 사용자 요청: "검사 결과를 볼 수 있는 페이지를 서브에이전트를 시켜서 작업 진행해봐"
- 대상: 기존 `frontend/src/pages/ClientResult.tsx` (라우트 `/admin/clients/:id/result`)
- 디자인 출처: 기존 프로젝트 톤 유지 (외부 브랜드 미사용 → design-bridge 제외)
- 개선 초점 (사용자 다중 선택):
  1. 시각적 디자인 업그레이드 (계층/여백/타이포)
  2. 데이터 시각화 추가 (T점수/백분위 막대 등)
  3. 검사 간 필터/정렬/접기 (요약 상단 + 그룹 접기)
  4. 인쇄/공유 (PDF 인쇄 포맷)

## Goal
- 관리자가 한 수검자의 여러 검사 결과를 한 화면에서 빠르게 비교/스캔하고 필요 시 인쇄/공유할 수 있다.
- 기존 shadcn/ui + Tailwind 토큰을 유지해 다른 admin 페이지와 시각적 일관성을 깨지 않는다.
- 백엔드 API(`/api/admin/clients/{id}`) 응답 스키마는 그대로 사용 (이번 작업 범위 외).

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - UI/디자인: `DESIGN.md`, `QUALIT_SCORE.md`
  - 구조/계층: `ARCHITECTURE.md` (수정 범위는 프론트 단일 파일이라 영향 적음)
- [x] 운영 DB 영향 없음 (프론트 전용)
- [x] 검증 방법: 수정 전/후 스크린샷 비교, 빌드(`npm run build`) 통과 여부

## Initial Hypothesis
- 현재 페이지는 단조로운 카드+테이블 1열 구조. 다음을 더하면 가독성과 비교성이 크게 올라간다.
  - 상단 요약 헤더(검사 수/최신 검사일/하이라이트 척도)
  - 척도 행에 T점수 기준 막대(50 기준선)
  - 검사 그룹 접기/펴기, 검사명·날짜 정렬
  - 인쇄 전용 CSS(`@media print`)로 한 페이지에 깔끔히 떨어지는 레이아웃

## Initial Plan
1. exec-plan 작성 (이 문서)
2. 수정 전 스크린샷 캡처 (`artifacts/screenshots/2026-05-26-client-result-before.png`)
3. ui-designer 서브에이전트에 비주얼/시각화 설계 위임 — DESIGN.md + ClientResult.tsx 컨텍스트 전달, 토큰 유지 제약 명시
4. frontend-developer 서브에이전트에 React 구현 위임 — ui-designer 산출물을 입력으로, 단일 파일(`ClientResult.tsx`) 범위 명시
5. 수정 후 스크린샷 캡처, 전/후 비교
6. 빌드 검증

## Subagent Boundaries
- design-bridge: 사용 안 함 (외부 브랜드 도입 아님)
- ui-designer: 디자인/시각화 패턴 결정. 코드 직접 수정 X, 명세만 산출.
- frontend-developer: 단일 파일 `frontend/src/pages/ClientResult.tsx` 수정. 새 컴포넌트는 같은 파일 내 또는 `frontend/src/components/result/` 하위로 제한. 백엔드 변경 금지.

## Progress Updates
### Update 1
- Time: 2026-05-26 작업 시작
- Change: exec-plan 작성
- Reason: AGENTS.md `Working Rules` — 코드 수정 전 실행계획 우선

### Update 2
- Time: 2026-05-26 dev 서버 기동 시도
- Change: `npm run dev:api`가 `Missing RDS database environment variables` / `DEFAULT_ADMIN_ID and DEFAULT_ADMIN_PW are required`로 연속 실패. `DATABASE_URL=sqlite:////…/modular.db`, `DEFAULT_ADMIN_ID=dev`, `DEFAULT_ADMIN_PW=dev1234!`, `SESSION_SECRET=…`를 명시 export하여 기동 성공
- Reason: `app/db/session.py`가 찾는 env 파일명은 `env.local.dev`인데 실제 파일은 `.env.local.dev`(점 prefix). 메모리 `project_env_structure.md`와 실제 코드가 불일치 → 명시 export로 우회. 본 작업 범위 밖이라 코드 수정은 하지 않음

### Update 3
- Time: 2026-05-26 first before 캡처 후 advisor 호출
- Change: 빈 결과 상태로 잡힌 before 캡처 폐기. `scripts/capture_client_result.mjs` 신규 작성 — Playwright `page.route()`로 `/api/admin/clients/*`를 가로채 고정 fixture(3개 검사 그룹/혼합 level/PAT2 빈 결과) 주입. before/after 동일 fixture로 재캡처
- Reason: advisor 지적 — 빈 상태 캡처는 카드/배지/T점수 시각화 비교 근거가 못 됨. ClientResult.tsx에 mock 토글을 넣는 대안 대신 외부 route mock으로 컴포넌트 무수정 유지

### Update 4
- Time: 2026-05-26 서브에이전트 위임
- Change: ui-designer에게 ClientResult.tsx 전문 + DESIGN.md 핵심 + Badge variant 목록 + 하드 제약(새 의존성/teal 팔레트 금지)을 인라인으로 전달, 마크다운 명세만 산출하도록 지시. 462줄 spec 생성됨. frontend-developer에게 spec 경로 + 동일 인라인 컨텍스트 전달, 직접 빌드 검증까지 수행하도록 지시
- Reason: advisor 지적 — 서브에이전트가 path 포인터만 받으면 generic React/잘못된 토큰을 산출. 인라인 컨텍스트 + 단계 분리(spec → impl)로 산출 품질 확보

### Update 5
- Time: 2026-05-26 검증
- Change: after 캡처 후 전/후 비교. `ScaleBar`/`ResultSummaryStrip`/`TestResultCard` 3개 컴포넌트 신규, ClientResult.tsx 전면 개편. `npm --prefix frontend run build` 타입 에러 0
- Reason: 명세 H절 체크리스트 자체검증 통과

## Result
- 변경 파일:
  - `frontend/src/pages/ClientResult.tsx` (개편, 370줄)
  - `frontend/src/components/result/ScaleBar.tsx` (신규, 33줄)
  - `frontend/src/components/result/ResultSummaryStrip.tsx` (신규, 50줄)
  - `frontend/src/components/result/TestResultCard.tsx` (신규, 186줄)
  - `scripts/capture_client_result.mjs` (신규, fixture 기반 캡처 스크립트)
  - `docs/exec-plans/2026-05-26-client-result-revamp-spec.md` (신규, ui-designer 산출 명세)
- 산출 스크린샷:
  - `artifacts/screenshots/2026-05-26-client-result-before.png`
  - `artifacts/screenshots/2026-05-26-client-result-after.png`
- 반영된 요청 4가지: 시각 디자인 업그레이드(요약 스트립/chip), 데이터 시각화(T점수 인라인 막대 + 50 기준선 + 색 매핑), 필터·정렬·접기(chip 필터/정렬 select/카드별 chevron), 인쇄(`print:` modifier + `break-inside:avoid` + 인쇄 머리글)
- 부수 처리: 헤더 `undefined — 검사 결과` 버그 차단 (`summary?.name` 가드 + 로딩 단계 분리)

## Verification
- Checked:
  - `npm --prefix frontend run build` 타입 에러 0 (chunk size 경고는 사전-존재, 본 작업과 무관)
  - 동일 fixture로 before/after 캡처 비교 — 4가지 요청 모두 시각적으로 확인
  - 명세 H절 8개 체크리스트 모두 ✓
  - 새 npm 의존성 0 (recharts/chart.js 등 도입 없이 Tailwind div만으로 시각화)
- Not checked:
  - 실제 운영(EC2) 데이터에서의 동작 — 로컬은 mock fixture 기반
  - 인쇄 미리보기 PDF 출력 결과 — `print:` 클래스 적용만 코드상 확인, 실제 브라우저 인쇄 다이얼로그 테스트 안 함
  - 모바일/좁은 폭(<768px) 실측 — 명세상 hidden sm:flex 이중 구조로 처리했으나 viewport 좁혀서 확인 안 함
  - 사이드바(`AppSidebar`)는 layout 레벨이라 인쇄 시 함께 숨기려면 별도 작업 필요

## Retrospective
### Classification
- `Mixed (강한 Plan Problem 포함)` — 작업 종료 후 사용자가 운영에서 실제로 보는 화면이 ReportPage(`/admin/report/:id`, `/report/:id?token=...`)였음이 드러남. ClientResult는 사용자가 평소 진입하지 않는 경로. 즉 **요구 화면 자체를 잘못 짚음**. ClientResult 변경은 유지하기로 했지만 본래 의도 해결은 별도 작업(ReportPage)으로 분리됨

### What Was Wrong
0. **요구 화면 오선정 (가장 큰 문제)**: 사용자가 "검사 결과를 볼 수 있는 페이지"라고 했을 때 4지선다 옵션을 드리며 "기존 ClientResult 개선"으로 유도. 사용자는 그 옵션을 골랐으나 실제 운영에서 보는 화면은 ReportPage(`/admin/report/:id` 또는 `/report/:id?token=...`)였음. 작업 후 사용자가 `/admin/report/46` URL을 보고 "수정한 게 맞아?"라고 질문해서 어긋남을 발견. 후속 작업으로 ReportPage 개선 분리 진행
1. **before 캡처 전략 누락**: 시드 데이터/인증을 만드는 부담을 피하느라 빈 상태 캡처로 시작. 이는 카드·배지·시각화 비교의 기준이 못 되어 폐기 → fixture mock 캡처 스크립트 신설로 재시작
2. **서브에이전트 컨텍스트 누락**: 처음에는 "ClientResult.tsx 경로 + 명세 경로" 정도만 줄 생각이었음. advisor 지적 후 전문 + DESIGN.md 발췌 + Badge variants + 하드 제약을 인라인 삽입으로 변경
3. **env 파일명 불일치 미인지**: 메모리(`project_env_structure.md`)는 `.env.local.dev`, 실제 코드는 `env.local.dev`를 찾음. dev 서버 첫 기동 실패 후에야 발견. 이번 작업 범위는 아니지만 메모리 갱신 또는 코드 보정 필요

### Why
1. "스크린샷은 일단 잡고 보자"로 빠르게 진행했으나 advisor 1차 호출 시점이 늦었음. 본격 위임 직전에 호출했으면 폐기될 캡처를 안 만들었을 것
2. 서브에이전트 정의가 generic multi-framework agent라는 점을 인지하지 못함 → 프로젝트 토큰/제약을 모른다는 사실에 둔감
3. 메모리가 4일 전 작성이라 stale 가능성 있음을 시스템 리마인더가 알려줬는데도 그대로 신뢰

### Next Time
- **"검사 결과 페이지" 같은 추상 요청에서는 옵션 제공 전에 사용자가 평소 보는 URL을 먼저 물어본다.** 라우트 매핑(ClientResult vs ReportPage vs AdminReportPage vs ArtifactViewer)을 표로 보여주고 "이 중 어느 화면입니까?"로 명확화. 옵션 4개 중 하나 고르라는 형식은 사용자가 운영 화면명을 모르면 잘못 고를 위험이 큼
- UI 작업의 before 캡처는 **데이터가 들어간 상태**여야 의미가 있다. 시드 부담이 크면 처음부터 fixture mock 캡처 스크립트로 시작 (`scripts/capture_client_result.mjs` 패턴 재사용)
- 서브에이전트 위임 프롬프트에는 항상 **현재 파일 전문 + 사용 가능한 토큰/variant 목록 + 하드 제약**을 인라인으로 포함. path 포인터만 던지지 않음
- 첫 advisor 호출은 "탐색은 끝났고 본격 작업 직전" 시점이 정답. 폐기될 산출물이 만들어진 후가 아님
- env 파일명 컨벤션은 메모리 갱신 후속 작업으로 분리 권장 (별도 exec-plan)

## Related Documents
- [AGENTS.md](/Users/mac/insight_/2.0-modular/AGENTS.md)
- [DESIGN.md](/Users/mac/insight_/2.0-modular/DESIGN.md)
- [QUALIT_SCORE.md](/Users/mac/insight_/2.0-modular/QUALIT_SCORE.md)
- [ClientResult.tsx](/Users/mac/insight_/2.0-modular/frontend/src/pages/ClientResult.tsx)
