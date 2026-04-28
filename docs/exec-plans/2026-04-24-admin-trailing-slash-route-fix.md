# 작업 제목
`/admin/` trailing slash 진입 경로 명시 라우트 보강

## 요청 요약
가상환경에서 서버를 띄운 뒤 `http://127.0.0.1:8000/admin/`로 접속해도 관리자 로그인 화면이 나타나지 않는다고 보고되었다.

## 작업 목표
- `/admin/` 요청이 React SPA 로그인 진입점으로 안정적으로 연결되도록 한다.
- 기존 `/admin` 및 `/admin/*` 동작을 유지한다.

## 초기 가설
- 현재 구현상 `/admin/`는 `/admin/{path:path}`로 매칭되지만, trailing slash가 빈 path로 처리되는 간접 매칭이라 환경에 따라 불안정하게 보일 수 있다.
- `/admin/`를 명시 라우트로 추가하면 모호성을 줄일 수 있다.

## 실행 계획
1. 현재 `page_router`의 `/admin`, `/admin/{path:path}` 동작을 확인한다.
2. `/admin/` 명시 GET 라우트를 추가해 React index를 직접 반환한다.
3. 라우트 목록을 다시 확인해 `/admin/`가 독립 경로로 잡히는지 검증한다.

## 작업 중 변경 사항
- 최초 조사에서 백엔드 라우트 매칭과 React Router 매칭 모두 `/admin/`를 수용하는 것으로 보였지만, 실제 사용자 환경에서의 애매한 trailing slash 동작을 제거하기 위해 명시 라우트를 추가하기로 했다.

## 결과
- `app/router/page_router.py`에 `/admin/` 명시 GET 라우트를 추가했다.
- 이제 `/admin/` 요청은 빈 path를 가진 wildcard 경유가 아니라 독립 라우트로 바로 React SPA index를 반환한다.

## 검증 내용
- Starlette route match 확인:
- `/admin` 요청은 `/admin`에 `Match.FULL`
- `/admin/` 요청은 `/admin/`에 `Match.FULL`
- 기존 `/admin/{path:path}`도 유지되어 `/admin/workspace` 같은 하위 경로 동작에는 영향이 없다.
- 권한 상승 환경에서 `.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8012`로 로컬 서버를 띄우고 Playwright로 `http://127.0.0.1:8012/admin/` 접속을 검증했다.
- 확인 결과:
- 페이지 title: `검사 운영`
- 표시 텍스트: `Modular Admin`, `관리자 로그인`, `로그인`
- Playwright role 검사: `heading[name="Modular Admin"]` visible, `button[name="로그인"]` visible
- 브라우저 콘솔/페이지 오류: 없음
- 스크린샷: `artifacts/screenshots/2026-04-24-admin-login-verify.png`

## 회고
- 이번 건은 치명적인 코드 오류보다 trailing slash 경로를 간접적으로 처리하던 설계 모호성에 가깝다.
- 사용자 진입 URL이 고정적으로 존재하는 `/admin/`는 wildcard에 기대지 말고 명시 라우트로 두는 편이 안전하다.
