# Assessment Entry Polish

## 요청 요약
- 검사 실시 진입 화면을 더 고급스럽고 신뢰감 있게 개선한다.

## 작업 목표
- 인적사항 입력 폼처럼 보이는 첫 화면을 검사 시작 전 확인 화면으로 정리한다.
- 검사명, 목적, 개인정보 사용 범위, 진행 안내를 명확히 보여준다.
- 기존 검사 실시/재실시 흐름과 API 동작은 변경하지 않는다.

## 초기 가설
- 개선 대상은 동의 이후 `ProfileStep` 화면과 그 상위 헤더이다.
- 화면 구조를 크게 바꾸지 않고도 레이아웃, 문구, 진행 상태, 안내 블록을 정돈하면 신뢰감이 올라간다.

## 실행 계획
1. 수정 전 화면 스크린샷을 남긴다.
2. `ProfileStep`을 검사 안내 영역과 본인 확인 입력 영역으로 재구성한다.
3. `AssessmentPage`의 프로필 단계 헤더 문구와 컨테이너 폭을 조정한다.
4. 빌드와 Playwright 스크린샷으로 확인한다.

## 작업 중 변경 사항
- `ProfileStep`을 단일 입력 폼에서 `검사 안내 + 본인 확인` 2열 패널로 재구성했다.
- 안내 문구를 개인정보 목적, 기존 결과 보호, 응답 환경 중심으로 정리했다.
- 버튼 문구를 `다음`에서 `검사 시작하기`로 변경했다.
- `AssessmentPage`의 프로필 단계 헤더 문구와 진행 단계 색상을 새 톤에 맞췄다.
- 모바일에서는 안내 영역과 입력 영역이 세로로 쌓이도록 유지했다.

## 결과
- 검사 실시 진입 화면이 단순 폼보다 검사 시작 전 확인 화면에 가깝게 보이도록 개선됐다.
- 기존 API 흐름, 재실시 모달, 제출/채점 동작은 변경하지 않았다.

## 검증 내용
- 수정 전 스크린샷: `artifacts/screenshots/2026-04-17-assessment-entry-before.png`
- `npm run build` 통과
- `git diff --check` 통과
- 수정 후 데스크톱 스크린샷: `artifacts/screenshots/2026-04-17-assessment-entry-after-desktop.png`
- 수정 후 모바일 스크린샷: `artifacts/screenshots/2026-04-17-assessment-entry-after-mobile.png`

## 회고
- Plan Problem: 없음.
- Execution Judgment Problem: Playwright 캡처 명령에서 셸 템플릿 문자열 해석 문제로 1회 실패했다. 이후 파일명 조합을 일반 문자열로 바꿔 해결했다.
