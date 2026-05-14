# Execution Plan

## Task Title
- 루트 `modular.db` 기준 RDS PostgreSQL 동기화

## Request Summary
- 운영 기준 SQLite 파일인 루트 `modular.db` 내용을 RDS에 동일하게 생성한다.

## Goal
- `/home/ubuntu/workspace/2.0-modular/modular.db`의 테이블 구조와 데이터를 RDS `modular_db`에 반영한다.
- 비밀값은 출력하지 않는다.
- 반영 후 SQLite와 RDS의 테이블별 행 수를 비교한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - [x] 코드/구조: `ARCHITECTURE.md`
  - [x] DB: `docs/database/runtime-db.md`
  - [x] DB: `docs/database/schema-overview.md`
  - [ ] UI/디자인: 해당 없음
  - [ ] 문서 체계: 해당 없음
  - [ ] 설명/디버깅: 해당 없음
  - [ ] 코드 정리 산출물: 해당 없음
- [x] 운영 DB가 필요한 작업이면 루트 `modular.db` 기준 확인
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- RDS는 PostgreSQL이므로 SQLite dump를 그대로 적용할 수 없다.
- Python 표준 `sqlite3`로 원본 스키마와 데이터를 읽고, PostgreSQL 호환 DDL/COPY 입력을 생성해 `psql`로 반영한다.

## Initial Plan
1. 루트 `modular.db`의 테이블, 스키마, 행 수를 확인한다.
2. RDS의 현재 public schema 상태를 확인한다.
3. SQLite 타입과 기본값을 PostgreSQL 호환 DDL로 변환하고 데이터를 적재한다.
4. 인덱스와 시퀀스를 보정한다.
5. 테이블별 행 수와 주요 접속 쿼리로 검증한다.

## Progress Updates
### Update 1
- Time: 2026-05-12
- Change: 실행계획 작성.
- Reason: DB 변경 작업 전 기록 필요.

### Update 2
- Time: 2026-05-12
- Change: RDS public schema가 비어 있음을 확인하고, 루트 `modular.db`의 28개 테이블/1,050개 행을 PostgreSQL로 변환 적재했다.
- Reason: 기존 RDS 데이터 삭제 없이 원본 운영 DB를 반영하기 위함.

### Update 3
- Time: 2026-05-12
- Change: 원본 SQLite 외래키 43개를 PostgreSQL에 `NOT VALID` 제약으로 추가했다.
- Reason: 원본 SQLite 데이터에 기존 외래키 불일치가 있어 일반 외래키 검증은 실패했지만, 현재 데이터를 보존하면서 제약 정의를 최대한 동일하게 이식하기 위함.

## Result
- RDS `modular_db`에 루트 `modular.db` 기준 테이블, 데이터, 사용자 인덱스, 외래키 정의를 반영했다.
- PostgreSQL 기본키 인덱스와 복합 외래키 지원용 unique index 3개 때문에 RDS 전체 인덱스 수는 SQLite 사용자 인덱스 수보다 많다.

## Verification
- Checked:
  - SQLite 테이블 28개 = RDS 테이블 28개
  - SQLite 총 1,050행 = RDS 총 1,050행
  - 테이블별 row count mismatch 없음
  - SQLite 사용자 인덱스 50개 모두 RDS에 존재
  - SQLite 외래키 그룹 43개 = RDS 외래키 제약 43개
- Not checked:
  - `NOT VALID` 외래키 43개의 전체 validate는 하지 않음. 원본 데이터에 기존 참조 불일치가 있어 일반 validate가 실패한다.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 원본 SQLite DB에 외래키 정의는 있지만, 기존 데이터 일부가 해당 외래키를 만족하지 않았다.

### Why
- SQLite 런타임에서 외래키 강제 검증이 활성화되지 않았거나, 과거 데이터 생성/보정 과정에서 참조 대상 삭제 후 하위 데이터가 남은 것으로 보인다.

### Next Time
- PostgreSQL 운영 전환 전에는 `NOT VALID` 외래키 목록을 기준으로 참조 불일치 데이터를 정리한 뒤 `VALIDATE CONSTRAINT`를 수행한다.

## Related Documents
- [AGENTS.md](../../AGENTS.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [docs/database/runtime-db.md](../database/runtime-db.md)
- [docs/exec-plans/README.md](README.md)
