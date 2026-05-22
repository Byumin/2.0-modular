# Mobile Assessment Cache Verify

## Request Summary
- 최근 모바일 검사 실시 수정이 반영되지 않는 것처럼 보이는 원인을 확인한다.

## Goal
- 최근 모바일 관련 수정 내용을 확인한다.
- 운영 서버가 최신 React 산출물을 서빙하는지 확인한다.
- 모바일 브라우저/프록시 캐시로 이전 번들이 재사용되는 위험을 줄인다.

## Initial Hypothesis
- `QuestionStep.tsx`의 모바일 수정은 최신 커밋에 포함되어 있다.
- `frontend/dist`의 JS에도 모바일 수정 문자열이 포함되어 있다.
- 다만 SPA `index.html`과 `/assets/*` 응답에 cache-control이 없어 모바일 브라우저가 이전 번들을 계속 사용할 수 있다.

## Preflight Checklist
- `AGENTS.md` 확인 완료.
- `DESIGN.md`, `QUALIT_SCORE.md` 확인 완료.
- `QuestionStep.tsx`, `page_router.py`, `main.py` 확인 완료.

## Plan
1. 최근 모바일 수정 내용을 확인한다.
2. React HTML/assets 응답 헤더를 확인한다.
3. SPA HTML과 assets에 no-store 계열 캐시 헤더를 추가한다.
4. 프런트 산출물을 재빌드하고 서버 재시작 후 헤더와 화면 진입을 확인한다.

## Changes During Work
- `QuestionStep.tsx`의 최근 모바일 수정 내용을 확인했다.
  - 모바일 `집중형` 전환 버튼 추가
  - 모바일 이전/다음 페이지 버튼 추가
  - 모바일 하단 제출 버튼 추가
  - 데스크톱 힌트 문구를 모바일에서 숨김
- 서버 로그에서 모바일 접속이 이전 번들(`/assets/index-Cr6mtLjZ.js`, `/assets/index-PtTSXwnq.css`)을 요청한 기록을 확인했다.
- `app/router/page_router.py`의 React `index.html` 응답에 `Cache-Control: no-store, max-age=0`를 추가했다.
- `app/main.py`에 `FrontendAssetsStaticFiles`를 추가해 `/assets/*` 응답에도 `Cache-Control: no-store, max-age=0`를 적용했다.
- `npm run build:frontend`로 프런트 산출물을 재빌드했다.
- 서버를 `npm run ec2:api`로 재시작했다.

## Result
- 운영 도메인에서 React HTML이 새 JS/CSS 번들을 참조한다.
- 새 번들:
  - `/assets/index-BYmrdsSA.js`
  - `/assets/index-BXvua5vb.css`
- 이전 번들 `/assets/index-Cr6mtLjZ.js`는 현재 404를 반환한다.
- HTML/JS/CSS 응답에 `Cache-Control: no-store, max-age=0`가 붙는다.

## Verification
- `curl -i https://inpsyt-norm.com/assessment/custom/Gl2LASqVIs9NoOFZQKACPeAD8CHHFe5r`
  - 200 OK
  - `cache-control: no-store, max-age=0`
  - HTML이 `/assets/index-BYmrdsSA.js`, `/assets/index-BXvua5vb.css` 참조
- `curl -I https://inpsyt-norm.com/assets/index-BYmrdsSA.js`
  - 200 OK
  - `cache-control: no-store, max-age=0`
- `curl -I https://inpsyt-norm.com/assets/index-Cr6mtLjZ.js`
  - 404
- `python -m py_compile app/main.py app/router/page_router.py` 통과.
- Playwright 모바일 스크린샷 검증은 Chromium 설치가 `Playwright does not support chromium on ubuntu26.04-x64`로 실패해 수행하지 못했다.

## Retrospective
- 원인은 모바일 수정 코드 자체가 빠진 것이 아니라, 운영 사용자가 이전 React 번들을 계속 보는 캐시/빌드 반영 문제로 판단된다.
- 이전에 받은 HTML 자체가 브라우저에 남아 있으면 최초 1회는 새로고침 또는 쿼리스트링이 필요할 수 있다. 이후 응답부터는 no-store가 적용된다.
