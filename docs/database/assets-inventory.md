# DB Assets Inventory

이 문서는 저장소 안에 있는 `.db`, `.mwb`, `.sql` 파일의 현재 위치와 해석 기준을 정리한다.

## Inventory
### Runtime / Root
- `modular.db`
  - 현재 코드 기준 기본 런타임 SQLite DB
- `app.db`
  - 과거 런타임 기준 또는 보조 자산으로 남아 있는 파일
- `modular.mwb`
  - MySQL Workbench 모델 파일로 보이는 참고 자산

### App Package
- `app/modular.mwb`
  - 앱 패키지 내부에 위치한 Workbench 모델 파일
  - 루트 `modular.mwb`와 중복/파생 관계일 가능성이 있어 용도 확인이 필요함

### Docs Assets
- `docs/modular.db`
  - 참고용 DB 자산
- `docs/modular_admin_user_before_hash.db`
  - 관리자 사용자 해시 처리 전 상태를 보존한 백업 성격으로 보임
- `docs/modular_before_replace.db`
  - 치환/교체 작업 전 백업 성격으로 보임
- `docs/modular_pre_mwb_sync.db`
  - MWB 동기화 전 상태 보관용으로 보임
- `docs/modular_schema.sql`
  - 스키마 SQL 덤프/참고 자산
- `docs/modular_test.db`
  - 테스트용 DB 자산
- `docs/modular_test.mwb`
  - 테스트용 Workbench 모델 자산
- `docs/modular_test_rebuilt.db`
  - 재구성된 테스트 DB 자산
- `docs/modular_test_schema.sql`
  - 테스트용 스키마 SQL 자산

## Interpretation Rule
현재 명확하게 코드에서 직접 참조되는 런타임 DB 파일은 `modular.db`다.

따라서 아래처럼 구분해서 본다.

- `modular.db`
  - 현재 앱 런타임 기준
- 루트/`docs/`/`app/` 내 다른 `.db`, `.mwb`, `.sql`
  - 참고, 백업, 테스트, 모델링 자산

## Recommended Future Organization
파일을 실제로 옮기지 않더라도 문서 기준으로는 아래처럼 해석하는 것이 좋다.

- 운영 기준 DB:
  - `modular.db`
- 참고 스키마/모델링 자산:
  - `modular.mwb`
  - `app/modular.mwb`
  - `docs/*.sql`
- 백업/이력 자산:
  - `docs/modular_before_replace.db`
  - `docs/modular_pre_mwb_sync.db`
  - `docs/modular_admin_user_before_hash.db`
- 테스트 자산:
  - `docs/modular_test.db`
  - `docs/modular_test_rebuilt.db`
  - `docs/modular_test.mwb`
  - `docs/modular_test_schema.sql`

## Recommended Documentation Rule
앞으로 DB 관련 설명 문서를 쓸 때는 아래 방식으로 적는 것이 좋다.

1. 먼저 현재 런타임 DB가 `modular.db`라고 명시한다.
2. 그 다음 SQLAlchemy 모델 기준 테이블 구조를 설명한다.
3. 그 다음 backup/test/reference 자산을 따로 분리해서 적는다.
4. `.mwb`와 `.sql`은 운영 DB 파일과 동일한 기준이라고 혼동되지 않게 표시한다.

## Open Questions
현재 문서만으로는 아래 항목은 추가 확인이 필요하다.

- 루트 `modular.mwb`와 `app/modular.mwb` 중 어느 파일이 최신 기준인지
- `app.db`가 현재는 왜 루트에 남아 있는지
- `docs/modular.db`가 단순 참고본인지, 특정 시점 스냅샷인지

따라서 지금 단계에서는 이 파일들을 운영 기준으로 단정하지 말고, 참고 자산으로 분류하는 것이 안전하다.
