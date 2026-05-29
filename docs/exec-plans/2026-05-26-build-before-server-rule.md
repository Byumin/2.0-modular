# Build Before Server Rule

## Request Summary
서버를 띄우기 전에 프런트엔드 빌드를 항상 먼저 실행하도록 규칙화한다.

## Goal
- `http://127.0.0.1:8120/*`에서 보는 FastAPI 통합 화면이 오래된 `frontend/dist`를 보지 않게 한다.
- 서버 실행 npm 스크립트가 빌드를 선행하도록 강제한다.
- 실행 모드 문서에 이 규칙을 반영한다.

## Preflight Checklist
- `AGENTS.md` 확인 완료.
- `docs/exec-plans/README.md` 확인 완료.
- 관련 source-of-truth: `docs/runtime-run-modes.md`, `package.json`.

## Initial Hypothesis
현재 `8120`은 `frontend/dist`를 서빙하므로, 서버 시작 전에 `npm run build:frontend`를 실행하면 통합 앱에서 최신 프런트 산출물을 볼 수 있다.

## Plan
1. 서버 실행 스크립트 앞에 공통 준비 스크립트를 둔다.
2. `dev`, `dev:api`, `prod:api`, `ec2:api`가 서버 시작 전에 준비 스크립트를 실행하게 한다.
3. 실행 모드 문서를 최신 동작에 맞게 수정한다.
4. 빌드와 서버 기동을 검증한다.

## Changes During Work
- `package.json`에 `prepare:server`를 추가했다.
- `dev`, `dev:api`, `prod:api`, `ec2:api`가 `prepare:server`를 먼저 실행하도록 변경했다.
- `dev`는 `npm run dev:api` 중첩 호출 대신 uvicorn 명령을 직접 실행하도록 바꿔 중복 빌드를 피했다.
- `docs/runtime-run-modes.md`, `DEV.md`에 서버 시작 전 프런트 빌드 규칙을 반영했다.

## Result
- 서버 실행 명령은 이제 모두 `prepare:server`를 먼저 실행한다.
- `prepare:server`는 stale dev server 정리 후 `npm run build:frontend`를 실행한다.
- `npm run dev`는 빌드 후 FastAPI와 Vite를 동시에 띄운다.

## Verification
- `npm run build:frontend` 성공.
- 변경 후 `npm run dev` 실행 시 `prepare:server -> build:frontend -> uvicorn/vite startup` 순서 확인.
- `http://127.0.0.1:8120/health` 응답 확인.
- `http://127.0.0.1:8120/admin` GET 응답이 `frontend/dist/index.html` HTML을 반환하는 것 확인.
- `http://localhost:5120/admin` 응답 확인.

## Retrospective
- 기존 실행 모드는 문서상 구분은 되어 있었지만, `8120` 확인을 자주 쓰는 작업 흐름에서는 stale `frontend/dist`가 쉽게 남았다.
- 이번 변경은 실행 명령 자체에 빌드를 강제해 같은 혼선을 줄인다.
