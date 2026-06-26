# Execution Plan

## Task Title
- 수검자 화면 긴 한글 검사명 줄바꿈 개선

## Request Summary
- 긴 한글 검사명이 실시 링크 화면에서 어색하게 줄바꿈되는 문제를 앞으로 전반적으로 자연스럽게 보이도록 개선한다.

## Goal
- 수검자 프로필/안내/문항 화면의 검사명 표시가 한글 단어 단위로 자연스럽게 줄바꿈되도록 한다.
- 긴 검사명 때문에 레이아웃이 깨지거나 글자가 겹치지 않도록 한다.
- 수정 전후 스크린샷과 빌드 결과를 남긴다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: 해당 없음
  - DB: `docs/database/runtime-db.md` 확인, 기존 서버가 PostgreSQL에 연결된 상태 확인
  - UI/디자인: `DESIGN.md`, `QUALIT_SCORE.md`
  - 문서 체계: 해당 없음
  - 설명/디버깅: 해당 없음
  - 코드 정리 산출물: 해당 없음
- [x] 운영/실행 서버 DB가 필요한 작업이면 `docs/database/runtime-db.md`의 DB 조회 전 확인 규칙 적용
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- 프로필 화면 큰 제목이 `max-w-md`와 기본 word-break 규칙 때문에 긴 한글명이 어색하게 쪼개지는 것이 핵심 원인이다.
- `break-keep`, `text-wrap: balance`, 적절한 `max-width` 보정으로 한글 단어 단위 줄바꿈을 개선할 수 있다.

## Initial Plan
1. 해당 검사 access token을 찾아 수정 전 화면을 캡처한다.
2. `ProfileStep`의 큰 제목과 필요 시 assessment 공통 제목 표시 영역의 줄바꿈 class를 조정한다.
3. 프론트엔드 빌드 후 수정 후 화면을 캡처해 확인한다.
4. 결과와 미검증 항목을 기록한다.

## Progress Updates
### Update 1
- Time: 2026-06-22
- Change: 계획 작성 및 관련 컴포넌트 위치 확인.
- Reason: UI 변경 전 영향 범위와 검증 방법을 고정하기 위해서다.

### Update 2
- Time: 2026-06-22
- Change: `assessment-korean-title` 유틸리티를 추가하고 수검자 제목 영역에 적용했다.
- Reason: 긴 한글 검사명이 글자 단위로 어색하게 쪼개지지 않고 띄어쓰기 단위 중심으로 균형 있게 줄바꿈되도록 하기 위해서다.

### Update 3
- Time: 2026-06-22
- Change: 프론트엔드 빌드를 실행하고 산출물 포함 여부를 확인했다. Playwright 스크린샷은 Chromium 미지원으로 실패했다.
- Reason: 코드/빌드 반영은 확인하되, 현재 환경 제약으로 실제 브라우저 캡처 검증은 수행할 수 없었다.

## Result
- 완료.
- `frontend/src/index.css`에 한글 제목용 `.assessment-korean-title` 유틸리티를 추가했다.
- `frontend/src/pages/assessment/steps/ProfileStep.tsx`의 프로필 화면 큰 검사명 제목에 적용하고 최대 폭을 넓혔다.
- `frontend/src/pages/assessment/AssessmentPage.tsx`의 공통 단계 헤더 제목에도 적용했다.

## Verification
- Checked:
  - `npm run build:frontend` 성공.
  - `frontend/dist/assets/index-zbAEudw2-v2.css`에 `.assessment-korean-title`가 포함됨.
  - `http://127.0.0.1:8120/assessment/custom/<ASSESSMENT_TOKEN>`가 새 JS/CSS 번들을 가리킴.
- Not checked:
  - 실제 브라우저 스크린샷 비교. `node /tmp/capture_assessment_title.js ...`는 Playwright Chromium 미설치로 실패했고, `npx playwright install chromium`은 현재 `ubuntu26.04-x64` 미지원 오류로 실패했다.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 긴 한글 제목에 별도 word-break 규칙이 없어 브라우저 기본 줄바꿈에 맡겨져 있었다.

### Why
- 프로필 화면 제목이 기존 `max-w-md`에 묶여 있었고, 한글 단어 단위 줄바꿈을 유도하는 CSS가 없었다.

### Next Time
- UI 변경 검증을 위해 현재 실행 환경에서 사용 가능한 브라우저 바이너리 경로를 먼저 확보한다.

## Related Documents
- [AGENTS.md](../../AGENTS.md)
- [DESIGN.md](../../DESIGN.md)
- [QUALIT_SCORE.md](../../QUALIT_SCORE.md)
- [docs/runtime-run-modes.md](../runtime-run-modes.md)
