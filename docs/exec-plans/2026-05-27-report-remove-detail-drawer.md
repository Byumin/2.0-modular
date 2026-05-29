# Execution Plan

## Task Title
- 결과 화면 사이드 상세 패널 제거

## Request Summary
- 결과 화면에서 척도/차트/행을 클릭할 때 옆에서 불쑥 나오는 상세 패널을 아예 제거한다.

## Goal
- `ReportPage.tsx`의 `DetailDrawer`와 `drill` 상태를 제거한다.
- 차트/목록/해석 행 클릭이 더 이상 오버레이나 사이드 패널을 열지 않게 한다.
- 기존 탭 전환, 펼침/접힘, 인쇄, 결과 표시 기능은 유지한다.
- 빌드와 Playwright 캡처로 패널이 열리지 않는지 확인한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] `DESIGN.md` 확인
- [x] `QUALIT_SCORE.md` 확인
- [x] DB/API 변경 없음

## Initial Plan
1. `DetailDrawer`, `DrillState`, `drill` 상태를 제거한다.
2. `onSelectScale` props와 클릭 핸들러를 제거하거나 no-op이 아닌 일반 표시 컴포넌트로 바꾼다.
3. 빌드로 타입 오류를 확인한다.
4. Playwright에서 결과 화면을 열고 PAT-2/차트/목록 클릭 후 사이드 패널이 생기지 않는지 확인한다.

## Progress Updates
### Update 1
- Time: 2026-05-27 16:13 KST
- Change: 작업 시작
- Reason: 불필요한 사이드 상세 패널이 사용자 흐름을 방해함

### Update 2
- Time: 2026-05-27 16:20 KST
- Change: `DetailDrawer`, `DrillState`, `drill` 상태, 척도 클릭 핸들러 제거
- Reason: 차트/목록/해석 영역 클릭이 더 이상 사이드 패널을 열지 않게 하기 위함

### Update 3
- Time: 2026-05-27 16:22 KST
- Change: 상세 패널에서만 쓰던 `BellCurve`와 `erf` helper 제거
- Reason: 패널 제거 후 미사용 코드가 빌드를 막음

### Update 4
- Time: 2026-05-27 16:25 KST
- Change: PAT-2 해석 목록의 `T=—` 잔여 표기를 `P50`, `P98` 등으로 수정
- Reason: P백분위 표시 정책과 화면 일관성 유지

## Result
- 결과 화면의 사이드 상세 패널을 제거했다.
- 핵심 발견, overview 차트, 검사 간 비교 행, 검사별 차트, 척도별 해석 행을 클릭해도 더 이상 오버레이/사이드 패널이 열리지 않는다.
- 기존 탭 전환과 검사 정보 펼침/접힘은 유지했다.
- PAT-2 해석 목록의 점수 표기도 `P` 백분위로 정리했다.

## Verification
- Checked:
- `npm run build:frontend`
- Playwright: 관리자 로그인 후 `http://127.0.0.1:8121/admin/report/48` 진입
- 클릭 검증: `성취 압력`, `총 스트레스`, `PAT-2 탭으로` 클릭
- DOM 확인:
  - `asideCount 0`
  - `hasCloseX false`
  - `hasTEmpty false`
  - `hasP98 true`
- Screenshot: `artifacts/screenshots/2026-05-27-report-detail-drawer-removed-final.png`
- Not checked:
- 운영 배포 서버 반영 여부. 로컬 `8121` 운영 모드 빌드 산출물 기준으로 확인했다.

## Retrospective
### Classification
- UI 상호작용 제거

### What Was Wrong
- 척도 상세 확인용 드로어가 여러 영역의 클릭 이벤트에 연결되어 있어 사용자가 의도하지 않은 사이드 패널처럼 느껴졌다.

### Why
- 결과 화면의 주요 목적은 검사 간 비교와 해석 확인인데, 클릭 가능한 영역이 많아 탐색보다 돌발 오버레이 경험이 더 두드러졌다.

### Next Time
- 상세 패널이 필요한 경우 행 전체 클릭이 아니라 명시적인 `자세히 보기` 버튼으로만 열리게 설계한다.
- 결과 보고서처럼 읽기 중심 화면에서는 불필요한 오버레이를 기본 상호작용으로 두지 않는다.

## Related Documents
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [DESIGN.md](/mnt/c/Users/user/workspace/2.0-modular/DESIGN.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [ReportPage.tsx](/mnt/c/Users/user/workspace/2.0-modular/frontend/src/pages/report/ReportPage.tsx)
