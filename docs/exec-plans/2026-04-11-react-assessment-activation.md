# React Assessment 구현체 활성화

## 작업 목표
현재 Vite 프록시가 `/assessment` 경로를 FastAPI로 넘겨 바닐라 JS 구현체가 서빙되는 문제를 해결한다.
React 구현체(`src/pages/assessment/`)가 실제로 동작하도록 전환한다.

## 초기 가설과 접근 방식
- `vite.config.ts`의 `/assessment` 프록시 항목을 제거하면 React 라우터가 해당 경로를 처리한다.
- React AssessmentPage는 `/api/assessment-links/:token` 등 API만 호출하므로, `/api` 프록시는 유지한다.
- FastAPI의 `/assessment/custom/{token}` 라우트는 제거하거나 유지해도 5173 포트에서는 영향 없다.

## 단계별 실행 계획
1. `vite.config.ts`에서 `/assessment` 프록시 항목 제거
2. Playwright로 React 구현체가 정상 렌더링되는지 확인
3. 프로필 입력 → 문항 스텝 전환 플로우 검증
4. 바닐라 JS 구현체(static/assessment-custom.html, assessment-custom.js)와 기능 차이 확인
5. 필요 시 React 구현체 보완

## 작업 중 변경된 계획
- BipolarCard의 그리드 고정폭(`w-[18rem]`) → 비율 기반(`minmax(0,2fr)`)으로 변경
- QuestionStep에서 `testName`, `profile` props 완전 제거 (AssessmentPage 헤더로 통합)

## 최종 결과
- `vite.config.ts`에서 `/assessment` 프록시 항목 제거 → React가 assessment 경로 처리
- `QuestionStep.tsx`: testName/profileSummary 중복 헤더 제거, `max-w-2xl` → `w-full`
- `BipolarCard.tsx`: 고정폭 → 비율 기반 그리드로 반응형 개선
- Playwright로 전/후 스크린샷 비교 검증 완료

## 회고
- Vite 프록시 설정이 React 라우터보다 우선순위가 높아 React 코드가 실행되지 않았던 것이 핵심 원인
- 파일 수정 후 Vite HMR이 headless Playwright에서 즉시 반영되지 않아 Vite 재시작 필요했음
