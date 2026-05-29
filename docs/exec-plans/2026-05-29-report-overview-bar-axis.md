# Execution Plan

## Task Title
- 결과 화면 전체 비교 차트 y축/막대 기준 수정

## Request Summary
- `검사별 결과 한눈에` 영역의 막대를 50점 기준 양방향 막대가 아니라, 0~100 y축에서 0부터 위로 올라가는 단방향 막대로 변경한다.
- T점수가 없는 PAT-2 같은 검사는 P점수를 사용해 P98이면 y축 98까지 막대가 올라가게 한다.
- 추가 요청: 상단 검사별 상세 탭의 `결과 차트`도 막대와 꺾은선을 동일한 0~100 축 기준으로 표시한다.
- 추가 요청: 척도 수가 적을 때 막대 폭이 과하게 넓어지지 않도록 최대 폭을 둔다.

## Goal
- 전체 비교 탭의 검사별 막대 차트가 모든 점수를 0~100 위치값으로 표시한다.
- 검사별 상세 탭의 주요 척도 막대와 하위척도 꺾은선도 같은 0~100 위치값으로 표시한다.
- 전체 비교와 상세 탭의 막대 폭은 척도 수에 따라 늘어나되 지정한 최대 폭을 넘지 않는다.
- T점수가 있으면 T값, T점수가 없고 percentile만 있으면 percentile 값을 막대 높이에 사용한다.
- 기존 결과 화면의 카드/탭/상세 비교 UI는 건드리지 않는다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - [ ] 코드/구조: `ARCHITECTURE.md`
  - [ ] DB: `docs/database/runtime-db.md`, `docs/database/schema-overview.md`
  - [x] UI/디자인: `DESIGN.md`, `QUALIT_SCORE.md`
  - [ ] 문서 체계: `docs/doc-governance.md`
  - [ ] 설명/디버깅: `docs/debug/explanation-rule.md`
  - [ ] 코드 정리 산출물: `docs/code-cleanup/README.md`
- [x] 운영 DB가 필요한 작업이면 루트 `modular.db` 기준 확인: DB 변경 없음
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- `frontend/src/pages/report/ReportPage.tsx`의 `TestComparisonChart`가 현재 `T_MIN/T_MAX`와 `yFor(50)` 기준으로 막대 높이를 계산한다.
- `displayScore()`가 이미 T점수 또는 percentile fallback을 반환하므로 차트 축 범위와 막대 기준점만 바꾸면 요구사항을 충족할 수 있다.

## Initial Plan
1. 현재 차트 렌더링과 점수 fallback 함수를 확인한다.
2. `TestComparisonChart`의 y축을 0~100으로 바꾸고, 막대는 `baseY`에서 `yFor(plotValue)`까지 그린다.
3. 빌드 후 로컬 서버에서 결과 화면 스크린샷으로 `검사별 결과 한눈에` 차트를 검증한다.

## Progress Updates
### Update 1
- Time: 2026-05-29
- Change: 실행계획 생성 및 현재 차트 구현 확인.
- Reason: UI 수정 작업 전 계획과 검증 기준을 남기기 위해서.

### Update 2
- Time: 2026-05-29
- Change: `TestComparisonChart`의 y축을 `[0, 20, 40, 50, 60, 80, 100]`로 변경하고, 막대를 `baseY`에서 점수 위치까지 올라가는 단방향 막대로 수정했다.
- Reason: 50점 기준 위/아래 방향 막대가 아니라 0~100 축에서 실제 점수 높이를 보여달라는 요청을 반영하기 위해서.

### Update 3
- Time: 2026-05-29
- Change: `npm run build:frontend` 실행 후 `/admin/report/47`을 Playwright로 캡처했다.
- Reason: UI 변경은 실제 화면 기준으로 확인해야 하므로 빌드와 스크린샷 검증을 수행했다.

### Update 4
- Time: 2026-05-29
- Change: `TestHierarchyChart`도 y축 `[0, 20, 40, 50, 60, 80, 100]`, 주요 척도 막대 `baseY -> scoreY`, 하위척도 꺾은선 `displayScore().value` 기준으로 수정했다.
- Reason: 상단 검사별 상세 화면의 차트도 전체 비교 차트와 같은 점수 시각 기준을 가져야 하기 때문.

### Update 5
- Time: 2026-05-29
- Change: 재빌드 후 `/admin/report/47`의 `K-PSI-4-SF` 상세 탭을 Playwright로 캡처했다.
- Reason: 상세 탭 막대와 꺾은선이 실제 화면에서 0~100 축에 맞게 표시되는지 확인하기 위해서.

