# Execution Plan

## Task Title
- ReportPage(수검자용 토큰 기반 검사 리포트) 화면 개선

## Request Summary
- 사용자 요청: 이전 작업이 ClientResult(`/admin/clients/:id/result`)였으나 사용자가 평소 보는 화면은 ReportPage(`/report/:submissionId?token=...`)였음. 진짜 의도 화면으로 작업 이동
- 대상 라우트: `/report/:submissionId?token=...` (App.tsx Line 24, `<ReportPage mode="token" />`)
- 동일 파일에 있는 `AdminReportPage`(`/admin/report/:id`)는 **이번 범위 제외** (사용자 결정)
- 대상 파일: `frontend/src/pages/report/ReportPage.tsx` (1040줄)
- 개선 포인트 (사용자 다중 선택):
  1. 상단 헤더 메타 정보 (Line 838 `Header`) — 현재 라벨 없이 이름/성별/나이/생일을 divide-x로만 구분, 의미 불분명
  2. 좌측 사이드바 (Line 653 `Sidebar`) — 척도 탐색 트리 가독성/접기 개선
  3. 전체 요약 카드 (Line 164 `MetricCard`, Line 368 `OverviewPanel`) — 좌우 스크롤 시 잘림
  4. T점수 프로파일 차트 (Line 276 `ProfileChart`, recharts 기반) — 보강

- 인쇄 작업 **제외** (화면 보기 전용)

## Goal
- 수검자/보호자가 화면에서 자기 검사 결과를 더 쉽게 이해할 수 있게 한다.
- 라벨 없는 메타 정보 → 라벨/구분 명확화.
- 좌측 사이드바 척도 탐색 시 스크롤/접기 동작 개선.
- 요약 카드의 가로 스크롤 해소 또는 시각적 개선.
- T점수 차트의 색/툴팁/접근성 보강.
- 기존 recharts/구조는 유지. AdminReportPage 영향 없도록 격리.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth:
  - UI/디자인: `DESIGN.md`, `QUALIT_SCORE.md`
  - 구조: 본 파일만 수정, App.tsx 라우팅 영향 없음
- [x] 운영 DB 영향 없음 (프론트 전용)
- [x] 검증: 동일 token URL로 전/후 캡처 비교, `npm --prefix frontend run build` 통과

## Initial Hypothesis
- 헤더 메타 4항목(name/gender/age_text/birth_day)이 라벨 없이 divide-x만으로 구분되어 시각적으로 한 줄 문장처럼 읽힘. → 작은 라벨(`이름 / 성별 / 나이 / 생일`)을 위에, 값은 아래에 두는 정의 리스트 형태로 변경.
- 사이드바는 척도 트리이며 검사가 많으면 길어진다. 스크롤바 가시성/현재 선택 위치 표시/접기 동작이 약하면 탐색이 어렵다.
- 요약 카드는 `OverviewPanel` 안에서 4개 정도가 좌우 스크롤로 잘림. grid 2열/반응형으로 정렬하면 잘림 해소.
- 차트는 이미 recharts라 단색 BRAND `#2d3580`만 사용. zone 배경(`T_ZONES`)이 정의되어 있으나 활용 부족 가능. Hover 툴팁/Zone hint 보강 여지.

## Initial Plan
1. exec-plan 작성 (이 문서)
2. before 캡처는 이미 잡힘: `artifacts/screenshots/2026-05-26-report-page-before.png` (사용자 제공 token URL로 운영 RDS 데이터 직접 캡처)
3. ui-designer에 4개 영역별 명세 위임 — Header/Sidebar/OverviewPanel/ProfileChart 컴포넌트 인라인 컨텍스트 + DESIGN.md 핵심 + 제약 전달
4. frontend-developer에 명세 + 컴포넌트 컨텍스트 전달, ReportPage.tsx만 수정 (AdminReportPage 분기 안 깨도록 주의)
5. 동일 token URL로 after 캡처
6. 빌드 검증
7. 회고

## Subagent Boundaries
- design-bridge: 사용 안 함 (외부 브랜드 도입 아님)
- ui-designer: 4개 영역 명세만 산출. 코드 수정 X.
- frontend-developer: `frontend/src/pages/report/ReportPage.tsx`만 수정. 새 파일 분리는 최소. 백엔드/API/recharts 의존성 변경 금지. `AdminReportPage` 함수 시그니처/렌더링 결과 동일하게 유지.

## Hard Constraints
- 새 npm 의존성 금지 (recharts/Tailwind/shadcn 그대로)
- API 응답 스키마 변경 금지
- AdminReportPage 영향 최소화 — `Header`/`Sidebar`/`OverviewPanel`/`ProfileChart`를 공유한다면 AdminReportPage에서도 동일하게 보이게 (사용자가 admin쪽은 별도 의사결정으로 미룸. 깨뜨리지만 않으면 됨)
- 인쇄 관련 코드(`print:` modifier, `window.print()`)는 그대로 두기 (제거 X, 새로 추가 X)
- 수검자 화면이므로 DESIGN.md 4절 teal 팔레트 / 별도 BRAND 컬러 사용 허용. 단, 새 hex 추가는 최소화

## Progress Updates
### Update 1
- Time: 2026-05-26
- Change: 방향 재정의 후 본 exec-plan 작성
- Reason: 이전 ClientResult 작업이 사용자 의도 화면이 아님이 확인됨. 회고는 `2026-05-26-client-result-revamp.md`의 What Was Wrong #0에 기록

