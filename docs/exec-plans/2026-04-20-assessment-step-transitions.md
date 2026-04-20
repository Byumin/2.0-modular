# 검사 실시 단계 전환 개선

## 요청 요약
- 인적사항 화면에서 검사 안내 화면으로, 검사 안내 화면에서 문항 화면으로 넘어갈 때 화면이 너무 갑자기 바뀌지 않도록 자연스러운 전환을 적용한다.

## 작업 목표
- 기존 단계 흐름과 API 호출은 유지한다.
- 단계 화면이 바뀔 때 짧은 페이드/슬라이드 전환을 추가한다.
- 모션 최소화 설정을 사용하는 환경에서는 전환 움직임을 제거한다.

## 초기 가설
- 현재 `AssessmentPage.tsx`는 `step` 상태에 따라 화면 컴포넌트를 바로 조건부 렌더링한다.
- 실제 단계 상태와 화면에 표시되는 단계를 짧게 분리하면 기존 흐름을 크게 바꾸지 않고 자연스러운 전환을 만들 수 있다.

## 실행 계획
1. 수정 전 검사 실시 첫 화면을 캡처한다.
2. `AssessmentPage.tsx`에 표시 단계 상태와 전환 상태를 추가한다.
3. `index.css`에 단계 전환용 CSS 클래스를 추가한다.
4. 프런트엔드 빌드와 화면 흐름을 검증한다.

## 작업 중 변경 사항
- `AssessmentPage.tsx`에 실제 단계(`step`)와 표시 단계(`visibleStep`)를 분리했다.
- 단계 변경 시 기존 화면을 짧게 fade out 한 뒤 새 화면을 fade/slide in 하도록 `stepTransitionState`를 추가했다.
- `index.css`에 `.assessment-step-frame`, `.assessment-step-out`, `.assessment-step-in`, `.assessment-step-idle` 클래스를 추가했다.
- `prefers-reduced-motion: reduce` 환경에서는 움직임과 블러를 제거하도록 처리했다.

## 결과
- 인적사항, 검사 안내, 문항 화면을 감싸는 단계 전환 프레임을 추가했다.
- 단계 변경 시 기존 화면이 짧게 위로 빠지며 흐려지고, 새 화면이 아래에서 부드럽게 들어오도록 반영했다.
- 화면 배경색도 단계 변경 시 부드럽게 전환되도록 `transition-colors`를 추가했다.

## 검증 내용
- 수정 전 스크린샷: `artifacts/screenshots/2026-04-20-assessment-step-transition-before-profile.png`
- `npm run build` (`frontend`) 통과.
- `.venv/bin/python -m compileall app` 통과.
- Playwright로 검사 실시 흐름을 실행해 안내 화면과 문항 화면 진입을 확인했다.
- 전환 중 `assessment-step-out` 클래스가 실제로 적용되는 것을 확인했다.
- 수정 후 스크린샷:
  - `artifacts/screenshots/2026-04-20-assessment-step-transition-after-intro.png`
  - `artifacts/screenshots/2026-04-20-assessment-step-transition-after-question.png`

## 회고
- 기존 단계 렌더링 구조를 유지하면서 표시 단계만 분리했기 때문에 검사 저장, 본인 확인, 문항 제출 로직의 영향 범위를 줄일 수 있었다.
