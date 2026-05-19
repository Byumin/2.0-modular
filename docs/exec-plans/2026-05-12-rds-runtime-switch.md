# Execution Plan

## Task Title
- EC2 런타임 DB 연결을 RDS 기반으로 전환

## Request Summary
- EC2 안의 소스가 루트 `modular.db`를 보고 있을 가능성이 있으니 전부 확인하고 RDS 기반으로 수정한다.

## Goal
- FastAPI 런타임 SQLAlchemy 연결을 `.env`의 RDS PostgreSQL 설정 기반으로 전환한다.
- 관리자 인증 직접 SQLite 접근 경로를 SQLAlchemy/RDS 기반으로 전환한다.
- health 응답과 운영 DB 문서 기준을 RDS로 갱신한다.
- 앱 import/startup 수준에서 RDS 연결이 가능한지 검증한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - [x] 코드/구조: `ARCHITECTURE.md`
  - [x] DB: `docs/database/runtime-db.md`, `docs/database/schema-overview.md`
  - [ ] UI/디자인: 해당 없음
  - [ ] 문서 체계: 해당 없음
  - [ ] 설명/디버깅: 해당 없음
  - [ ] 코드 정리 산출물: 해당 없음
- [x] 운영 DB가 필요한 작업이면 루트 `modular.db` 기준 확인
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- 운영 런타임에서 실제로 수정해야 할 핵심은 `app/db/session.py`와 `app/modular_auth_repository.py`다.
- `.env` 로드 순서 때문에 DB 세션 모듈이 자체적으로 `.env`를 읽어야 한다.
- PostgreSQL 드라이버 의존성이 requirements에 추가되어야 한다.

## Initial Plan
1. `modular.db`, `sqlite3`, `DATABASE_URL` 참조를 전수 검색한다.
2. SQLAlchemy 엔진을 RDS 환경변수 기반 URL로 생성한다.
3. 직접 SQLite 인증 저장소를 SQLAlchemy 연결 기반으로 교체한다.
4. SQLite 전용 raw SQL이 startup에서 깨지지 않도록 보정한다.
5. 문서와 health 응답을 RDS 기준으로 갱신한다.
6. RDS 접속, import, startup 경로를 검증한다.

## Progress Updates
### Update 1
- Time: 2026-05-12
- Change: 실행계획 작성.
- Reason: DB 런타임 전환 작업 전 기록 필요.

### Update 2
- Time: 2026-05-12
- Change: `app/db/session.py`를 `.env` 기반 RDS PostgreSQL 엔진 생성으로 변경하고, PostgreSQL 드라이버 의존성을 추가했다.
- Reason: 앱 런타임이 루트 `modular.db` 대신 RDS를 사용해야 하기 때문.

### Update 3
- Time: 2026-05-12
- Change: 관리자 인증 저장소의 직접 `sqlite3` 접근을 SQLAlchemy 엔진 조회로 교체했다.
- Reason: 로그인/세션 검증도 같은 RDS 기준을 사용해야 하기 때문.

### Update 4
- Time: 2026-05-12
- Change: PostgreSQL startup에서 깨질 수 있는 raw SQL 파라미터와 `INSERT OR IGNORE`를 SQLAlchemy `text()`/`ON CONFLICT` 방식으로 보정했다.
- Reason: SQLite 전용 문법과 qmark 파라미터는 psycopg/PostgreSQL에서 동작하지 않기 때문.

### Update 5
- Time: 2026-05-12
- Change: RDS 이관 과정에서 `bigint`로 들어간 boolean 컬럼 2개를 startup 보정으로 `boolean` 타입에 맞추도록 추가했다.
- Reason: SQLAlchemy 모델의 `Boolean` 매핑과 RDS 실제 타입을 맞추기 위함.

### Update 6
- Time: 2026-05-12
- Change: `AGENTS.md`, `ARCHITECTURE.md`, `DEV.md`, DB 문서의 운영 기준을 RDS로 갱신했다.
- Reason: 다음 작업에서 운영 DB를 다시 `modular.db`로 오해하지 않도록 source-of-truth를 갱신하기 위함.

## Result
- 앱 런타임 DB 연결이 RDS PostgreSQL 기준으로 전환됐다.
- `app/*.py` 런타임 코드에서 직접 `sqlite3` 또는 루트 `modular.db`를 여는 경로는 제거됐다.
- 노트북/레거시 DB 생성 스크립트의 SQLite 참조는 운영 런타임이 아니라 데이터 생성/마이그레이션 자산이므로 이번 변경 범위에서 제외했다.

## Verification
- Checked:
  - `.venv/bin/pip install -r requirements.txt`
  - `.venv/bin/python -m compileall app`
  - `app.main.on_startup()` 직접 호출 성공
  - RDS `current_database()` = `modular_db`, `current_user` = `dbadmin`
  - RDS `admin_user` count = 1
  - RDS `admin_client.is_closed`, `child_test.requires_consent` 타입 = `boolean`
  - `get_modular_admin_by_username("admin")` RDS 조회 성공
  - 실제 `uvicorn app.main:app --host 127.0.0.1 --port 8120` startup 성공
  - `/health` 응답: `{"status":"ok","service":"router+service","ui":"react","db":"postgresql"}`
- Not checked:
  - `fastapi.testclient.TestClient` 검증은 `httpx` 미설치로 실행하지 못했고, 실제 uvicorn/curl 검증으로 대체했다.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 기존 런타임은 SQLAlchemy와 관리자 인증 우회 경로가 서로 다른 방식으로 SQLite `modular.db`를 참조했다.
- `.env` 로드가 DB 모듈 import 이후에 수행될 수 있는 구조라 RDS 환경변수 기반 전환에 취약했다.

### Why
- 과거에는 파일 DB 단일 기준이었고, 관리자 인증 저장소가 ORM이 아니라 직접 SQLite 연결을 사용했다.

### Next Time
- DB 연결 기준을 바꿀 때는 `app/db/session.py`뿐 아니라 직접 DB 접근 저장소와 startup raw SQL의 DB 방언 차이까지 함께 점검한다.

## Related Documents
- [AGENTS.md](../../AGENTS.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [docs/database/runtime-db.md](../database/runtime-db.md)
- [docs/database/schema-overview.md](../database/schema-overview.md)
