# Execution Plan

## Task Title
- 관리자 비밀번호 해싱 SHA256 → bcrypt 이전 (S-1 / TD-010)

## Request Summary
- 운영 준비 To-Do의 High 항목 S-1을 해결한다.
- 현재 SHA256 salt 없는 단순 해싱을 bcrypt로 교체하되, 기존 SHA256 해시 로그인을 깨지 않게 무중단 마이그레이션한다.

## Goal
- 신규/변경 비밀번호는 bcrypt로 저장된다.
- 기존 SHA256 해시 사용자는 로그인 성공 시 자동으로 bcrypt로 재해싱된다.
- `requirements.txt`에 `passlib[bcrypt]` 추가.
- 죽은 코드 `app/services/admin/auth.py:make_password_hash`는 제거한다.
- `docs/todo-production-readiness.md`의 S-1과 `docs/technical-debt.md`의 TD-010을 resolved로 갱신한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: `app/services/admin/modular_auth.py`, `app/services/admin/auth.py`, `app/modular_auth_repository.py`
  - DB: 스키마 변경 없음 (기존 `password_hash` 컬럼 그대로 사용)
  - UI/디자인: 해당 없음
  - 문서 체계: `docs/todo-production-readiness.md`, `docs/technical-debt.md` 갱신
- [x] 운영 DB 영향: 로그인 시 자동 재해싱으로 RDS `admin_user.password_hash` 값이 점진 갱신됨
- [x] 검증 방법: 로컬에서 신규 admin 생성/로그인, 기존 SHA256 해시 시뮬레이션 로그인 후 bcrypt 재해싱 확인

## Initial Hypothesis
- `passlib.context.CryptContext`로 단일 진입점에서 bcrypt + legacy SHA256 양쪽 검증이 가능하다.
- bcrypt 해시는 `$2b$` 접두사로 식별 가능하므로 prefix 분기로 충분하다.

## Initial Plan
1. `requirements.txt`에 `passlib[bcrypt]==1.7.4` 추가, 가상환경에 설치.
2. `app/services/admin/modular_auth.py`에 hash/verify 헬퍼 신설:
   - `hash_password(raw) -> bcrypt hash`
   - `verify_password(raw, stored) -> (ok: bool, needs_rehash: bool)` — bcrypt면 bcrypt.verify, 그 외(64자 hex)는 SHA256 비교 + `needs_rehash=True`
3. `verify_modular_admin_login`에서 검증 성공 + `needs_rehash`이면 새 bcrypt 해시로 DB 업데이트.
4. `ensure_default_modular_admin`에서 신규 생성 시 bcrypt 사용.
5. `app/modular_auth_repository.py`에 `update_modular_admin_password_hash(admin_id, new_hash)` 추가.
6. `app/services/admin/auth.py`의 dead `make_password_hash` 제거.
7. `docs/todo-production-readiness.md` S-1, `docs/technical-debt.md` TD-010 resolved 처리.
8. 검증:
   - 신규 admin 생성 후 비밀번호 hash 형식이 `$2b$`로 시작
   - SHA256 hash가 저장된 기존 행 시뮬레이션 → 로그인 성공 → 행이 `$2b$`로 갱신됨
   - 잘못된 비밀번호는 401
   - 백엔드 startup 정상 (ensure_default_modular_admin 경로)

## Progress Updates
### Update 1
- Time: 2026-05-25
- Change: requirements.txt에 `passlib[bcrypt]==1.7.4` 추가 후 설치 시도 → passlib 1.7.4와 bcrypt 5.0 호환성 이슈 발견 (`AttributeError: module 'bcrypt' has no attribute '__about__'`).
- Reason: passlib 마지막 릴리즈가 2020년이라 최신 bcrypt와 깨짐.

### Update 2
- Time: 2026-05-25
- Change: passlib 제거하고 `bcrypt==5.0.0` 직접 사용으로 전환. requirements.txt 갱신.
- Reason: 의존성 축소 + 호환성 문제 회피. 사전 논의에서도 "passlib 없이 bcrypt만으로 충분" 합의됨.

