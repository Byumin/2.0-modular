# Execution Plan

## Task Title
- 서버 실행 문서 정리

## Request Summary
- 서버를 띄우는 방법이 복잡하므로 어떤 명령을 입력해야 하는지, 프론트 수정이 어떻게 반영되는지 문서로 정리한다.

## Goal
- 서버 실행 source-of-truth인 `docs/runtime-run-modes.md`에 복붙 가능한 빠른 실행 흐름을 추가한다.
- 로컬 개발자가 바로 찾을 수 있는 `DEV.md`에는 빠른 안내와 source-of-truth 링크를 명확히 둔다.
- 기존 문서 체계와 충돌하거나 새 source-of-truth를 만들지 않는다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: `ARCHITECTURE.md`
  - 문서 체계: `docs/doc-governance.md`
- [x] 운영 DB가 필요한 작업이면 루트 `modular.db` 기준 확인: 해당 없음
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- 이미 `docs/runtime-run-modes.md`가 서버 실행 source-of-truth로 지정되어 있으므로 새 문서보다 기존 문서 보강이 맞다.
- `DEV.md`는 로컬 개발 빠른 가이드로 남기되 상세 운영 기준은 `docs/runtime-run-modes.md`로 연결하는 편이 중복을 줄인다.

## Initial Plan
1. `package.json`, `frontend/vite.config.ts`, 기존 실행 문서를 대조한다.
2. `docs/runtime-run-modes.md`에 빠른 시작, 프론트 반영 방식, 명령 선택 기준을 보강한다.
3. `DEV.md`를 사용자 친화적인 로컬 실행 가이드로 다듬고 상세 기준 링크를 추가한다.
4. 문서 내 명령/포트/APP_ENV가 실제 스크립트와 맞는지 확인한다.

## Progress Updates
### Update 1
- Time: 2026-05-26 17:20 KST
- Change: `AGENTS.md`, `docs/doc-governance.md`, `docs/exec-plans/README.md`, `ARCHITECTURE.md`, `docs/runtime-run-modes.md`, `DEV.md`, `package.json`, `frontend/vite.config.ts` 확인
- Reason: 문서 체계 기준과 실제 실행 스크립트를 맞추기 위함

### Update 2
- Time: 2026-05-26 17:20 KST
- Change: `docs/runtime-run-modes.md`에 가장 빠른 실행법, 프런트 수정 반영 기준, 자주 쓰는 주소를 추가
- Reason: source-of-truth 문서에서 명령 선택과 프런트 반영 방식을 바로 확인할 수 있게 하기 위함

### Update 3
- Time: 2026-05-26 17:20 KST
- Change: `DEV.md` 상단에 결론부터 보는 로컬 실행 안내와 명령 선택표, 프런트 수정 미반영 시 확인 순서를 추가
- Reason: 로컬 개발자가 긴 운영 문서를 읽기 전에 바로 실행할 수 있게 하기 위함

### Update 4
- Time: 2026-05-26 17:31 KST
- Change: 사용자의 혼란 지점 재확인 후 `npm run dev`를 실제 실행하고 `/health`, `8120/admin`, `5120/admin` 응답을 확인
- Reason: 문서가 설명하는 실행 결과와 실제 동작이 맞는지 확인하기 위함

### Update 5
- Time: 2026-05-26 17:31 KST
- Change: `/health`가 실제 DB dialect가 아니라 `postgresql`을 하드코딩하는 문제 발견
- Reason: `npm run dev`에서 어떤 DB를 보는지 확인하는 가장 쉬운 방법이 잘못된 값을 보여주고 있었음

### Update 6
- Time: 2026-05-26 17:32 KST
- Change: `app/router/page_router.py`의 `/health`가 `engine.dialect.name`을 반환하도록 수정하고, 실행 문서에 `npm run dev`/`npm run dev:api`의 React 서빙 방식과 DB 기준을 명확히 추가
- Reason: 문서와 실제 확인 방법이 모두 같은 기준을 가리키게 하기 위함

### Update 7
- Time: 2026-05-26 17:40 KST
- Change: 서버 실행 문서를 DB 기준 3모드로 재구성
- Reason: 로컬 DB 모드, 로컬에서 EC2 터널로 RDS를 보는 모드, EC2 운영 모드를 명확히 분리하기 위함

## Result
- `docs/runtime-run-modes.md`에 `npm run dev`와 `npm run dev:api`의 차이를 명확히 적었다.
  - 둘 다 React 화면을 볼 수 있음
  - `npm run dev`: Vite `5120`에서 `frontend/src`를 서빙하고 프런트 수정이 바로 반영됨
  - `npm run dev:api`: FastAPI `8120`에서 `frontend/dist` 빌드본을 서빙하고 프런트 수정은 빌드/재시작 필요
- 두 명령 모두 기본 DB는 `APP_ENV=local.dev` → `env.local.dev` → `sqlite:///./modular.db`임을 문서화했다.
- 실행 모드를 DB 기준 3가지로 문서화했다.
  - 로컬 DB 모드: 내 PC/WSL에서 `modular.db`
  - 로컬에서 RDS 보기: 내 PC/WSL에서 EC2 SSH 터널로 RDS
  - EC2 운영 모드: EC2에서 RDS 직접 접속
- `/health`가 실제 DB dialect를 반환하도록 수정했다.

## Verification
- Checked:
  - `package.json`의 `dev`, `dev:api`, `dev:frontend`, `build:frontend`, `prod:api`, `ec2:api` 스크립트와 문서의 명령이 일치하는지 확인
  - `frontend/vite.config.ts`의 Vite 포트 `5120`, proxy 대상 `127.0.0.1:8120`과 문서의 포트 설명이 일치하는지 확인
  - `npm run dev` 실제 실행 확인
  - `curl http://127.0.0.1:8120/health` 응답 확인: `"db":"sqlite"`
  - `curl http://127.0.0.1:8120/admin` 응답 확인: FastAPI가 `frontend/dist` HTML 반환
  - `curl http://localhost:5120/admin` 응답 확인: Vite가 React 개발 서버 HTML 반환
- Not checked:
  - 브라우저 수동 화면 캡처는 하지 않음

## Retrospective
### Classification
- `Mixed`

### What Was Wrong
- 문서가 `npm run dev`와 `npm run dev:api`를 "화면이 보이냐/안 보이냐"가 아니라 "누가 React를 서빙하느냐" 기준으로 설명하지 못했다.
- `/health`가 실제 DB 상태가 아니라 `postgresql` 문자열을 하드코딩하고 있었다.

### Why
- 실행 모드 문서가 운영자 관점으로 작성되어 로컬 개발자가 실제로 보는 주소와 반영 방식을 충분히 구분하지 못했다.
- DB 확인 엔드포인트가 실제 엔진 값을 사용하지 않아 로컬 개발 모드 확인 방법으로 부적절했다.

### Next Time
- 실행 문서는 명령, 접속 주소, React 파일 출처, 프런트 반영 방식, DB를 한 표에서 같이 설명한다.
- DB 상태를 문서화할 때는 `/health` 같은 확인 명령이 실제 런타임 값을 반환하는지 먼저 검증한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [docs/runtime-run-modes.md](/mnt/c/Users/user/workspace/2.0-modular/docs/runtime-run-modes.md)
- [DEV.md](/mnt/c/Users/user/workspace/2.0-modular/DEV.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
