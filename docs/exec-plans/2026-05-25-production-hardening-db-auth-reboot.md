# Production Hardening: DB Artifacts, Admin Seed, Reboot Check

## Request Summary
사용자가 남은 운영 보완 항목 1번(DB 파일 추적 정리), 2번(운영 기본 관리자 비밀번호 fallback 제거), 3번(systemd 재부팅 검증)을 진행하라고 요청했다.

## Goal
- 운영 런타임 대상이 아닌 SQLite DB 파일을 로컬에는 보존하되 Git 추적에서 제거한다.
- 운영에서 `admin/admin1234` fallback으로 새 관리자 계정이 생성되지 않게 한다.
- systemd 등록 상태가 재부팅 후에도 유지되는지 검증한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] `docs/exec-plans/README.md` 확인
- [x] `docs/database/runtime-db.md` 확인
- [x] 현재 Git 상태 확인

## Initial Hypothesis
- `app.db`, `modular.db`, `frontend/modular.db`는 운영 RDS 런타임 대상이 아니므로 Git 추적에서 제거해도 운영 서비스에는 영향이 없다.
- `DEFAULT_ADMIN_ID/PW`를 무조건 요구하면 현재 EC2의 `env.ec2.prod`에 값이 없어 서비스 재시작이 실패할 수 있다.
- 더 안전한 변경은 기존 관리자 계정이 이미 있으면 startup을 통과시키고, 관리자 계정이 전혀 없을 때만 명시 env 없이는 실패하게 하는 것이다.

## Plan
1. 추적 중인 DB 파일 확인 후 `git rm --cached`로 인덱스에서 제거한다.
2. 관리자 계정 존재 확인 helper를 추가한다.
3. `seed_default_admin()`에서 env fallback 기본값을 제거하고, 빈 DB에서만 env 필수로 강제한다.
4. 관련 인증 문서를 갱신한다.
5. 컴파일, 프런트 lint/build, systemd restart, `/health` 검증을 수행한다.
6. 커밋/푸시 후 EC2 reboot 및 재접속 검증을 수행한다.

## Changes During Work
- `app.db`, `modular.db`, `frontend/modular.db`를 로컬 삭제 없이 Git 인덱스에서만 제거했다.
- `modular_admin_exists()` helper를 추가했다.
- `seed_default_admin()`에서 `admin/admin1234` fallback을 제거했다.
- 기존 관리자 계정이 있으면 env 없이 startup을 통과하고, 관리자 계정이 전혀 없으면 `DEFAULT_ADMIN_ID/PW` 없이는 실패하게 변경했다.
- 인증 문서의 startup 동작 설명을 갱신했다.

## Result
- Git 추적 중인 `*.db` 파일 수가 0개가 되었다.
- 로컬 DB 파일은 EC2 작업 디렉터리에 그대로 남아 있다.
- 운영 서비스는 `env.ec2.prod`에 `DEFAULT_ADMIN_ID/PW`가 없는 상태에서도 기존 관리자 계정이 있어 정상 재시작했다.

## Verification
- `test -f app.db && test -f modular.db && test -f frontend/modular.db`: 통과
- `git ls-files '*.db' '*.sqlite' '*.sqlite3' '*.db-wal' '*.db-shm' | wc -l`: 0
- `.venv/bin/python -m compileall -q app`: 통과
- `npm --prefix frontend run lint`: 통과, 기존 Fast Refresh warning 3개 유지
- `npm --prefix frontend run build`: 통과, 기존 chunk size warning 유지
- `sudo systemctl restart insight-backend`: 통과
- `systemctl is-enabled insight-backend`: enabled
- `systemctl is-active insight-backend`: active
- `curl -sS -i http://127.0.0.1:8120/health`: 200 OK

## Retrospective
- Plan Problem: 없음
- Execution Judgment Problem: 없음
- Residual Risk: 실제 EC2 reboot 검증은 커밋/푸시 후 별도 수행한다. reboot 중 대화 세션이 일시적으로 끊길 수 있다.
