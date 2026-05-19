# npm run dev 최신 코드 보장

## Task Title
- `npm run dev` 실행 시 stale dev server 방지

## Request Summary
- 사용자가 `npm run dev`를 실행해도 기존 8120/5120 프로세스가 남아 최신 백엔드 코드가 반영되지 않는 문제가 있었다.
- `npm run dev`가 항상 현재 파일 기준 새 백엔드/프론트 dev server를 띄우도록 정리한다.

## Goal
- `npm run dev` 시작 전에 고정 포트 8120, 5120의 기존 dev 프로세스를 종료한다.
- 포트 충돌로 새 서버가 뜨지 않는 상태를 방지한다.
- 종료 대상은 이 저장소 dev server로 제한한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: `ARCHITECTURE.md`
  - DB: 해당 없음
  - UI/디자인: 해당 없음
  - 문서 체계: `docs/doc-governance.md`
  - 설명/디버깅: 해당 없음
  - 코드 정리 산출물: 해당 없음
- [ ] 운영 DB가 필요한 작업이면 루트 `modular.db` 기준 확인
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- `uvicorn --reload`는 실행 중인 프로세스에는 유효하지만, 이미 오래된 서버가 포트를 점유하면 새 `npm run dev`는 실패하고 사용자는 계속 stale 서버를 보게 된다.
- 시작 전 포트 preflight로 기존 dev 서버를 종료하면 새 프로세스가 현재 소스를 import한다.

## Initial Plan
1. `package.json`의 `dev` 앞에 preflight 스크립트를 추가한다.
2. preflight 스크립트는 Linux `/proc` 기준으로 8120/5120 listener를 찾는다.
3. 이 저장소 경로 또는 dev command 패턴에 맞는 프로세스만 종료한다.
4. 스크립트 syntax와 dry-run 결과를 검증한다.

## Progress Updates
### Update 1
- Time: 2026-05-04
- Change: `scripts/dev_preflight.py`를 추가하고 `package.json`의 `predev`에 연결했다.
- Reason: `npm run dev`가 새 서버를 띄우기 전에 기존 stale 8120/5120 dev server를 종료하기 위함

### Update 2
- Time: 2026-05-04
- Change: 실제 `npm run dev`를 실행해 기존 8120/5120 프로세스 종료 후 새 uvicorn/vite가 뜨는지 확인했다.
- Reason: preflight가 dry-run뿐 아니라 실제 포트 충돌을 해소하는지 검증하기 위함

## Result
- `npm run dev` 실행 시 npm lifecycle의 `predev`가 먼저 실행된다.
- `predev`는 8120/5120 listener 중 이 저장소의 `uvicorn`, `vite`, `npm run dev` 계열 프로세스만 종료한다.
- 이후 새 `uvicorn app.main:app --reload`와 Vite dev server가 시작된다.
- 현재 검증 기준으로 새 8120 서버는 PAT-2 catalog 6구간과 생성 저장값 6구간을 반환한다.

## Verification
- Checked:
  - `.venv/bin/python -m py_compile scripts/dev_preflight.py`
  - `.venv/bin/python scripts/dev_preflight.py --dry-run`
  - `npm run predev -- --dry-run`
  - `npm run dev` 실제 실행
  - 8120 HTTP 검증: `/api/admin/tests/catalog` PAT-2 sub_tests 6
  - 8120 HTTP 생성 검증: `sub_PAT2=6`, `selected_PAT2=6`
- Not checked:
  - Windows PowerShell 단독 실행 환경은 확인하지 않았다. 현재 프로젝트 기준은 WSL/bash 경로다.

## Retrospective
### Classification
- `Execution Judgment Problem`

### What Was Wrong
- `npm run dev` 재실행 실패를 보고도 기존 포트 점유 프로세스가 사용자 브라우저의 실제 백엔드라는 점을 바로 고정하지 못했다.

### Why
- `uvicorn --reload`가 있으면 최신 코드가 반영된다고 가정했지만, 새 프로세스가 뜨지 못하면 reload 이전 문제다.

### Next Time
- 고정 포트 dev server는 시작 전에 stale listener를 먼저 정리한다.
- 실제 런타임 검증은 현재 사용 포트의 HTTP 응답으로 확인한다.

## Related Documents
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
- [package.json](/mnt/c/Users/user/workspace/2.0-modular/package.json)
