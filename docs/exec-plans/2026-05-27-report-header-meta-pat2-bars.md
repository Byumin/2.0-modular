# Execution Plan

## Task Title
- 결과 화면 헤더 메타 우측 이동 및 PAT-2 막대 표시

## Request Summary
- 검사 실시 일자, 이름, 성별, 만 나이/개월 메타 정보를 생성검사 이름 아래가 아니라 오른쪽 상단에 배치한다.
- PAT-2가 막대 차트에 나타나지 않는 이유를 확인하고 해결한다.

## Goal
- `ReportPage.tsx`의 `ProfileHeader`에서 제목 왼쪽에는 검사명만 두고, 메타 정보는 우측 액션 영역에 배치한다.
- PAT-2처럼 `t_score`가 없고 백분위/수준만 있는 척도도 개요 막대 차트와 비교 목록에서 시각적으로 표시되게 한다.
- 빌드와 Playwright 캡처로 변경을 확인한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - UI/디자인: `DESIGN.md`
  - UI 검증: `QUALIT_SCORE.md`
- [x] 운영 DB 스키마 변경 없음
- [x] 검증 방법: API 응답 확인, 빌드, Playwright 스크린샷

## Initial Hypothesis
- 헤더 메타는 현재 `ProfileHeader` 왼쪽 제목 아래에 렌더링된다.
- PAT-2 막대가 안 보이는 이유는 API 응답의 PAT-2 `t_score`가 `null`이고, 차트 코드가 `null`을 `50`으로 대체해 기준선 높이 0 막대로 그리기 때문이다.
- 백분위가 있으면 정규분포 근사로 백분위를 T점수로 변환해 시각화용 점수로 사용할 수 있다. 단, 라벨/툴팁에는 추정값임을 숨기지 않는다.

## Initial Plan
1. API 응답에서 PAT-2 `t_score`와 `percentile` 값을 확인한다.
2. `ProfileHeader` 레이아웃을 기준 이미지처럼 메타 우측 정렬로 수정한다.
3. 시각화용 T점수 helper를 추가해 `t_score`가 없고 percentile이 있으면 percentile 기반 T점수를 사용한다.
4. Overview 차트, Highlights, 비교 목록, 검사별 차트에서 시각화용 점수를 일관되게 쓰도록 조정한다.
5. 빌드와 Playwright 캡처로 확인한다.

## Progress Updates
### Update 1
- Time: 2026-05-27
- Change: 작업 시작
- Reason: 사용자 요청이 UI 수정과 차트 데이터 표시 문제를 함께 포함함

### Update 2
- Time: 2026-05-27
- Change: `/api/admin/report/48` 응답 확인
- Reason: PAT-2 척도는 `t_score`가 모두 `null`이고 `percentile`만 내려오고 있었다. 기존 차트는 `t_score ?? 50`으로 처리해 모든 PAT-2 막대가 평균선 높이 0으로 렌더링됐다.

### Update 3
- Time: 2026-05-27
- Change: 헤더 메타 정보 우측 이동, percentile 기반 표시용 T점수 helper 추가
- Reason: 검사명 아래 메타를 제거하고 우측 상단으로 옮겼다. `t_score`가 없는 척도는 백분위를 정규분포 근사 T점수로 변환해 차트에 표시하며, 실제 T점수가 아님을 `≈` 기호와 툴팁의 `T 추정` 문구로 구분했다.

## Result
- `ProfileHeader`에서 검사명 아래 메타를 제거하고, 검사 실시 일자/이름/성별/만 나이를 오른쪽 상단 액션 영역에 배치했다.
- PAT-2처럼 `t_score`가 없고 `percentile`만 있는 척도도 overview 막대 차트, 검사 간 비교, 검사별 상세 차트, 드로어에서 표시되도록 수정했다.
- 추정 변환값은 `≈50`, `≈71`처럼 표기해 실제 API T점수와 구분한다.

## Verification
- Checked:
- `npm run build:frontend`
- Playwright: 관리자 로그인 후 `http://127.0.0.1:8121/admin/report/48` 진입
- Screenshot: `artifacts/screenshots/2026-05-27-report-header-meta-pat2-bars.png`
- 화면 텍스트 확인: PAT-2 막대 차트에 `≈50`, `≈71`, `≈63`, `≈58`, `≈66` 등 표시 확인
- 헤더 위치 확인: `만 8세 1개월` 메타 텍스트가 우측 상단 영역에 렌더링됨
- Not checked:
- 운영 배포 서버 반영 여부. 로컬 `8121` 운영 모드 빌드 산출물 기준으로 확인했다.

## Retrospective
### Classification
- UI 표시 로직 버그 + 데이터 타입 불일치 대응

### What Was Wrong
- PAT-2는 API 응답에서 T점수가 제공되지 않았는데, 프론트 차트가 `null`을 평균 T=50으로 대체했다.
- T=50은 기준선이기 때문에 막대 높이가 0이 되어 “PAT-2가 막대 차트에 안 나타나는 것처럼” 보였다.

### Why
- K-PSI/PCT처럼 `t_score`가 존재하는 검사만 고려한 차트 표시 로직이었다.
- PAT-2는 현재 결과 API에서 백분위와 범주 중심으로 내려오므로, 프론트에서 `t_score`만 바라보면 시각화에 필요한 y값을 만들 수 없다.

### Next Time
- 차트 표시 전 API 응답의 실제 점수 필드(`t_score`, `percentile`, `category`)를 먼저 확인한다.
- `t_score`가 없는 검사는 백분위 기반 표시값을 쓰되 실제 점수처럼 보이지 않게 `≈` 또는 별도 라벨로 명확히 구분한다.
- 같은 증상이 생기면 먼저 `t_score ?? 50` 같은 fallback이 기준선에 눌려 막대 높이를 0으로 만들고 있는지 확인한다.

## Related Documents
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [DESIGN.md](/mnt/c/Users/user/workspace/2.0-modular/DESIGN.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [ReportPage.tsx](/mnt/c/Users/user/workspace/2.0-modular/frontend/src/pages/report/ReportPage.tsx)
