# Execution Plan

## Task Title
- 검사 안내 화면 시간 산식 및 척도 표시 조정

## Request Summary
- 검사 실시 전 세션 안내 화면의 예상 시간을 문항 수 기준으로 산출한다.
- `N점 척도` 표시는 검사 생성 시 여러 척도가 섞일 수 있으므로 안내 화면에서 제거한다.

## Goal
- 예상 시간은 현재 세션 문항 수에 `20초~30초`를 곱해 범위로 표시한다.
- 안내 메타 정보는 `예상 시간 | 총 N문항 | 응답 정보 보호` 형태로 단순화한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 실행계획 규칙 확인: `docs/exec-plans/README.md`
- [x] UI/디자인 기준 확인: `DESIGN.md`, `QUALIT_SCORE.md`
- [x] 변경 대상 확인: `frontend/src/pages/assessment/steps/IntroStep.tsx`

## Initial Hypothesis
- 안내 화면은 프런트 `IntroStep`에서 현재 세션의 `parts`를 받아 `totalQuestions`와 `scaleLabel`을 계산한다.
- 시간 산식은 백엔드 payload의 `estimated_time_minutes`보다 현재 세션 문항 수 기준으로 계산하는 것이 요청에 맞다.
- `responseScaleLabel()`은 안내 화면에서 더 이상 필요하지 않다.

## Initial Plan
1. `IntroStep`에서 문항 수 기반 예상 시간 formatter를 추가한다.
2. `responseScaleLabel()`과 `scaleLabel` 사용을 제거한다.
3. 안내 메타 문구를 `총 N문항`만 표시하도록 변경한다.
4. TypeScript/build 검증과 가능하면 화면 확인을 수행한다.

## Progress Updates
### Update 1
- Time: 2026-05-20
- Change: 프로젝트 규칙과 UI 기준 문서를 확인하고 변경 범위를 `IntroStep`으로 특정했다.
- Reason: 수검자 안내 화면의 표시 로직만 바꾸는 UI 변경이기 때문이다.

### Update 2
- Time: 2026-05-20
- Change: `IntroStep`의 예상 시간 계산을 현재 세션 문항 수 기반 `20초~30초` 범위로 변경하고, `N점 척도` 표시를 제거했다.
- Reason: 세션별 실제 문항 수에 맞는 안내가 필요하고, 한 검사 링크에 여러 응답 척도가 섞일 수 있어 단일 `N점 척도` 표시는 부정확하기 때문이다.

## Result
- 검사 안내 화면 메타 정보가 `예상 시간 | 총 N문항 | 응답 정보 보호`로 표시되도록 변경했다.
- 예상 시간은 `ceil(문항수 * 20 / 60)`분부터 `ceil(문항수 * 30 / 60)`분까지 범위로 표시한다.
- 최소/최대 분 값이 같으면 `약 N분`으로 표시한다.
- 문항 수가 0이면 `약 0분`으로 표시한다.

## Verification
- Checked:
  - `npm --prefix frontend run build`
  - Vite dev 서버 기동 및 종료 확인
- Not checked:
  - 실제 브라우저 스크린샷 확인: Playwright 브라우저 바이너리가 설치되어 있지 않아 실행 불가
  - 운영 도메인 반영 확인: 배포 빌드/프로세스 반영 전

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 안내 화면이 백엔드 `estimated_time_minutes` 또는 기본값을 사용했고, 첫 번째 응답 옵션 세트만 기준으로 `N점 척도`를 표시했다.

### Why
- 기존 구현은 단일 검사/단일 척도에 가까운 안내를 전제로 했고, 여러 검사와 여러 척도가 같은 실시 링크에 포함되는 경우를 충분히 반영하지 않았다.

### Next Time
- 안내 화면의 요약 정보는 세션에 실제 포함된 문항/파트 데이터 기준으로 계산하고, 단일 값으로 요약하기 어려운 정보는 표시하지 않는다.

## Related Documents
- [AGENTS.md](../../AGENTS.md)
- [DESIGN.md](../../DESIGN.md)
- [QUALIT_SCORE.md](../../QUALIT_SCORE.md)
