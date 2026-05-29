# Execution Plan

## Task Title
- 검사 결과 화면 KPI 스트립 제거

## Request Summary
- `원래 디자인.png`를 기준으로 현재 결과 화면 상단의 `검사 실시`, `주의 필요`, `양호 영역`, `응답률` 카드 영역을 삭제한다.
- PNG 이미지와 비교하면서 작업을 진행한다.

## Goal
- `/admin/report/{submissionId}`와 `/report/{submissionId}`가 공유하는 `ReportPage.tsx`에서 헤더 아래 KPI 카드 스트립을 제거한다.
- 헤더 바로 아래에 탭 바가 오도록 기준 이미지와 맞춘다.
- 빌드와 스크린샷으로 반영 여부를 검증한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - UI/디자인: `DESIGN.md`
  - UI 검증: `QUALIT_SCORE.md`
- [x] 기준 이미지 확인: `docs/design/reference/report-ui-ux/원래 디자인.png`
- [x] 운영 DB 변경 없음
- [x] 검증 방법: 빌드, Playwright 캡처, 기준 이미지와 레이아웃 비교

## Initial Hypothesis
- 현재 `ReportDashboard`가 `ProfileHeader` 아래에서 `KPIStrip`을 렌더링해 기준 이미지에 없는 카드 스트립이 생긴다.
- 이 렌더링 블록만 제거하면 헤더 다음에 탭 바가 배치되어 기준 이미지 구조와 맞아진다.

## Initial Plan
1. `frontend/src/pages/report/ReportPage.tsx`에서 `ReportDashboard`의 `KPIStrip` 렌더링을 제거한다.
2. 빌드로 타입 오류를 확인한다.
3. 현재 로컬 서버에서 새 번들이 서빙되도록 실행/확인한다.
4. Playwright로 `/admin/report/48` 캡처를 찍고 KPI 문구가 사라졌는지 확인한다.
5. 실행계획에 결과와 검증을 갱신한다.

## Progress Updates
### Update 1
- Time: 2026-05-27
- Change: 기준 이미지 확인 후 KPI 스트립 제거 대상으로 `ReportDashboard`를 특정
- Reason: 기준 이미지에는 헤더 바로 아래 탭 바가 있고 KPI 카드 영역이 없음

## Result
- `frontend/src/pages/report/ReportPage.tsx`에서 `KPIStrip` 컴포넌트와 렌더링 블록을 제거했다.
- 헤더 바로 아래에 `전체 비교 / K-PSI-4-SF / PAT-2 / PCT` 탭 바가 오도록 변경했다.
- 기준 이미지의 상단 구조처럼 KPI 카드 스트립 없이 콘텐츠가 시작된다.

## Verification
- Checked:
  - `npm run build:frontend` 통과
  - `curl http://127.0.0.1:8121/admin/report/48`가 새 번들 `index-BtrUts0v-v2.js`를 서빙하는 것 확인
  - Playwright 캡처: `artifacts/screenshots/2026-05-27-report-kpi-strip-removed.png`
  - Playwright 텍스트 확인:
    - `실시 검사=false`
    - `주의 필요=false`
    - `양호 영역=false`
    - `응답률=false`
    - `전체 비교=true`
    - `실시한 검사 정보=true`
    - `검사별 결과 한눈에=true`
  - 좌표 확인: header bottom `65.5`, tab top `65.5`로 헤더 바로 아래 탭이 붙어 있음
- Not checked:
  - 모바일 뷰포트는 별도 확인하지 않음

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 기준 이미지에는 없는 KPI 카드 스트립이 구현에 남아 있어 헤더와 탭 사이 구조가 달랐다.

### Why
- 리포트 전면 재구성 과정에서 요약 KPI 영역을 추가했지만, 최종 기준 이미지의 상단 레이아웃에는 해당 영역이 없었다.

### Next Time
- 기준 이미지가 있는 UI 작업은 먼저 첫 화면의 섹션 순서를 이미지 기준으로 체크하고, 새로 추가한 보조 요약 영역이 실제 기준에 있는지 확인한다.

## Related Documents
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [DESIGN.md](/mnt/c/Users/user/workspace/2.0-modular/DESIGN.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [ReportPage.tsx](/mnt/c/Users/user/workspace/2.0-modular/frontend/src/pages/report/ReportPage.tsx)
- [원래 디자인.png](/mnt/c/Users/user/workspace/2.0-modular/docs/design/reference/report-ui-ux/원래%20디자인.png)