## Result
- 변경 파일:
  - `frontend/src/pages/report/ReportPage.tsx` (1041 → 1130줄)
  - 신규 파일 없음 (spec F절 권장: 1300줄 임계 미달로 단일 파일 유지)
- 산출 명세: `docs/exec-plans/2026-05-26-report-page-revamp-spec.md` (393줄)
- 산출 스크린샷:
  - `artifacts/screenshots/2026-05-26-report-page-before.png`
  - `artifacts/screenshots/2026-05-26-report-page-after.png`
- 반영된 4가지 개선:
  - **Header**: 4메타 항목(이름/성별/나이/생년월일)을 라벨+값 정의 리스트로 분리. divide-x 한 줄 문장 해소
  - **Sidebar**: 검사 그룹 헤더 `sticky top-0 z-10 bg-white`, active 좌측 컬러 바, collapsed 인덱스 안정화(`scaleIndexMap` useMemo)
  - **OverviewPanel 요약 카드**: `overflow-x-auto` → 반응형 그리드(3≤/4=/5+ 분기). `summaryGridClass()` 헬퍼. 검사 12개가 잘림 없이 한눈에 보임
  - **ProfileChart**: zone 색상을 `T_ZONES` 토큰과 일치시킴, 커스텀 Tooltip(척도명/T+zone/백분위/카테고리), 데이터 점 클릭→ScalePanel 이동(`activeDot.onClick`), Legend 라벨 "낮음/평균/높음 영역"으로 명확화

## Verification
- Checked:
  - `npm --prefix frontend run build` 타입 에러 0 (851KB chunk 경고는 사전-존재)
  - 동일 token URL로 before/after 캡처 비교
  - spec G절 12개 체크리스트 모두 ✓
  - `print:` modifier / 인쇄 버튼 그대로 보존
  - AdminReportPage 함수 시그니처 변경 없음, `ReportDashboard` 공유 경로 그대로
  - 새 npm 의존성 0, recharts 그대로
- Not checked:
  - `/admin/report/:id` 실측 — 공유 컴포넌트라 코드상 동일하나 브라우저에서 직접 확인은 안 함
  - 모바일/좁은 폭 실측
  - 인쇄 출력물 실측 (기존 코드 보존만 확인, 인쇄 동작 자체는 본 작업 범위 밖)
  - Sidebar collapsed 토글 동작 실측 (코드 보존만 확인)

## Retrospective
### Classification
- `Execution Judgment Problem (경미)` — 계획 자체는 사용자 의도를 정확히 반영. advisor가 (1) 헤더 필드 매핑 검증 (2) 컴포넌트 공유 영향 확인 (3) PII/gitignore 점검을 사전 지적 → 모두 위임 전에 해결. 큰 잘못 없음

### What Was Wrong
1. 초기 exec-plan 본문에 "헤더에 라벨이 없다"고만 적었음. 캡처의 "이지" 단어 정체를 모른 채 명세 단계로 갈 뻔함. advisor 지적으로 실제 API(`/api/report/by-submission/...`) 호출해서 `gender="여자"`임을 확인하고 진행
2. AdminReportPage가 같은 `ReportDashboard`를 공유한다는 사실을 exec-plan 본문에 명시했으면서도, 사용자에게 영향 범위를 명시적으로 확인하는 단계가 빠질 뻔함. advisor 지적으로 사용자에게 확인 → "admin도 같이 개선" 승인

### Why
- 첫 ClientResult 작업의 교훈("API 응답 실데이터 확인")이 새 작업에서도 advisor 호출 전엔 안 적용됐음. 회고 메모리에 남겨도 다음 작업에 자동 적용되진 않음
- 공유 컴포넌트는 코드를 보면 알 수 있지만, "사용자에게 영향 범위 알림" 단계는 절차로 명문화돼 있지 않음

### Next Time
- **컴포넌트 공유 점검**을 UI 개선 작업 절차에 포함. 라우트 매핑 → 컴포넌트 트리 추적 → 영향 라우트 목록 → 사용자 확인. 매번 advisor가 잡아주기 전에 스스로 거치는 단계로
- 화면 캡처에서 사용자가 보이는 텍스트의 의미가 불명확할 땐 **반드시 실제 API 응답을 직접 호출해 확인**한 뒤 명세에 인용

## Related Documents
- [AGENTS.md](/Users/mac/insight_/2.0-modular/AGENTS.md)
- [DESIGN.md](/Users/mac/insight_/2.0-modular/DESIGN.md)
- [ReportPage.tsx](/Users/mac/insight_/2.0-modular/frontend/src/pages/report/ReportPage.tsx)
- [Spec](/Users/mac/insight_/2.0-modular/docs/exec-plans/2026-05-26-report-page-revamp-spec.md)
- [이전 ClientResult 회고](/Users/mac/insight_/2.0-modular/docs/exec-plans/2026-05-26-client-result-revamp.md)

## Related Documents
- [AGENTS.md](/Users/mac/insight_/2.0-modular/AGENTS.md)
- [DESIGN.md](/Users/mac/insight_/2.0-modular/DESIGN.md)
- [ReportPage.tsx](/Users/mac/insight_/2.0-modular/frontend/src/pages/report/ReportPage.tsx)
- [이전 ClientResult 회고](/Users/mac/insight_/2.0-modular/docs/exec-plans/2026-05-26-client-result-revamp.md)
