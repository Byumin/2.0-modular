# Execution Plan

## Task Title
- 보고서 대시보드 고도화 (Report Dashboard UI Upgrade)

## Request Summary
- "대시보드 고도화해" — 기존 대시보드의 레이아웃, 시각화, 인터랙션 품질을 전반적으로 끌어올린다.
- 후속 요청: 전체 요약의 척도 카드 가로 스크롤화 + 척도 수에 따른 차트 가로 폭 동적 조정

## Goal
- 컨텐츠 영역 폭 확장 (max-w-2xl → max-w-4xl)
- 메트릭 카드에 카테고리별 색상 accent (left border + background tint + 값 색상)
- T점수 바 마커를 얇은 선 → 원형 도트로 교체
- 전체 요약 척도 카드에 미니 T점수 바 추가
- 브레드크럼 네비게이션 추가
- 사이드바 접기/펼치기 토글 추가
- 활성 사이드바 항목 solid 배경으로 강화
- 전체 요약 척도 카드 → 가로 스크롤 행(240px 고정폭)으로 전환
- 프로파일 차트: 척도 수에 따라 최소 폭 동적 계산 + 가로 스크롤 지원

## Initial Hypothesis
- `ReportPage.tsx` 단일 파일에 모든 컴포넌트가 있으므로 해당 파일만 수정하면 된다.
- Recharts LineChart는 `XAxis padding`으로 배경을 유지하면서 점 위치를 조절할 수 있다.
- `ResizeObserver`로 컨테이너 폭을 측정해 차트 최소 폭을 계산한다.

## Initial Plan
1. ReportPage.tsx 전체 재작성 — 레이아웃, 색상 accent, T점수 바 마커, 브레드크럼, 사이드바 토글
2. 전체 요약 카드 행을 grid → 가로 스크롤 flex 행으로 전환
3. ProfileChart에 ResizeObserver 기반 동적 폭 계산 + XAxis padding 적용

## Progress Updates

### Update 1
- Time: 2026-04-16
- Change: ReportPage.tsx 전체 재작성
- Result:
  - max-w-4xl 확장
  - categoryStyle에 card/border/value 추가 → MetricCard, 척도 헤더에 적용
  - TScoreBar 마커: 3px 라인 → 16px 원형 도트(border + shadow)
  - 미니 TScoreBar(compact=true) 추가 — 개요 카드에 삽입
  - PanelBreadcrumb 컴포넌트 추가
  - Sidebar: 접기/펼치기 토글, 활성 항목 solid 배경, 척도 구분 레이블
  - OverviewPanel: 척도 카드 클릭 시 해당 척도 상세로 이동
  - ScalePanel/FacetPanel: 헤더 카드 스타일 강화, 해석 blockquote 스타일

### Update 2
- Time: 2026-04-16
- Change: 프로파일 차트 XAxis padding 조정 (200px) → 점이 중앙으로 모임
- Reason: 2개 척도일 때 점이 좌우 끝에 위치해 가독성 저하

### Update 3
- Time: 2026-04-16
- Change: 척도 카드 grid → 가로 스크롤 flex 행(240px 고정폭, snap)
- Reason: 척도 수 증가 시 카드가 쌓이는 문제 해소

### Update 4
- Time: 2026-04-16
- Change: ProfileChart ResizeObserver 기반 동적 폭 + XAxis padding 방식으로 전환
- Reason:
  - 기존 LineChart margin sidePad 방식은 plot area 전체(배경 포함)가 좁아지는 부작용
  - XAxis padding은 배경(ReferenceArea)을 전체 폭 유지하면서 점만 안쪽으로 이동시킴
  - 척도가 많으면 `Math.max(containerW, items.length * 160)px` 최소 폭으로 차트 확장 → 가로 스크롤

## Result
- 전체 요약: 가로 스크롤 카드 행 + 풀폭 배경 프로파일 차트 (동적 폭)
- 척도/하위척도 패널: 색상 accent 카드, 원형 마커 T점수 바, 브레드크럼
- 사이드바: 접기 토글, solid 활성 상태

## Verification
- Checked: 빌드 오류 없음, 스크린샷 3장(overview/scale/facet) 확인
- Not checked: 척도 8개 이상 실데이터로 가로 스크롤 동작 확인

## Retrospective
### Classification
- `Execution Judgment Problem`

### What Was Wrong
- 실행 계획 문서를 사전에 작성하지 않고 작업을 시작했다.

### Why
- 컨텍스트 복원 후 바로 코드 작업으로 진입해 AGENTS.md 규칙 확인 단계를 건너뜀

### Next Time
- 코드 수정/구조 변경 작업 시작 전 항상 `docs/exec-plans/`에 계획서를 먼저 작성한다.

## Related Documents
- [docs/features/report-dashboard.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/report-dashboard.md)
- [frontend/src/pages/report/ReportPage.tsx](/mnt/c/Users/user/workspace/2.0-modular/frontend/src/pages/report/ReportPage.tsx)
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
