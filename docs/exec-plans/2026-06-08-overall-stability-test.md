# Execution Plan

## Task Title
- Overall stability test

## Request Summary
- 전반적인 안정성 테스트를 진행한다.

## Goal
- 현재 워크트리 상태에서 빌드, 정적 검사, 백엔드 import/startup, 로컬 런타임 헬스체크를 수행하고 실패 지점과 미검증 항목을 기록한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: `ARCHITECTURE.md`
  - DB: `docs/database/runtime-db.md`
  - UI/디자인: 해당 없음
  - 문서 체계: 해당 없음
  - 설명/디버깅: 해당 없음
  - 코드 정리 산출물: 해당 없음
- [x] 운영 DB가 필요한 작업이면 루트 `modular.db` 기준 확인
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- 현재 프로젝트는 정식 테스트 스위트가 제한적이므로, 안정성 검증은 프론트 빌드/린트, Python 컴파일/import, FastAPI 로컬 서버 기동, 핵심 URL 헬스체크 중심으로 진행한다.
- 운영 RDS 연결은 별도 SSH 터널과 운영 자격 증명이 필요할 수 있어 기본 검증 범위에서는 `APP_ENV=local.dev` 로컬 SQLite 기준으로 확인한다.

## Initial Plan
1. 패키지 스크립트와 테스트 파일 존재 여부를 확인한다.
2. 프론트 타입 체크 포함 빌드와 린트를 실행한다.
3. Python 소스 컴파일 및 FastAPI 앱 import를 확인한다.
4. 로컬 API 서버를 기동해 `/health`와 주요 SPA 라우트 응답을 확인한다.
5. 결과와 실패/미검증 항목을 문서에 갱신한다.

## Progress Updates
### Update 1
- Time: 2026-06-08
- Change: 실행계획 생성.
- Reason: 안정성 검증 범위와 기록 기준을 명확히 하기 위함.

### Update 2
- Time: 2026-06-08
- Change: 정적 검증과 빌드 검증 실행.
- Reason: 현재 워크트리 상태에서 타입/번들/문법 오류를 먼저 확인하기 위함.

### Update 3
- Time: 2026-06-08
- Change: 샌드박스 내부 서버 기동 후 별도 `curl` 접근이 실패해, 샌드박스 밖에서 서버 기동과 요청 검증을 같은 스크립트로 실행.
- Reason: 샌드박스 네트워크 격리로 로컬 포트 접근 검증이 분리 실행에서는 의미 있게 수행되지 않았기 때문.

### Update 4
- Time: 2026-06-08
- Change: EC2 SSH 터널을 일시적으로 열어 운영 RDS read-only 연결을 확인.
- Reason: `local.prod`/RDS 연결 검증이 빠져 있다는 사용자 지적을 반영하기 위함. `APP_ENV=local.prod` 서버 기동은 startup schema 보정이 운영 RDS에 쓰기를 수행할 수 있어 수행하지 않고, read-only SELECT로 대체했다.

## Result
- 프론트 production build, ESLint, Python compile, FastAPI app import, 로컬 서버 startup, 주요 SPA 라우트와 핵심 API 오류 응답 스모크 테스트가 통과했다.
- 기존 `test_flow.js`도 브라우저 콘솔 오류 없이 완료되었다.
- 단, `/api/admin/report/48`은 HTTP 200 응답 본문에 `{"error":"not_found"}`를 반환했다. 로컬 DB에 해당 리포트 데이터가 없어서 플로우 검증의 데이터 커버리지는 제한적이다.
- EC2 SSH 터널을 통한 RDS read-only 연결이 성공했다.

## Verification
- Checked:
  - `npm run build:frontend`: 성공. Vite chunk size warning 발생.
  - `npm --prefix frontend run lint`: 성공. Fast Refresh warning 3건 발생.
  - `.venv/bin/python -m compileall app scripts`: 성공.
  - `APP_ENV=local.dev .venv/bin/python -c "from app.main import app; ..."`: 성공. 앱 제목 `Screening App`, route 수 70.
  - `scripts/dev_preflight.py`: 성공. 기존 8120 stale server PID를 정리함.
  - 로컬 서버 `APP_ENV=local.dev` startup: 성공.
  - `GET /health`: 200, `{"status":"ok","service":"router+service","ui":"react","db":"sqlite"}`.
  - `GET /admin`: 200, React SPA HTML 반환.
  - `GET /assessment/custom/invalid-token-for-smoke`: 200, React SPA HTML 반환.
  - `GET /report/1?token=invalid-token-for-smoke`: 200, React SPA HTML 반환.
  - `GET /api/admin/me`: 401, 관리자 로그인 필요 메시지 반환.
  - `GET /api/assessment-links/invalid-token-for-smoke`: 404, 유효하지 않은 검사 URL 메시지 반환.
  - `node test_flow.js`: 완료. 콘솔/page error 없음.
  - EC2 SSH 터널 `127.0.0.1:15432 -> RDS:5432`: 성공.
  - RDS read-only SELECT: 성공. `current_database()` = `modular_db`, `current_user` = `dbadmin`, PostgreSQL `17.9`.
  - RDS public table count: 29.
  - RDS 주요 row count: `admin_user` 1, `child_test` 33, `admin_custom_test_submission` 53.
- Not checked:
  - `APP_ENV=local.prod` FastAPI 서버 startup 및 `/health`는 수행하지 않음. startup 경로가 운영 RDS에 schema/table 보정 쓰기를 수행할 수 있어 read-only 연결 검증으로 대체함.
  - 전체 사용자 플로우의 실제 제출/채점/보고서 생성은 데이터 세팅이 필요한 E2E로 수행하지 않음.
  - Python/TS 정식 단위 테스트 스위트는 발견되지 않아 별도 실행하지 않음.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 안정성 검증 과정에서 즉시 차단되는 빌드/기동 오류는 발견되지 않았다.
- 자동화 테스트 체계가 제한적이고, 기존 `test_flow.js`는 고정 submission/report ID 48에 의존한다.

### Why
- 현재 저장소의 root `npm test`는 테스트를 실행하지 않고 실패하도록 정의되어 있으며, Python 테스트 파일 패턴도 사실상 없다.
- 데이터 의존 스모크 테스트는 로컬 DB 상태가 바뀌면 검증 의미가 줄어든다.

### Next Time
- 제출 생성부터 채점, 보고서 열람까지 테스트 데이터를 직접 만들고 정리하는 E2E 스모크 스크립트를 별도로 두는 것이 좋다.
- `/api/admin/report/{id}`의 not_found 응답은 HTTP 200보다 404가 더 명확한지 API 계약 관점에서 검토할 수 있다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
- [docs/database/runtime-db.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/runtime-db.md)
