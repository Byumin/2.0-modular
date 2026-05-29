# Execution Plan

## Task Title
- 결과 화면 PAT-2 백분위 막대 표시 방식 수정

## Request Summary
- `t_score` 같은 표준화 점수가 없는 검사는 T점수 추정값을 만들지 않는다.
- 표준화 점수가 없으면 `P` 백분위 값으로 막대를 표시한다.

## Goal
- PAT-2처럼 `t_score`가 없고 `percentile`이 있는 척도는 `≈71` 같은 추정 T점수가 아니라 `P98` 같은 백분위 라벨로 표시한다.
- 차트 높이는 백분위 값을 차트 높이에 맞게 정규화하되, 라벨과 툴팁은 P값으로 명확히 표시한다.
- 빌드와 Playwright 스크린샷으로 반영을 확인한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] `DESIGN.md` 확인
- [x] `QUALIT_SCORE.md` 확인
- [x] DB/API 변경 없음

## Initial Plan
1. 현재 `displayScore` helper의 추정 T점수 변환 로직을 제거한다.
2. 점수 표시 모델을 `T` 또는 `P`로 구분한다.
3. overview 막대 차트, 검사 간 비교, 검사별 상세 차트, 드로어에서 `P` 라벨을 일관되게 표시한다.
4. 빌드 후 `admin/report/48` 화면 캡처로 PAT-2가 `P50`, `P98` 등으로 표시되는지 확인한다.

## Progress Updates
### Update 1
- Time: 2026-05-27 15:48 KST
- Change: 작업 시작
- Reason: 기존 `≈` 표기는 사용자 요구와 맞지 않아 백분위 직접 표시로 전환 필요

### Update 2
- Time: 2026-05-27 15:55 KST
- Change: 점수 표시 모델을 `T`와 `P`로 분리
- Reason: `t_score`가 없을 때 백분위를 T점수로 환산하지 않고 `P50`, `P98`처럼 원 백분위 값을 직접 표시해야 함

### Update 3
- Time: 2026-05-27 15:58 KST
- Change: 비교 목록의 막대 내부 라벨도 `P` 라벨을 사용하도록 수정
- Reason: 막대 위치 계산용 정규화 값이 화면에 숫자로 노출되면 백분위 값과 혼동됨

## Result
- `≈` 추정 T점수 표기를 제거했다.
- `t_score`가 있으면 `T97`처럼 T점수로 표시하고, `t_score`가 없고 `percentile`이 있으면 `P98`처럼 백분위로 표시한다.
- 차트 높이는 기존 T축 화면에 맞춰 P백분위를 20~80 표시 범위로 정규화하되, 사용자가 보는 라벨/목록/툴팁은 P값을 유지한다.
- PAT-2 목록형 막대 내부 숫자도 정규화 위치값이 아니라 `P50`, `P98`, `P90` 등으로 표시되게 했다.

## Verification
- Checked:
- `npm run build:frontend`
- Playwright: 관리자 로그인 후 `http://127.0.0.1:8121/admin/report/48` 진입
- Screenshot: `artifacts/screenshots/2026-05-27-report-percentile-bars-final.png`
- 화면 텍스트 확인:
  - `hasApprox false`
  - `hasP98 true`
  - `hasP50 true`
  - PAT-2 overview 막대와 검사 간 비교 목록에서 `P50`, `P98`, `P90`, `P80`, `P95` 표시 확인
- Not checked:
- 운영 배포 서버 반영 여부. 로컬 `8121` 운영 모드 빌드 산출물 기준으로 확인했다.

## Retrospective
### Classification
- UI 점수 표현 로직 수정

### What Was Wrong
- 이전 수정은 PAT-2 백분위를 정규분포 근사 T점수로 환산해 `≈71`처럼 표시했다.
- 사용자가 요구한 것은 추정 T점수가 아니라 백분위 자체를 막대 값으로 표시하는 방식이었다.

### Why
- 차트가 T점수 축을 전제로 만들어져 있어, `t_score`가 없을 때 차트 위치값과 표시값을 분리해야 했다.
- 이를 분리하지 않고 환산값을 표시값으로 노출해 실제 점수 종류가 혼동됐다.

### Next Time
- 점수 표시 로직은 계산용 위치값과 사용자에게 보이는 원 점수 라벨을 분리한다.
- 공식 표준화 점수가 없는 경우 임의 환산값을 점수처럼 노출하지 않는다.
- 백분위 기반 막대는 `P` prefix로 표시해 T점수와 구분한다.

## Related Documents
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [DESIGN.md](/mnt/c/Users/user/workspace/2.0-modular/DESIGN.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [ReportPage.tsx](/mnt/c/Users/user/workspace/2.0-modular/frontend/src/pages/report/ReportPage.tsx)
