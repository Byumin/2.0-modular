# Admin Auth

## Purpose
관리자 로그인, 로그아웃, 현재 로그인 관리자 조회 기능을 다룬다.

## Main Endpoints
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/me`

## Main Files
- `app/router/auth_router.py`
- `app/schemas/auth.py`
- `app/services/admin/auth.py`
- `app/services/admin/modular_auth.py`

## Behavior Summary
- 로그인 요청이 들어오면 관리자 ID와 비밀번호를 검증한다.
- 검증이 성공하면 `admin_session` 쿠키를 발급한다.
- 이후 관리자 전용 API는 이 쿠키를 기준으로 인증한다.
- 로그아웃 시 서버 메모리의 세션 맵에서 토큰을 제거하고 쿠키도 삭제한다.

## Core Flow
1. 클라이언트가 관리자 로그인 화면에서 자격 정보를 입력한다.
2. `POST /api/admin/login`이 요청을 받는다.
3. `AdminLoginIn` 스키마가 요청 본문을 검증한다.
4. `app.services.admin.auth.admin_login`이 호출된다.
5. 내부에서 `verify_modular_admin_login`으로 계정을 확인한다.
6. 성공 시 랜덤 토큰을 생성해 `ADMIN_SESSIONS`에 저장한다.
7. 라우터가 `admin_session` 쿠키를 내려주고 `/admin/workspace`로 이동할 수 있는 응답을 반환한다.

## Session Rule
- 세션 저장소는 현재 프로세스 메모리의 `ADMIN_SESSIONS` 딕셔너리다.
- 서버 재시작 시 메모리 세션은 초기화된다.
- 인증이 필요한 서비스는 `get_current_admin`을 통해 공통적으로 관리자 검증을 수행한다.

## Startup Related
- 앱 startup 시 `seed_default_admin()`이 실행되어 기본 관리자 계정을 보장한다.
- 기본 계정은 `.env`의 `DEFAULT_ADMIN_ID`, `DEFAULT_ADMIN_PW`를 우선 사용한다.

## Notes
- 현재 인증 상태는 DB 세션 테이블이 아니라 메모리 기반이다.
- 운영 환경이 확장되면 세션 저장소 분리가 필요할 수 있다.
