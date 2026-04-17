# Assessment Entry Glass Panel

## 요청 요약
- 검사 실시 진입 화면을 JOBDA식 구성에 가깝게 바꾸고, 왼쪽에 글래스 효과가 있는 애니메이션 영역을 둔다.

## 작업 목표
- 왼쪽은 신뢰감 있는 시각 패널로 구성한다.
- 오른쪽은 `실전 응시`에 가까운 검사 시작 카드와 본인 확인 입력으로 구성한다.
- 기존 검증/재실시/제출 흐름은 유지한다.

## 초기 가설
- 현재 변경 대상은 `ProfileStep` 중심이다.
- Tailwind arbitrary animation을 사용해 별도 CSS 파일 없이 가벼운 움직임을 만들 수 있다.
- 모바일에서는 시각 패널과 입력 폼이 세로로 쌓여야 한다.

## 실행 계획
1. `ProfileStep` 왼쪽 안내 영역을 글래스 패널과 애니메이션 요소로 교체한다.
2. 오른쪽 영역을 검사 시작 카드, 안내 문구, 입력 폼 순서로 재배치한다.
3. 빌드와 스크린샷으로 데스크톱/모바일을 확인한다.

## 작업 중 변경 사항
- `ProfileStep` 왼쪽 영역을 어두운 그린 계열의 글래스 패널로 변경했다.
- 왼쪽 패널에 배경 레이어, 반투명 카드, 부드러운 float/pulse 애니메이션을 추가했다.
- 오른쪽 영역은 `실전 응시`, `처음부터 응시하기`, 상태 배지, 안내 문구, 본인 확인 폼 순서로 재배치했다.
- 기존 입력 검증, 기존 결과 모달, 재실시, 제출 로직은 변경하지 않았다.

## 결과
- 검사 진입 화면이 JOBDA식 검사 응시 카드 구조에 가까워졌다.
- 왼쪽에는 시각적 무게감이 있는 글래스 애니메이션 영역이 생겼고, 오른쪽에는 실제 시작 액션과 본인 확인 입력이 정리됐다.

## 검증 내용
- `npm run build` 통과
- `git diff --check` 통과
- Playwright 데스크톱 스크린샷:
  - `artifacts/screenshots/2026-04-17-assessment-entry-glass-desktop.png`
- Playwright 모바일 스크린샷:
  - `artifacts/screenshots/2026-04-17-assessment-entry-glass-mobile.png`

## 회고
- Plan Problem: 없음.
- Execution Judgment Problem: 없음.
