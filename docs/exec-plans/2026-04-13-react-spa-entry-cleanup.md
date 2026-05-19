# React SPA Entry Cleanup

## Task Title
- React SPA 진입점 정리 및 미전환 라우트 전환

## Request Summary
- 루트 `main.py`와 `app/main.py` 혼동, 레거시 `static/` HTML/JS 잔존, React SPA 기준 미전환 부분을 정리한다.

## Goal
- 운영 기준 엔트리포인트를 `app/main.py`로 고정한다.
- `/admin/*`, `/assessment/custom/{token}`뿐 아니라 루트 `/`도 React SPA 기준으로 맞춘다.
- 직접 실행 기준 혼동을 줄이기 위해 루트 `main.py`를 현재 앱으로 위임한다.
- 레거시 정적 HTML/JS 진입점이 더 이상 운영 라우팅으로 보이지 않도록 정리한다.

## Initial Hypothesis
- 현재 주요 라우트는 이미 React SPA로 전환되어 있고, 미전환 지점은 `app/router/page_router.py`의 `/` 라우트와 루트 `main.py`의 과거 FastAPI 앱이다.
- `static/admin-*.html`, `static/assessment*.html`, `static/admin.js`, `static/app.js`, `static/style.css`는 React 앱에서 직접 참조하지 않는 레거시 파일이다.
- `static/vendor/d3.min.js`는 산출물/레거시 보고서 참조 가능성이 있으므로 이번 삭제 대상에서 제외하는 것이 안전하다.

## Initial Plan
1. 변경 전 서버/화면 상태를 스크린샷으로 확인한다.
2. `app/router/page_router.py`의 `/`를 React SPA index 반환으로 변경한다.
3. `frontend/src/App.tsx`의 `/` route를 `/admin`으로 넘겨 React 라우터 기준을 명확히 한다.
4. 루트 `main.py`를 `from app.main import app` 호환 shim으로 축소한다.
5. React 앱에서 직접 참조하지 않는 레거시 `static` HTML/JS/CSS 파일을 삭제한다.
6. 빌드와 필요한 라우트 스모크 검증을 수행한다.

## Progress Updates
### Update 1
- Time: 2026-04-13
- Change: 초기 계획 문서 작성.
- Reason: 실제 코드 정리 작업 전 실행 계획을 남기는 저장소 규칙 준수.

### Update 2
- Time: 2026-04-13
- Change: `/` 라우트를 React SPA index로 전환하고, React Router에 `/` -> `/admin` 리다이렉트를 추가했다. 루트 `main.py`는 `app.main.app` 위임 shim으로 축소했다.
- Reason: 루트 화면과 서버 엔트리포인트가 과거 정적 HTML/FastAPI 앱 기준으로 남아 있어 현재 운영 기준과 달랐다.

### Update 3
- Time: 2026-04-13
- Change: `static/`의 레거시 HTML/JS/CSS를 삭제하고 `static/vendor/d3.min.js`만 보존했다. 관련 활성 문서의 레거시 파일 참조도 React SPA 기준으로 갱신했다.
- Reason: React 앱에서 해당 레거시 HTML/JS/CSS를 직접 참조하지 않고, 보고서/산출물 보조 가능성이 있는 `d3` vendor 파일만 `/static` 보존 가치가 있었다.

### Update 4
- Time: 2026-04-13
- Change: 8000 포트 및 샌드박스 네트워크 격리로 인해 검증용 서버를 8003 포트에서 같은 셸 컨텍스트로 띄우고 GET/스크린샷 검증을 수행했다.
- Reason: 샌드박스에서 별도 명령 간 localhost 접근이 실패해 서버 기동과 검증을 한 실행 컨텍스트 안에서 묶어야 했다.

## Result
- `/`는 React SPA를 서빙하고 React Router에서 `/admin`으로 이동한다.
- `/admin`과 `/admin/*`, `/assessment/custom/{access_token}`는 계속 React SPA를 서빙한다.
- 루트 `main.py`는 `from app.main import app` 호환 엔트리포인트만 남긴다.
- `static/`에는 보고서 보조 정적 자원인 `vendor/d3.min.js`만 남긴다.
- 활성 문서의 React SPA 진입점 설명을 `/`, `/admin/*`, `/assessment/custom/{token}` 기준으로 갱신했다.

## Verification
- Checked:
  - 변경 전 스크린샷: `artifacts/screenshots/react-entry-cleanup-root-before.png`, `artifacts/screenshots/react-entry-cleanup-admin-before.png`
  - `npm run build` 통과
  - `npm run lint` 통과, 기존 Fast Refresh warning 3개만 확인
  - `.venv/bin/python -c "import main; import app.main; print(main.app is app.main.app)"` 결과 `True`
  - `GET /` -> `200 text/html; charset=utf-8`
  - `GET /admin` -> `200 text/html; charset=utf-8`
  - `GET /static/admin.js` -> `404 application/json`
  - `GET /static/vendor/d3.min.js` -> `200 text/javascript; charset=utf-8`
  - 변경 후 스크린샷: `artifacts/screenshots/react-entry-cleanup-root-after.png`, `artifacts/screenshots/react-entry-cleanup-admin-after.png`
- Not checked:
  - 실제 관리자 로그인 이후 전체 업무 플로우
  - 실제 수검 토큰으로 `/assessment/custom/{token}` 화면의 API 데이터 로딩

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 초기 판단대로 운영 기준 미전환 지점은 루트 `/`와 루트 `main.py`가 핵심이었다. 검증 과정에서 HEAD 요청은 FastAPI GET 라우트에서 405를 반환하므로 GET으로 재검증해야 했다.

### Why
- 라우터는 GET 중심으로 정의되어 있고, 샌드박스 실행 컨텍스트가 분리되어 별도 명령에서 localhost 접근이 안정적이지 않았다.

### Next Time
- 로컬 서버 검증은 처음부터 서버 기동, 요청, 스크린샷 캡처, 종료를 같은 셸 컨텍스트로 묶어서 실행한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
