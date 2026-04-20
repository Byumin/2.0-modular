# Execution Plan

## Task Title
- 검사 안내 화면 figma-instructions 레퍼런스 반영

## Request Summary
- `figma-instructions-branch` 폴더를 확인하고 레퍼런스로 참고해 검사 안내 화면에도 반영한다.

## Goal
- 운영 React 수검자 화면의 `IntroStep`을 레퍼런스의 라이트 배경, 글래스 카드, 검사 메타, 안내사항 구조에 맞춰 정리한다.
- 기존 검사 진행 로직과 버튼 동작은 유지한다.
- UI 변경 전후 스크린샷과 빌드 검증을 남긴다.

## Initial Hypothesis
- 레퍼런스의 `ProfileStepLight` intro phase가 현재 검사 안내 화면에 가장 적합하다.
- 현재 운영 화면은 `frontend/src/pages/assessment/steps/IntroStep.tsx`만 수정하면 충분하다.
- 기존 assessment shell header는 유지되므로 내부 안내 카드의 시각 구조만 조정한다.

## Initial Plan
1. `figma-instructions-branch` 구조와 관련 컴포넌트를 확인한다.
2. 현재 검사 안내 화면 수정 전 스크린샷을 캡처한다.
3. `IntroStep.tsx`를 레퍼런스 톤에 맞게 수정한다.
4. 빌드와 수정 후 스크린샷으로 확인한다.

## Progress Updates
### Update 1
- Time: 2026-04-20
- Change: `figma-instructions-branch`의 `ProfileStepLight`, `QuestionEditorial`, 스타일 토큰을 확인했다.
- Reason: 검사 안내 화면에 직접 참고할 수 있는 intro 카드 구조와 색상/간격 패턴을 추출하기 위해서다.

### Update 2
- Time: 2026-04-20
- Change: 수정 전 스크린샷을 캡처한 뒤 `IntroStep.tsx`를 라이트 글래스 안내 카드, 메타 정보, 자동 저장 안내, 수검자 확인 영역으로 재구성했다.
- Reason: 레퍼런스의 검사 안내 흐름을 운영 화면에 맞게 반영하되 기존 시작/수정/뒤로 동작은 유지하기 위해서다.

### Update 3
- Time: 2026-04-20
- Change: `20260420_164204.png`와 다르다는 피드백을 반영해 외부 단계 헤더를 제거하고, PNG처럼 상단 브랜드 바 + 중앙 안내 카드 + 안내사항 카드 + 단일 CTA + footer 구조로 다시 맞췄다. 이후 `ProfileStepTeal`의 딥틸 방식도 반영했다.
- Reason: 이전 구현은 레퍼런스 요소를 섞은 운영형 카드였고, 요청 기준 이미지는 독립 intro 화면 구조였기 때문이다.

### Update 4
- Time: 2026-04-20
- Change: `figma-instructions-branch/src/app/components/ProfileStepTeal.tsx`의 3개 blob 색상과 keyframes 이동값을 운영 `index.css`에 `assessment-intro-blob-*` 클래스로 옮기고 `IntroStep` 블롭에 연결했다.
- Reason: 딥틸 레퍼런스와 같은 색상으로 뒤쪽 블롭이 실제로 떠다니도록 하기 위해서다.

## Result
- 검사 안내 화면에 `figma-instructions-branch` 레퍼런스의 독립 intro 레이아웃을 반영했다.
- `ProfileStepTeal` 기준의 딥틸 배경, 반투명 글래스 카드, cyan accent, 딥틸 CTA를 적용했다.
- `ProfileStepTeal` 기준의 블롭 색상과 이동 애니메이션을 동일하게 연결했다.
- 안내사항에 서버 임시저장 기능을 반영해 “검사 도중 닫히더라도 응답은 자동 저장됩니다.” 문구를 추가했다.

## Verification
- Checked:
  - 수정 전 데스크톱 스크린샷 캡처
  - `npm run build`
  - `.venv/bin/python -m compileall app`
  - 수정 후 데스크톱 스크린샷 캡처
  - 수정 후 모바일 스크린샷 캡처 및 가로 overflow 없음 확인
  - 딥틸 적용 후 데스크톱/모바일 스크린샷 캡처 및 가로 overflow 없음 확인
  - Playwright에서 1.4초 전후 computed transform 비교로 3개 블롭 모두 이동 확인
- Not checked:
  - 실제 사용자 기기 브라우저 수동 확인

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 별도 문제 없음.

### Why
- 레퍼런스의 intro 구조를 기존 운영 컴포넌트에 맞춰 단일 파일 범위에서 반영했다.

### Next Time
- 검사 안내뿐 아니라 profile/question 전체 톤을 같은 레퍼런스로 더 맞출 경우 별도 화면 단위로 계획을 분리한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