### Update 3
- Time: 2026-05-25
- Change: `app/services/admin/modular_auth.py`에 `make_modular_password_hash`(bcrypt), `_verify_password`(bcrypt/legacy SHA256 양쪽 처리) 구현. `verify_modular_admin_login`에서 레거시 검증 성공 시 자동 재해싱 + DB 갱신.
- Reason: 무중단 마이그레이션 — 기존 SHA256 사용자가 로그인 한 번 하면 자동으로 bcrypt로 전환.

### Update 4
- Time: 2026-05-25
- Change: `app/modular_auth_repository.py`에 `update_modular_admin_password_hash` 추가. `app/services/admin/auth.py`의 dead `make_password_hash` + hashlib import 제거.
- Reason: 자동 재해싱이 호출할 DB 업데이트 경로 필요. dead code는 혼란 방지로 동시 정리.

### Update 5
- Time: 2026-05-25
- Change: bcrypt 72바이트 제한 안전 처리(`_truncate`) 추가. 9개 케이스 단위 검증 모두 통과.
- Reason: bcrypt 5.0이 72바이트 초과를 `ValueError`로 거부. 운영 admin은 짧지만 방어적 코드.

## Result
- 신규 admin은 bcrypt(`$2b$12$...`)로 저장.
- 기존 SHA256 해시 사용자도 로그인 가능 → 로그인 성공 시 RDS `admin_user.password_hash` 자동 갱신.
- 의존성 1개 추가(`bcrypt==5.0.0`). passlib은 미사용.
- 변경 파일: `requirements.txt`, `app/services/admin/modular_auth.py`, `app/services/admin/auth.py`, `app/modular_auth_repository.py`.

## Verification
- Checked:
  - `.venv/bin/python -m compileall -q app` → exit 0
  - 단위 테스트 9개 (신규 bcrypt 해시, bcrypt verify, 잘못된 비번 거부, 레거시 SHA256 검증 + needs_rehash 플래그, 레거시 잘못된 비번 거부, 알 수 없는 형식 거부, salt 무작위성, 깨진 bcrypt hash 무크래시, 100바이트 long password)
  - 통합 시나리오 (로컬 SQLite): 사용자 생성 → 레거시 SHA256 hash 주입 → 로그인 → DB의 password_hash가 `$2b$` 접두사로 자동 갱신 → 동일 비번 재로그인 성공 → 잘못된 비번 401. 5단계 모두 통과.
  - 백엔드 E2E (로컬 SQLite + 실제 FastAPI startup): uvicorn 부팅 정상 → `GET /health` 200 → `POST /api/admin/login` (admin/admin1234) 200 + 세션 쿠키 발급 → `GET /api/admin/me` 200 → 잘못된 비번 401. 로컬 SQLite admin id=1 의 password_hash가 검증 후 bcrypt 해시(`$2b$12$hD0pV...`, len=60)로 저장됨 확인.
- Not checked:
  - 실제 RDS에 대한 자동 재해싱 동작 (운영 admin 로그인 시 첫 검증 — read-only 검증이 가능한 경로가 없어 운영 적용 후 첫 로그인으로 확인 필요. 로직은 DB 종류와 무관하게 동일하게 작동.)
  - EC2에 `pip install -r requirements.txt` 재실행 (systemd 적용 runbook에 포함)

## Retrospective
### Classification
- `Plan Problem` (경미) — 초기 계획에서 passlib 사용을 가정했으나 호환성 문제로 전환 필요했음

### What Was Wrong
- passlib과 최신 bcrypt 사이 호환성을 사전에 확인 안 함

### Why
- passlib이 표준이라는 일반 지식만 가지고 plan에 포함 — 실제 venv 설치 후 확인 안 함

### Next Time
- Python 보안 라이브러리는 plan 단계에서 maintenance 상태(최근 릴리즈일) 확인하기

## Related Documents
- [Documentation Hub](../README.md)
- [docs/exec-plans/README.md](README.md)
- [docs/todo-production-readiness.md](../todo-production-readiness.md)
- [docs/technical-debt.md](../technical-debt.md)
- [AGENTS.md](../../AGENTS.md)
