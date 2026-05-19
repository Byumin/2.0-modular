# Execution Plan

## Task Title
- 세션 검사 안내사항 줄바꿈 표시 보정

## Request Summary
- 관리자에서 세션별 검사 안내 문구에 줄바꿈을 넣어 작성했는데, 실제 검사 생성 링크의 검사 안내 화면에서는 줄바꿈 없이 붙어서 보인다.

## Goal
- 저장된 안내사항 문자열의 줄바꿈을 수검자 `IntroStep` 화면에서 그대로 표시한다.
- 기존 기본 안내사항 fallback과 세션별 안내사항 선택 로직은 유지한다.
- 빌드와 화면 응답 기준으로 회귀를 확인한다.

## Initial Hypothesis
- `guide_items`는 문자열 배열로 저장되고 전달되지만, React에서 일반 inline text로 렌더링되어 HTML whitespace collapsing 때문에 `\n`이 줄바꿈으로 보이지 않는다.
- `IntroStep`의 안내 항목 텍스트에 `whitespace-pre-line`을 적용하면 저장된 줄바꿈을 표시하면서 긴 줄은 자연스럽게 줄바꿈된다.

## Execution Plan
1. `IntroStep` 안내사항 렌더링 위치를 확인한다.
2. 안내사항 텍스트 표시 요소에 줄바꿈 보존 스타일을 적용한다.
3. 프론트 빌드를 실행한다.
4. FastAPI를 재시작해 최신 빌드 asset 서빙을 확인한다.

## Progress Updates
- Change: 실행계획 작성.
- Reason: UI 버그 수정이므로 변경 전 의도와 검증 계획을 남긴다.
- Change: `IntroStep` 안내사항 텍스트에 `whitespace-pre-line`을 적용했다.
- Reason: 저장된 `\n` 문자를 브라우저 화면에서 실제 줄바꿈으로 표시하기 위해서다.

## Result
- 세션별 안내사항 항목 안에 포함된 줄바꿈이 수검자 검사 안내 화면에서 보존되도록 수정했다.

## Verification
- `npm run build:frontend` 통과
- FastAPI/Vite dev 서버 재시작 완료
- `GET /`가 최신 React HTML과 `/assets/index-C25lFby5.js`를 반환함을 확인
- `GET /health` 응답 정상: `{"status":"ok","service":"router+service","ui":"react","db":"postgresql"}`
- 빌드 산출물에 `whitespace-pre-line` 클래스가 포함된 것을 확인

## Retrospective
- Classification: `No Major Issue`
- What Was Wrong: 안내사항 문자열은 줄바꿈을 포함하고 있었지만 화면 렌더링 요소가 기본 whitespace collapsing 규칙을 사용했다.
- Why: HTML 일반 텍스트 노드는 `\n`을 화면 줄바꿈으로 표시하지 않고 공백처럼 접는다.
- Next Time: 관리자가 textarea로 입력한 내용을 수검자 화면에 표시할 때는 `white-space` 표시 정책을 함께 점검한다.
