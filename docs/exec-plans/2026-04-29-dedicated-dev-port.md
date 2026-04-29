# Execution Plan

## Task Title
- Dedicated development ports for this web app

## Request Summary
- 기존 `8000` 포트 충돌 때문에 앱이 켜지지 않는 문제를 피하도록 이 웹 전용 고정 포트를 정한다.

## Goal
- FastAPI 통합 앱은 `127.0.0.1:8120`으로 실행한다.
- Vite 개발 서버는 `127.0.0.1:5120`으로 고정한다.
- 프런트 개발 proxy와 점검 스크립트의 기본 URL을 새 포트에 맞춘다.

## Initial Hypothesis
- 앱 import/startup 자체는 정상이고, `8000` 포트 점유 때문에 uvicorn bind 단계에서 실패한다.

## Initial Plan
1. 루트 실행 스크립트에 전용 백엔드 포트를 추가한다.
2. Vite dev server와 proxy target을 전용 포트 기준으로 수정한다.
3. 기본 점검 URL과 실행 안내 문구를 새 포트로 정리한다.
4. 빌드 및 서버 시작으로 설정을 검증한다.

## Progress Updates
### Update 1
- Time: 2026-04-29
- Change: `npm run dev`가 `127.0.0.1:8120`에서 FastAPI 앱을 실행하도록 추가했다.
- Reason: 루트에서 `npm run dev`를 실행해도 이 프로젝트 서버가 바로 뜨게 하기 위해서다.

### Update 2
- Time: 2026-04-29
- Change: Vite dev server를 `5120`으로 고정하고 proxy target을 `127.0.0.1:8120`으로 변경했다.
- Reason: 프런트 개발 서버와 백엔드 서버가 각각 예측 가능한 포트를 쓰게 하기 위해서다.

### Update 3
- Time: 2026-04-29
- Change: `ARCHITECTURE.md`에 `Local Development Runtime` 섹션을 추가하고, `AGENTS.md`와 `docs/README.md`에는 짧은 진입점만 추가했다.
- Reason: 포트와 실행 명령의 상세 기준은 구조 문서 한 곳에서 관리하고, 허브/상위 지도에는 중복 본문을 두지 않기 위해서다.

## Result
- Runtime defaults now use dedicated ports: FastAPI on `127.0.0.1:8120`, Vite on `127.0.0.1:5120`.

## Verification
- Checked:
  - `npm run dev` starts uvicorn on `http://127.0.0.1:8120`.
  - `npm run dev:frontend` starts Vite on `http://localhost:5120`.
  - `npm --prefix frontend run build` completes successfully.
- Not checked:
  - Browser screenshot validation was not needed because this change only adjusts runtime ports and scripts.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 기존 기본 실행 포트 `8000`이 다른 프로세스와 충돌할 수 있었다.

### Why
- 이 저장소 전용 실행 포트가 명시되지 않았고, 루트 `npm run dev`도 정의되어 있지 않았다.

### Next Time
- 로컬 개발 앱은 프로젝트별 고정 포트와 루트 실행 스크립트를 같이 둔다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
