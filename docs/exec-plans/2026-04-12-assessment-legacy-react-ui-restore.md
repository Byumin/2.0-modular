# Execution Plan

## Task Title
- 검사 실시 React UI 레거시 구조/선택지 스타일 재구현

## Request Summary
- 검사 실시 화면에서 레거시 정적 HTML/CSS의 데스크톱 구조와 선택지 스타일을 React SPA에 재구현하고, 모바일 안정성은 유지한다.

## Goal
- React `/assessment/custom/{token}` 문항 단계에 레거시의 넓은 데스크톱 작업 영역, 우측 진행 패널, 큰 선택지 카드형 조작감을 반영한다.
- 모바일에서는 이전 React 화면처럼 가로 스크롤이 생기지 않도록 반응형 구조를 유지한다.

## Initial Hypothesis
- 현재 React 문항 단계는 `max-w-4xl` 단일 컬럼과 작은 원형 bipolar 선택지를 사용해서 데스크톱 밀도와 조작감이 약해졌다.
- 레거시의 2컬럼 구조와 선택지 카드 크기를 React 컴포넌트 클래스 조합으로 재현하면 주요 품질 저하를 줄일 수 있다.
- 레거시 CSS를 그대로 이식하면 모바일 가로 스크롤이 재발할 수 있으므로 Tailwind 기반 반응형 grid로 재구성하는 것이 안전하다.

## Initial Plan
1. 수정 전 캡처 분석 결과를 기준으로 React 문항 단계의 구조적 차이를 반영한다.
2. `AssessmentPage`의 문항 단계 컨테이너 폭을 넓히고, 프로필 단계에는 기존 폭을 유지한다.
3. `QuestionStep`에 데스크톱 우측 패널과 카드형/집중형 보기 전환을 추가한다.
4. `BipolarCard`, `LikertCard`, `MatrixCard` 선택지 스타일을 레거시처럼 더 큰 클릭 영역과 명확한 선택 상태로 조정한다.
5. 빌드 및 Playwright 스크린샷으로 데스크톱/모바일을 재확인한다.

## Progress Updates
### Update 1
- Time: 2026-04-12 15:59:08 KST
- Change: 초기 계획 작성.
- Reason: 코드 수정 전 실행 계획 문서 작성 규칙 준수.

### Update 2
- Time: 2026-04-12 16:07 KST
- Change: `AssessmentPage` 문항 단계 폭을 `max-w-7xl`로 확장하고, `QuestionStep`을 메인 문항 영역 + 우측 진행 패널 구조로 재구성했다.
- Reason: 수정 전 분석에서 데스크톱 React 화면의 폭과 정보 구조가 레거시보다 크게 약해진 것이 확인됨.

### Update 3
- Time: 2026-04-12 16:10 KST
- Change: `LikertCard`, `BipolarCard`, `MatrixCard`, `TextCard`의 문항 배지/선택지 클릭 영역/선택 상태 스타일을 카드형으로 조정했다.
- Reason: 기존 React bipolar 선택지가 작은 원형 라디오 중심이라 클릭 영역과 시각적 존재감이 부족했음.

### Update 4
- Time: 2026-04-12 16:14 KST
- Change: 모바일/데스크톱 Playwright 캡처와 응답 클릭, 집중형 전환 검증을 완료했다.
- Reason: UI Review Rule에 따라 수정 후 실제 화면과 반응형 안정성을 확인해야 함.

### Update 5
- Time: 2026-04-12 16:14 KST
- Change: Playwright로 전체 190문항을 자동 응답하고 제출 API 응답, 완료 화면, DB 저장 및 채점 결과 row를 확인했다.
- Reason: 사용자가 제출까지 전체 플로우 확인을 요청함.

## Result
- React 검사 실시 문항 단계가 레거시처럼 넓은 데스크톱 작업 영역, 우측 진행/상태/이동/응답 방식/제출 패널, 큰 카드형 선택지 버튼을 갖도록 변경됐다.
- 모바일에서는 우측 패널이 아래로 내려가며 가로 스크롤 없이 유지된다.

## Verification
- Checked:
  - 수정 전 React/레거시 데스크톱/모바일 캡처 및 DOM 크기 지표.
  - `npm run build` 성공.
  - 수정 후 데스크톱 캡처: `artifacts/screenshots/assessment-compare/react-after-desktop-1440.png`.
  - 수정 후 모바일 캡처: `artifacts/screenshots/assessment-compare/react-after-mobile-390.png`.
  - 데스크톱: shell `896px -> 1280px`, 첫 문항 `672px -> 930px`, 첫 선택지 `24x43 -> 55x50`.
  - 모바일: `bodyScrollWidth=390`, `innerWidth=390`, `overflowX=false`.
  - 모바일에서 객관식 응답 클릭 후 `1 / 190 문항 응답` 반영 확인.
  - `B안 집중형` 전환 후 `FOCUSED STEP` 렌더 확인.
  - 전체 190문항 응답 후 제출 API `200` 응답 확인.
  - 제출 API 응답: `submitted_item_count=190`, `submission_id=2`, `scoring_result_id=2`, `scoring_status=scoring_completed`.
  - 제출 후 완료 화면 캡처: `artifacts/screenshots/assessment-compare/react-after-submit-complete.png`.
  - DB `admin_custom_test_submission.id=2`, `submission_scoring_result.submission_id=2`, `submission_scoring_result.scoring_status=scored` 확인.
- Not checked:
  - 없음.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 원래 React 구현은 기능 자체는 동작했지만, 레거시 검사 실시 화면의 데스크톱 정보 구조와 선택지 조작감을 충분히 옮기지 못했다.

### Why
- SPA 전환 과정에서 화면을 범용 카드/단일 컬럼 패턴으로 단순화하면서, 검사 실시 화면의 전용 작업 패널과 큰 선택지 버튼이 빠졌다.

### Next Time
- 레거시 UI를 React로 옮길 때는 기능 흐름뿐 아니라 데스크톱/모바일별 화면 밀도, 클릭 영역, 진행 상태 배치를 수정 전 캡처로 먼저 비교한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
