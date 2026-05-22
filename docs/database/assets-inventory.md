# DB Assets Inventory

이 문서는 저장소 안에 있는 `.db`, `.mwb`, `.sql` 파일의 현재 위치와 해석 기준을 정리한다.

## Inventory

### Runtime / Root
- `modular.db`
  - **로컬 개발 전용 SQLite DB** (`APP_ENV=local.dev` 기본값 시 사용)
  - RDS 스냅샷을 복사해 구성하며, 운영 데이터와 분리된 개발용 DB
  - `scripts/create_modular_db.py`는 기본적으로 기존 파일을 덮어쓰지 않으며, 재생성이 필요할 때만 `--force`를 명시해서 사용해야 함
- `app.db`
  - 과거 런타임 기준 또는 보조 자산으로 남아 있는 파일
- `modular.mwb`
  - MySQL Workbench 모델 파일로 보이는 참고 자산
- `modular.mwb.bak`
  - 루트 Workbench 모델의 백업 자산

### App Package
- `app/modular.mwb`
  - 앱 패키지 내부에 위치한 Workbench 모델 파일
  - 루트 `modular.mwb`와 중복/파생 관계일 가능성이 있어 용도 확인이 필요함

### Frontend
- `frontend/modular.db`
  - 운영 FastAPI 런타임 DB가 아님
  - 프런트엔드 디렉터리 안에 남아 있는 참고/혼동 주의 자산

### Docs Assets
- *(2026-05-22 삭제)* `docs/` 아래 `.db`, `.sql`, `.mwb` 파일 전체 삭제됨

## Interpretation Rule
현재 명확한 앱 런타임 DB는 RDS PostgreSQL이다.

- 로컬 개발: 루트 `modular.db` (SQLite, `APP_ENV=local.dev`)
- 운영: RDS PostgreSQL (`APP_ENV=ec2.prod`)

## Open Questions
- 루트 `modular.mwb`와 `app/modular.mwb` 중 어느 파일이 최신 기준인지
- `app.db`가 현재는 왜 루트에 남아 있는지

## Related Documents
- [docs/database/README.md](README.md)
- [docs/database/runtime-db.md](runtime-db.md)
- [docs/database/schema-overview.md](schema-overview.md)
