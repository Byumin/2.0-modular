# Execution Plan

## Task Title
- 수검자 화면 모달 동적 폭 적용

## Request Summary
- 모달창 좌우 길이를 들어갈 텍스트 길이에 따라 동적으로 변하게 할 수 있는지 확인하고 반영한다.

## Goal
- 수검자 화면의 주요 모달이 짧은 텍스트에서는 좁게, 긴 텍스트에서는 지정한 최대 폭까지 넓어지도록 한다.
- 모바일에서는 화면 폭을 넘지 않게 제한한다.

## Initial Hypothesis
- 현재 모달은 `w-full max-w-md/lg` 고정 폭이라 텍스트 길이와 무관하게 일정한 폭으로 열린다.
- `width: fit-content`, `min-width`, `max-width` 조합을 공통 클래스로 만들면 텍스트 길이에 따른 동적 폭과 모바일 안정성을 함께 얻을 수 있다.

## Initial Plan
1. 수검자 화면의 모달 위치를 확인한다.
2. 공통 CSS 유틸리티를 추가한다.
3. `AssessmentPage`와 `ProfileStep`의 모달 컨테이너에 적용한다.
4. 빌드와 화면 캡처로 확인한다.

## Progress Updates
### Update 1
- Time: 2026-04-20
- Change: `AssessmentPage`와 `ProfileStep`의 내담자 연결/확인, 개인정보, 재실시 확인 모달 폭 구조를 확인했다.
- Reason: 고정 `w-full max-w-*` 구조를 동적 폭으로 바꾸기 위해서다.

### Update 2
- Time: 2026-04-20
- Change: `assessment-modal-fit`, `assessment-modal-fit-wide` 공통 CSS를 추가하고 수검자 주요 모달 컨테이너에 적용했다.
- Reason: 내용 길이에 따라 `fit-content`로 폭을 잡되, 모바일 화면을 넘지 않게 `min-width`와 `max-width`를 같이 제한하기 위해서다.

## Result
- 수검자 화면 주요 모달이 고정 `w-full max-w-*` 대신 내용 기반 폭을 사용하도록 변경됐다.
- 짧은 텍스트 모달은 최소 폭까지만 줄어들고, 긴 텍스트 모달은 최대 폭 안에서 줄바꿈된다.

## Verification
- Checked:
  - `npm run build`
  - `.venv/bin/python -m compileall app`
  - Playwright로 내담자 연결 확인 모달 열기
  - `.assessment-modal-fit` computed style 확인: `width: 576px`, `min-width: 320px`, `max-width: 576px`
  - 모달 스크린샷 캡처
- Not checked:
  - 모든 모달 조합을 수동 클릭 검증하지는 않았다.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 별도 문제 없음.

### Why
- 공통 유틸리티로 폭 정책을 모달마다 재사용하게 했다.

### Next Time
- 관리자 화면 모달까지 같은 폭 정책을 적용할 경우 별도 범위로 분리한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
