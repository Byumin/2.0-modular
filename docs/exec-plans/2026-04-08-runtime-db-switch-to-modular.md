# Execution Plan

## Task Title
- Runtime DB 기준을 `app.db`에서 `modular.db`로 전환

## Request Summary
- 현재 문서와 코드에서는 `app.db`를 기본 런타임 DB로 보고 있다.
- 실제 적용 기준은 `modular.db`여야 하므로 이를 반영해야 한다.

## Goal
- 런타임 DB 연결 기준을 `modular.db`로 바꾼다.
- 관련 DB 문서도 같은 기준으로 정리한다.
- 나중에 왜 바뀌었는지 추적 가능하게 기록을 남긴다.

## Initial Hypothesis
- 핵심 런타임 연결은 `app/db/session.py`의 `DATABASE_URL` 한 곳에서 결정된다.
- DB 문서 세트는 이 기준을 따라 같이 수정해야 한다.
- 일부 스크립트/노트북은 여전히 `app.db` 또는 `docs/modular.db`를 가리킬 수 있으나, 이번 요청의 핵심은 앱 런타임 기준 전환이다.

## Initial Plan
1. `app.db`와 `modular.db` 참조 위치를 확인한다.
2. `app/db/session.py`의 런타임 DB 연결을 `modular.db`로 변경한다.
3. `docs/database/` 문서에서 운영 기준 DB 설명을 `modular.db`로 수정한다.
4. 변경 결과를 검토하고, 남은 영향 범위를 기록한다.

## Progress Updates
### Update 1
- Time: 2026-04-08 15:35:36 KST
- Change: 참조 검색을 통해 런타임 DB와 문서 위치를 확인함
- Reason: 실제 코드 기준 변경 지점을 먼저 확정해야 했음

## Result
- `app/db/session.py`의 런타임 DB 연결을 `modular.db`로 변경함
- `docs/database/` 문서에서 운영 기준 DB 설명을 `modular.db` 기준으로 수정함
- 스크립트와 노트북에는 `app.db` 또는 `docs/modular.db` 참조가 일부 남아 있어 후속 검토 대상임

## Verification
- Checked:
  - `app/db/session.py`의 `DATABASE_URL`
  - `docs/database/README.md`
  - `docs/database/runtime-db.md`
  - `docs/database/assets-inventory.md`
- Not checked:
  - `scripts/*.py`의 개별 DB 경로 의도
  - `ipynb` 내 하드코딩 DB 경로 정리

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 현재 문서 세트가 막 생성된 직후여서 `app.db` 기준으로 작성되어 있었음
- 저장소 내부에 과거/보조 DB 경로가 혼재되어 있어 운영 기준과 참고 자산 구분이 더 중요해짐

### Why
- 실제 런타임 연결은 코드 한 곳에서 바뀌지만, 문서는 그보다 늦게 따라가면 혼선이 생김

### Next Time
- 런타임 기준 파일을 바꾸는 작업에서는 스크립트/노트북/문서까지 한 번에 검색해서 기준과 예외를 명확히 남긴다

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [docs/database/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/README.md)
- [docs/database/runtime-db.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/runtime-db.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
