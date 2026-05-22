# Admin Cookie Secure Flag

## Request Summary
- 관리자 로그인 쿠키가 `secure=False`인지 확인한다.
- HTTPS 운영 기준으로 쿠키 `Secure` 속성이 적용되도록 수정한다.

## Goal
- 운영 기본값은 `admin_session` 쿠키에 `Secure`를 붙인다.
- 로컬 HTTP 개발이 필요한 경우 환경변수로 끌 수 있게 한다.

## Initial Hypothesis
- 현재 `app/router/auth_router.py`의 `response.set_cookie()`가 `secure=False`로 고정되어 있다.
- 고정값 대신 `ADMIN_COOKIE_SECURE` 환경변수 기반 설정이 적절하다.

## Preflight Checklist
- `AGENTS.md` 확인 완료.
- `auth_router.py`와 쿠키 설정 검색 완료.

## Plan
1. `auth_router.py`에서 secure flag helper를 추가한다.
2. 로그인 쿠키와 로그아웃 delete cookie에 동일한 secure/samesite 기준을 적용한다.
3. 문법 검증을 실행한다.

## Changes During Work
- `auth_router.py`의 `secure=False` 고정값을 제거했다.
- `ADMIN_COOKIE_SECURE` 환경변수를 추가했다. 기본값은 secure enabled이며 `0/false/no/off`일 때만 비활성화된다.
- 로그아웃 쿠키 삭제도 같은 secure/samesite 기준을 사용하게 했다.

## Result
- 운영 HTTPS 기본값에서는 `admin_session` 쿠키가 `Secure` 속성으로 설정된다.
- 로컬 HTTP 개발이 필요하면 `.env` 또는 실행 환경에 `ADMIN_COOKIE_SECURE=false`를 설정해야 한다.

## Verification
- `.venv/bin/python3 -m py_compile app/router/auth_router.py`

## Retrospective
- HTTPS 운영 기준 보안 속성을 기본값으로 두고, 예외적인 로컬 HTTP만 명시적으로 허용하는 구조가 적절하다.
