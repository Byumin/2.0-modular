# Execution Plan

## Task Title
- RDS `FAT_first` 오등록 원본 검사 데이터 삭제

## Request Summary
- RDS에서 잘못 생성된 `FAT_first` test row와 이 row에서 전파된 원본 검사 계열 데이터를 삭제한다.
- 정상 ID인 `FAT_FIRST`는 삭제하지 않는다.

## Goal
- `test.id = 'FAT_first'` exact match 기준으로만 관련 row를 삭제한다.
- FK 순서를 지켜 `item`, `scale`, `norm` 하위 row를 먼저 삭제하고 condition/test row를 삭제한다.
- 삭제 전후 count를 기록하고 `FAT_FIRST`가 남아있는지 확인한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: `ARCHITECTURE.md`, `docs/database/schema-overview.md`
  - DB: `docs/database/runtime-db.md`
  - UI/디자인: 해당 없음
  - 문서 체계: 해당 없음
  - 설명/디버깅: 해당 없음
  - 코드 정리 산출물: 해당 없음
- [x] 운영/실행 서버 DB가 필요한 작업이면 `docs/database/runtime-db.md`의 DB 조회 전 확인 규칙 적용
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- `FAT_first`는 원본 검사 계열 테이블에만 존재하며 관리자 생성 검사/제출/채점 결과에는 전파되지 않았다.
- `FAT_FIRST`와 `FAT_first`가 공존하므로 삭제는 대소문자 exact match 기준으로 수행해야 한다.

## Initial Plan
1. 삭제 전 `FAT_first` 관련 count를 재조회한다.
2. 단일 transaction에서 `item` → `scale` → `norm` → condition tables → `test_profile_config` → `test` 순서로 삭제한다.
3. 삭제 후 `FAT_first` count가 0이고 `FAT_FIRST`가 남아있는지 확인한다.
4. 실행 결과를 이 문서와 최종 응답에 남긴다.

## Progress Updates
### Update 1
- Time: 2026-06-22
- Change: 삭제 계획 수립.
- Reason: 운영 RDS 변경 전 삭제 범위와 검증 기준을 고정하기 위해서다.

### Update 2
- Time: 2026-06-22
- Change: `FAT_first` exact match 기준으로 RDS 삭제를 실행하고 commit했다.
- Reason: 사용자가 직접 삭제 진행을 요청했고, 사전 감사에서 관리자 생성 검사/제출/채점 결과 쪽 전파가 없음을 확인했기 때문이다.

## Result
- 삭제 완료.
- 삭제 row 수:
  - `item`: 270
  - `scale`: 1
  - `norm`: 1
  - `itemcondition`: 1
  - `scalecondition`: 1
  - `normcondition`: 1
  - `test_profile_config`: 0
  - `test`: 1
- `FAT_FIRST`, `FAT_SECOND`, `FAT`는 삭제 후에도 남아있다.

## Verification
- Checked:
  - 삭제 전 count 확인.
  - 삭제 후 `FAT_first` 관련 원본 테이블 count가 모두 0임을 확인.
  - 전체 문자열/JSON 컬럼 contains 검색에서도 `FAT_first` hit가 0임을 확인.
  - `test` 테이블에 `FAT_FIRST`, `FAT_SECOND`, `FAT`가 남아있음을 확인.
- Not checked:
  - 애플리케이션 UI 목록 화면 수동 확인은 수행하지 않았다.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 해당 없음.

### Why
- 사전 감사에서 삭제 범위가 원본 검사 계열로 좁혀졌고, exact match 삭제로 정상 ID와 혼동을 피했다.

### Next Time
- 대소문자만 다른 검사 ID가 공존할 수 있으므로, 운영 DB 삭제 작업은 항상 exact match count와 남겨야 할 ID 확인을 먼저 수행한다.

## Related Documents
- [AGENTS.md](../../AGENTS.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [docs/database/runtime-db.md](../database/runtime-db.md)
- [docs/database/schema-overview.md](../database/schema-overview.md)
