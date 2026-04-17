# Assessment Entry Fullscreen Split

## 요청 요약
- JOBDA 검사 목록 화면처럼 전체 화면을 사용한다.
- 왼쪽 절반은 동그란 글래스 요소들이 움직이고 교차하는 애니메이션 영역으로 만든다.
- 오른쪽 절반은 `처음부터 응시하기` 버튼과 응시 내역 영역 중심으로 구성한다.

## 작업 목표
- 기존 카드 내부 레이아웃을 제거하고 전체 화면 좌우 분할 랜딩으로 변경한다.
- 공개 링크 특성상 본인 확인 전에는 특정 내담자의 이력을 알 수 없으므로, 이력 영역은 본인 확인 안내와 기존 결과 확인 흐름으로 연결한다.
- 기존 validate-profile, 재실시 모달, 제출/채점 흐름은 유지한다.

## 초기 가설
- `AssessmentPage`의 프로필 단계 공통 헤더를 제거하고 `ProfileStep`이 전체 화면 레이아웃을 직접 책임지는 편이 가장 단순하다.
- `ProfileStep` 내부에서 `처음부터 응시하기` 클릭 후 본인 확인 폼을 표시하면 JOBDA식 우측 CTA 구조를 보존하면서 현재 API 제약을 만족할 수 있다.

## 실행 계획
1. 프로필 단계에서 상위 헤더/카드 래퍼를 우회한다.
2. `ProfileStep`을 전체 화면 좌우 분할 레이아웃으로 변경한다.
3. 왼쪽에 원형 글래스 애니메이션 레이어를 추가한다.
4. 오른쪽에 CTA, 응시 내역 안내, 본인 확인 폼 표시 흐름을 구성한다.
5. 빌드와 데스크톱/모바일 스크린샷으로 검증한다.

## 작업 중 변경 사항
- 프로필 단계에서 상위 헤더/카드 래퍼를 제거하고 `ProfileStep`이 전체 화면을 직접 사용하도록 변경했다.
- 왼쪽 절반에 원형 글래스 요소 4개와 교차선, float 애니메이션을 배치했다.
- 오른쪽 절반은 `실전 응시`, `처음부터 응시하기`, `전체 응시 내역`, 본인 확인 폼 표시 흐름으로 재구성했다.
- `처음부터 응시하기` 클릭 전에는 본인 확인 폼을 숨기고, 클릭 후 폼을 표시하도록 했다.
- 기존 결과 모달이 프로필 단계에서도 렌더링되도록 `AssessmentPage`의 early return 구조를 제거했다.
- 왼쪽 히어로를 연한 회색 배경, 파랑/민트/초록 블러 블롭 3개, frosted glass 원형 1개로 정리했다.
- 히어로 애니메이션은 CSS transform 기반의 느린 floating motion만 사용한다.
- 기존 `[animation:float_...]`는 실제 `@keyframes float`가 없어 움직이지 않았다.
- `frontend/src/index.css`에 `hero-float-*` keyframes를 추가하고, 유리 원은 centering transform과 애니메이션 transform이 충돌하지 않도록 래퍼 구조로 변경했다.
- 첫 보정 후에도 영상상 움직임이 약해 보여 블롭 이동 폭을 72~96px 수준으로 키우고, 11~16초 주기의 느린 floating motion으로 조정했다.

## 결과
- 검사 진입 화면이 전체 화면 좌우 분할 구조로 바뀌었다.
- 왼쪽은 움직이는 글래스 애니메이션 영역, 오른쪽은 응시 시작과 응시 내역 안내 영역으로 구성된다.
- 공개 링크 특성상 본인 확인 전 특정 내담자의 실제 응시 내역은 표시하지 않고, 본인 확인 후 기존 결과 확인/다시 실시 모달로 연결한다.

## 검증 내용
- `npm run build` 통과
- `git diff --check` 통과
- Playwright 데스크톱 초기 화면:
  - `artifacts/screenshots/2026-04-17-assessment-entry-fullscreen-desktop.png`
- Playwright 모바일 초기 화면:
  - `artifacts/screenshots/2026-04-17-assessment-entry-fullscreen-mobile.png`
- Playwright 데스크톱 본인 확인 폼 표시:
  - `artifacts/screenshots/2026-04-17-assessment-entry-fullscreen-form-desktop.png`
- Playwright 모바일 본인 확인 폼 표시:
  - `artifacts/screenshots/2026-04-17-assessment-entry-fullscreen-form-mobile.png`
- Playwright 데스크톱 글래스모피즘 히어로:
  - `artifacts/screenshots/2026-04-17-assessment-entry-glassmorphism-hero-desktop.png`
- Playwright 모바일 글래스모피즘 히어로:
  - `artifacts/screenshots/2026-04-17-assessment-entry-glassmorphism-hero-mobile.png`
- 업로드 영상 `artifacts/screenshots/VID_20260417_151507.mp4`를 Chromium video 태그로 확인했다.
- 키프레임 추가 후 Playwright에서 2.5초 간격으로 `data-hero-motion` 요소의 위치 변화 확인:
  - blue: left 57.6 -> 93.2, top 165 -> 133.1
  - mint: left 313.6 -> 285.4, top 264 -> 283.2
  - green: left 187.2 -> 201.2, top 680 -> 690.8
  - glass: left 360 -> 350.1, top 550 -> 556
- 사용자 확인 링크인 `http://127.0.0.1:8000/assessment/custom/a8zKVb8Ab4auUx9fusZT0D9pTq3sj5Fn` 기준으로도 2.5초 뒤 computed transform과 위치 변화가 발생함을 확인했다.
- 움직임 확인용 스크린샷:
  - `artifacts/screenshots/2026-04-17-assessment-entry-glassmorphism-hero-animated.png`
- 기존 제출 프로필 입력 후 기존 결과 모달이 표시되는지 확인했다.

## 회고
- Plan Problem: 최초 구현에서는 프로필 단계 early return 때문에 기존 결과 모달 렌더링 영역을 건너뛰었다.
- Execution Judgment Problem: 전체 화면으로 분리할 때 전역 모달 위치를 함께 고려하지 못했다. 이후 early return을 제거하고 공통 렌더 트리 안에 프로필 단계를 두어 해결했다.
