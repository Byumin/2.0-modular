# Execution Plan

## Task Title
- 세션 검사 안내 설명 줄바꿈 표시 보정

## Request Summary
- 수검자 검사 안내 화면의 세션 설명 영역에서 줄바꿈이 보존되지 않는 문제를 확인하고 수정한다.

## Goal
- 세션별 안내 설명(`session.description`)에 포함된 줄바꿈을 수검자 안내 화면에서 그대로 표시한다.
- 기존 안내사항(`guide_items`) 줄바꿈 보존 동작은 유지한다.
- 프론트 빌드와 Playwright 화면 검증으로 결과를 확인한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: 관련 수검자 화면 소스 직접 확인
  - DB: 스키마 변경 없음
  - UI/디자인: `DESIGN.md`, `QUALIT_SCORE.md`
  - 문서 체계: 기존 `docs/exec-plans/` 운영 규칙 확인
  - 설명/디버깅: 해당 없음
  - 코드 정리 산출물: 해당 없음
- [x] 운영 DB가 필요한 작업이면 루트 `modular.db` 기준 확인: DB 변경 없음
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- `IntroStep`의 안내사항 항목은 `whitespace-pre-line`을 사용하지만, 세션 설명 문단은 일반 텍스트 렌더링이라 HTML whitespace collapsing으로 줄바꿈이 보존되지 않는다.

## Initial Plan
1. `frontend/src/pages/assessment/steps/IntroStep.tsx`의 세션 설명 문단을 확인한다.
2. 설명 문단에 `whitespace-pre-line`을 추가한다.
3. 프론트 빌드 후 Playwright로 줄바꿈 포함 세션 설명이 실제 안내 화면에서 보존되는지 확인한다.

## Progress Updates
### Update 1
- Time: 2026-05-19
- Change: 실행계획 작성.
- Reason: UI 표시 버그 수정이므로 작업 전 의도와 검증 방법을 남긴다.

### Update 2
- Time: 2026-05-19
- Change: `IntroStep`의 세션 설명 문단에 `whitespace-pre-line`을 추가했다.
- Reason: 관리자에서 입력한 설명 줄바꿈을 브라우저 안내 화면에서 실제 줄바꿈으로 표시하기 위해서다.

## Result
- 수검자 검사 안내 화면의 세션 설명 문단이 저장된 줄바꿈을 보존하도록 수정했다.
- 기존 안내사항 항목의 줄바꿈 보존 동작도 유지된다.

## Verification
- Checked:
- `npm run build:frontend` 통과
- Playwright로 줄바꿈 포함 세션 설명을 가진 검사를 생성하고 실시 링크에서 안내 화면까지 진입 확인
- 설명 문단 `innerText`가 `설명 첫 줄입니다.\n설명 두 번째 줄입니다.\n설명 세 번째 줄입니다.`로 보존됨 확인
- 설명 문단 CSS `white-space: pre-line`, line-height `28`, height `84`로 3줄 렌더링 확인
- 스크린샷: `artifacts/screenshots/session-description-linebreak-23.png`
- Not checked:
- 모바일 폭 화면은 별도 확인하지 않음

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 세션 설명 문단에는 안내사항 항목과 달리 줄바꿈 보존 스타일이 적용되어 있지 않았다.

### Why
- HTML 일반 텍스트 렌더링은 `\n`을 줄바꿈으로 표시하지 않고 공백처럼 접기 때문이다.

### Next Time
- textarea 기반 운영 문구를 수검자 화면에 표시할 때 제목, 설명, 항목 모두 같은 whitespace 정책을 점검한다.

## Related Documents
- [AGENTS.md](../../AGENTS.md)
- [QUALIT_SCORE.md](../../QUALIT_SCORE.md)
- [DESIGN.md](../../DESIGN.md)
- [docs/exec-plans/README.md](README.md)
