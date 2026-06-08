# Runtime DB

이 문서는 DB 운영 기준의 source of truth로 사용한다.

## 환경별 DB 분기

앱은 `APP_ENV` 환경변수에 따라 다른 `env.*` 파일을 로드하고 그에 맞는 DB에 접속한다.

| `APP_ENV` | 환경 파일 | 실행 위치 | DB |
|-----------|----------|-----------|----|
| `local.dev` (기본값) | `env.local.dev` | 로컬 Mac | SQLite (`modular.db`) |
| `local.prod` | `env.local.prod` | 로컬 Mac | RDS (SSH 터널, 포트 15432) |
| `ec2.prod` | `env.ec2.prod` | EC2 서버 | RDS PostgreSQL (직접 접속) |

- 세 파일 모두 git 추적 제외 (`.gitignore`의 `env.*` 패턴)
- `APP_ENV` 미지정 시 `local.dev`로 동작 (`modular.db` 사용)
- 분기 코드: `app/db/session.py`

## Runtime Database
운영 기준(`ec2.prod`) DB는 RDS PostgreSQL이다.

`DATABASE_URL`이 env 파일에 명시되면 그 값을 우선 사용하고, 없으면 `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD`로 URL을 조합한다.

## Single DB Rule
운영(`ec2.prod`) 기준 DB 연결은 RDS PostgreSQL 하나로 통일한다.
로컬 `modular.db`는 개발 전용이며, RDS 스냅샷을 복사해 초기 데이터를 구성한다.

## Runtime Code Path
실행 시 DB 관련 기준 코드는 아래 순서로 본다.

1. `app/db/session.py`
   - `APP_ENV`에 맞는 `env.*` 로드
   - RDS PostgreSQL SQLAlchemy URL 생성
   - 엔진, 세션, `DATABASE_URL`
2. `app/db/models.py`
   - SQLAlchemy 모델 정의
3. `app/db/schema_migrations.py`
   - startup 시 보정되는 컬럼/테이블/인덱스
4. `app/main.py`
   - startup 시 `Base.metadata.create_all()` 및 보정 함수 호출

## Startup Behavior
앱 startup 시 아래 작업이 수행된다.

1. SQLAlchemy 모델 기준 테이블 생성
2. `child_test.client_intake_mode` 컬럼 보정
3. `child_test.session_configs_json` 컬럼 보정 및 기존 `selected_scales_json.__sessions` 이관/정리
4. `child_test` soft delete 컬럼 보정
5. `admin_client.created_source` 컬럼 보정
6. `admin_client_assignment`의 `(admin_user_id, admin_client_id, admin_custom_test_id)` unique index 보정
7. `admin_custom_test_submission.client_id` 컬럼 보정
8. `submission_scoring_result` 테이블 생성 및 인덱스 보정
9. `admin_client.birth_day` 기존 NULL 값 보정
10. `admin_client` 확장 필드(`phone`, `address`, `is_closed`, `tags_json`) 보정
11. 내담자 그룹 테이블(`admin_client_group`, `admin_client_group_member`) 보정
12. 내담자 리포트 테이블(`admin_client_report`) 보정
13. 동일인 검토 테이블(`admin_client_identity_review`) 보정
14. `child_test.requires_consent` 컬럼 보정
15. `child_test.show_research_notice` 컬럼 보정
16. 관리자 설정 테이블(`admin_settings`) 보정
17. 개인정보동의 기록 테이블(`client_consent_record`) 보정
18. 검사 실시 임시저장 테이블(`admin_assessment_draft`) 보정
19. `RUN_STARTUP_DATA_MIGRATIONS=1`일 때만 기존 row 재작성 데이터 migration 실행
    - `migrate_child_test_sub_test_json_to_structured`
    - `rotate_shared_submission_access_tokens`
    - `ensure_test_profile_config_restructure`
    - `ensure_test_profile_condition_profile_maps`
20. `test_profile_config` 테이블 생성 보정
21. 내담자 관계 테이블(`admin_client_relation`) 보정

정확한 최신 실행 순서는 `app/main.py`의 `on_startup()` 함수와 `app/db/schema_migrations.py`를 최종 기준으로 본다.

## Operational Interpretation
- RDS PostgreSQL: 현재 앱이 기본적으로 읽고 쓰는 운영 DB
- 루트 `modular.db`: RDS 전환 전 운영 스냅샷/마이그레이션 원본
- 루트 `app.db`: 현재 런타임 연결 기준 파일은 아님
- `docs/` 내부 `.db` 파일들: 운영 기준 DB가 아니라 참고/백업/테스트 자산

## Caution
- DB 구조 설명은 항상 RDS PostgreSQL 기준으로 한다.
- 과거 `modular.db` 기준 흔적이 있어도 실제 판단은 `app/db/*` 코드와 RDS 상태를 함께 본다.
- 인증/관리자 검증도 SQLAlchemy 엔진을 통해 RDS를 조회한다.

## Related Documents
- [docs/database/README.md](README.md)
- [docs/database/schema-overview.md](schema-overview.md)
- [docs/database/assets-inventory.md](assets-inventory.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [docs/features/admin-auth.md](../features/admin-auth.md)
