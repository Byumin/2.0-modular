# Env File Selection Verify

## Request Summary
- 목적별 env 파일을 올렸으니 서버 실행 시 해당 env 파일을 제대로 읽는지 검토하고 검증한다.

## Goal
- `APP_ENV=local.dev/local.prod/ec2.prod`에 따라 올바른 env 파일을 읽는다.
- 비밀값은 출력하지 않고 로딩 파일, DB dialect/host/port, 쿠키 secure 기준만 검증한다.
- 루트 `.env`가 목적별 env 선택을 오염시키지 않게 한다.

## Initial Hypothesis
- 실제 파일명은 `env.local.dev`, `env.local.prod`, `env.ec2.prod`인데 코드가 `.env.local.*`를 찾으면 로딩이 실패한다.
- `app/main.py`의 루트 `.env` 추가 로딩은 목적별 env 구조와 충돌할 수 있다.

## Preflight Checklist
- `AGENTS.md` 확인 완료.
- `app/db/session.py`, `app/main.py`, `package.json`, env 파일 목록 확인 완료.

## Plan
1. env 파일명과 코드 매핑을 맞춘다.
2. `app/main.py`의 별도 루트 `.env` 로딩을 제거하거나 목적별 env 기준으로 정리한다.
3. `APP_ENV`별 실제 로딩 결과를 마스킹해서 검증한다.
4. 서버 import/startup 수준 검증을 수행한다.

## Changes During Work
- `app/db/session.py`의 env 파일 매핑을 실제 파일명(`env.local.dev`, `env.local.prod`, `env.ec2.prod`) 기준으로 수정했다.
- `app/main.py`의 루트 `.env` 추가 로딩을 제거했다. env 로딩 책임은 `app/db/session.py` 한 곳으로 둔다.
- `package.json`에 EC2 운영 DB 직접 연결용 `npm run ec2:api` 스크립트를 추가했다.
- `docs/runtime-run-modes.md`, `docs/database/runtime-db.md`의 env 파일명을 실제 파일명 기준으로 정리했다.
- `DEV.md`, `ARCHITECTURE.md`에 남아 있던 예전 `.env.*` 파일명과 EC2 실행 명령 설명을 현재 기준으로 정리했다.
- `docs/runtime-run-modes.md`에 EC2에서 `APP_ENV` 없이 직접 `uvicorn`을 실행하면 `local.dev`로 떨어지는 주의사항과 Caddy `daemon-reload`/restart 절차를 추가했다.
- `.gitignore`에 `env.*`를 추가해 목적별 env 파일이 실수로 커밋되지 않도록 했다.

## Result
- `APP_ENV`별 목적에 맞는 env 파일 선택을 확인했다.
- EC2 서버에서는 `APP_ENV=ec2.prod` / `npm run ec2:api`를 사용해야 RDS에 직접 연결된다.
- `APP_ENV=local.dev`는 현재 `env.local.dev` 안의 SQLite 경로가 Mac 절대경로라서 EC2에서 서버 기동용으로는 부적합하다.

## Verification
- `APP_ENV=local.dev`: `env.local.dev`, SQLite, database `/Users/mac/insight_/2.0-modular/modular.db` 선택 확인.
- `APP_ENV=local.prod`: `env.local.prod`, PostgreSQL, host `localhost`, port `15432` 선택 확인.
- `APP_ENV=ec2.prod`: `env.ec2.prod`, PostgreSQL, RDS 직접 연결, port `5432` 선택 확인.
- `APP_ENV=ec2.prod`로 RDS `select 1` 성공.
- `npm run ec2:api` startup 성공.
- `curl http://127.0.0.1:8120/health` 응답: `{"status":"ok","service":"router+service","ui":"react","db":"postgresql"}`.
- `curl http://127.0.0.1:8120/admin` 및 `/assessment/custom/Gl2LASqVIs9NoOFZQKACPeAD8CHHFe5r`가 React SPA HTML을 반환함.

## Retrospective
- 원인은 코드/문서가 점 붙은 `.env.local.*` 파일명을 기준으로 되어 있었지만, 실제 업로드된 파일은 `env.local.*`였던 것이다.
- 루트 `.env` 로딩이 별도로 남아 있으면 목적별 env 파일에서 누락된 값이 루트 `.env`로 보강되어 잘못된 환경 조합이 만들어질 수 있어 제거하는 편이 맞다.