### Update 6
- Time: 2026-05-29
- Change: 막대 최대 폭 상수 `MAX_CHART_BAR_W = 72`를 추가하고, 전체 비교/상세 탭 막대를 각 슬롯 중앙에 배치하도록 수정했다.
- Reason: 척도 수가 적을 때 막대가 슬롯 전체로 과하게 넓어지는 문제를 막기 위해서.

### Update 7
- Time: 2026-05-29
- Change: 재빌드 후 전체 비교와 `K-PSI-4-SF` 상세 탭을 다시 캡처했다.
- Reason: 막대 폭 상한이 실제 화면에서 적용되고, 막대가 각 슬롯 중앙에 유지되는지 확인하기 위해서.

### Update 8
- Time: 2026-05-29
- Change: 막대 최대 폭을 `72px`에서 `65px`로 낮췄다.
- Reason: 최대 폭을 더 줄여달라는 추가 요청을 반영하기 위해서.

### Update 9
- Time: 2026-05-29
- Change: 전체 비교 차트 막대 폭 계산을 `barSlot - gap`에서 `barSlot * 0.62`로 변경했다.
- Reason: 척도 수가 10개 이상이어도 슬롯 폭 때문에 막대가 최대 폭에 가깝게 유지되는 문제를 줄이기 위해서.

## Result
- `검사별 결과 한눈에` 차트가 0~100 y축과 0 기준 단방향 막대로 표시된다.
- 검사별 상세 탭의 `결과 차트`도 0~100 y축과 0 기준 단방향 막대, 0~100 기준 하위척도 꺾은선으로 표시된다.
- 전체 비교 막대는 슬롯 폭의 62%와 최대 65px 중 더 작은 값을 사용한다.
- 상세 탭 막대는 기존처럼 슬롯 폭의 40%와 최대 65px 중 더 작은 값을 사용한다.
- T점수가 있는 척도는 T값 자체를 높이로 사용하고, T점수가 없고 P백분위만 있는 척도는 P값 자체를 막대/꺾은선 위치로 사용한다.

## Verification
- Checked:
  - 작업 전 `/admin/report/47` 화면에서 `검사별 결과 한눈에` 영역 존재 확인.
  - `npm run build:frontend` 통과.
  - `/admin/report/47` Playwright 렌더링 확인: 0, 20, 40, 50, 60, 80, 100 축 표시 및 단방향 막대 렌더링 확인.
  - 스크린샷: `artifacts/screenshots/2026-05-29-report-overview-bars-0-100.png`
  - 재빌드 통과.
  - `/admin/report/47`의 `K-PSI-4-SF` 상세 탭 Playwright 렌더링 확인: 상세 차트의 막대와 하위척도 꺾은선이 0~100 축에 맞춰 표시됨.
  - 스크린샷: `artifacts/screenshots/2026-05-29-report-detail-bars-lines-0-100.png`
  - 재빌드 통과.
  - 전체 비교/상세 탭 Playwright 렌더링 확인: 막대 최대 폭 제한과 중앙 정렬 적용.
  - 스크린샷:
    - `artifacts/screenshots/2026-05-29-report-overview-bars-max-width.png`
    - `artifacts/screenshots/2026-05-29-report-detail-bars-max-width.png`
- Not checked:
  - 실제 운영 제출 중 P백분위만 있고 T점수가 없는 PAT-2 제출 ID별 화면은 별도 ID를 지정받지 않아 확인하지 못했다. 코드 경로는 `displayScore().value`를 사용하므로 P98이면 높이 98로 계산된다.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 기존 차트는 20~80 T축과 50 기준 양방향 막대 표현이었다.
- 첫 수정에서는 전체 비교 차트만 바꿨고, 검사별 상세 탭의 별도 차트 컴포넌트를 함께 반영하지 못했다.

### Why
- 이전 구현은 T점수 평균 50을 중심선으로 편차를 보여주는 방식에 맞춰져 있었다.
- 결과 화면에는 전체 비교 차트와 검사별 상세 차트가 별도 컴포넌트로 나뉘어 있었다.

### Next Time
- 점수 지표가 T/P로 섞이는 차트는 축 의미와 막대 기준점을 요구사항에서 먼저 고정한다.
- 같은 성격의 시각화가 여러 탭에 반복될 때는 컴포넌트 단위로 전체 검색해 적용 범위를 먼저 묶는다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
