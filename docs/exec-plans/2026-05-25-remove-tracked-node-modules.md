# Remove Tracked node_modules

## Request Summary
`main` 승격 후 보완점으로 확인된 추적 중인 `node_modules`를 정리한다.

## Goal
- 로컬 `node_modules/` 폴더는 유지한다.
- Git 인덱스에서만 `node_modules/**`를 제거한다.
- 이미 `.gitignore`에 있는 `node_modules/` 규칙이 이후 새 의존성 파일을 무시하게 한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] `docs/exec-plans/README.md` 확인
- [x] 현재 브랜치와 working tree 상태 확인

## Initial Hypothesis
`node_modules/`가 `.gitignore`에 있음에도 과거 커밋으로 이미 Git 추적 대상이 되었기 때문에 계속 `main`에 포함되어 있다. `git rm -r --cached node_modules`로 인덱스에서만 제거하면 로컬 런타임 영향 없이 저장소를 정리할 수 있다.

## Plan
1. 추적 중인 `node_modules/**` 파일 수를 재확인한다.
2. `git rm -r --cached node_modules`로 인덱스에서 제거한다.
3. `git status`와 `git ls-files`로 제거 범위를 검증한다.
4. 백엔드 컴파일과 프런트 lint/build를 재실행한다.

## Changes During Work
- `git rm -r --cached node_modules`로 루트 `node_modules/**` 17,895개 파일을 Git 인덱스에서 제거했다.
- 로컬 `node_modules/` 디렉터리는 삭제하지 않고 유지했다.

## Result
- `git ls-files 'node_modules/**'` 결과가 0개로 줄었다.
- `.gitignore`의 기존 `node_modules/` 규칙이 이후 새 dependency 설치물에도 적용된다.

## Verification
- `test -d node_modules`: 로컬 폴더 존재 확인
- `.venv/bin/python -m compileall -q app`: 통과
- `npm --prefix frontend run lint`: 통과, 기존 Fast Refresh warning 3개 유지
- `npm --prefix frontend run build`: 통과, 기존 chunk size warning 유지

## Retrospective
- Plan Problem: 없음
- Execution Judgment Problem: 없음
- Residual Risk: 이 변경은 Git 추적만 해제하므로 런타임 코드는 바뀌지 않는다. 단, 새 clone 환경에서는 루트 `npm install` 또는 필요한 package install을 실행해야 루트 개발 도구를 사용할 수 있다.
