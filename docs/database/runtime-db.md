# Runtime DB

## Runtime Database File
현재 코드 기준 기본 런타임 DB 파일은 루트의 `modular.db`다.

근거:
- `app/db/session.py`
- `DATABASE_URL = "sqlite:///./modular.db"`

## Single DB Rule
앞으로 운영 기준 DB 연결은 루트 `modular.db` 하나로 통일한다.
별도 `.db` 파일이 있어도 실제 운영 연결과 혼용하지 않는다.

이 문서는 DB 운영 기준의 source of truth로 사용한다.

## Runtime Code Path
실행 시 DB 관련 기준 코드는 아래 순서로 본다.

1. `app/db/session.py`
   - 엔진, 세션, `DATABASE_URL`
2. `app/db/models.py`
   - SQLAlchemy 모델 정의
3. `app/db/schema_migrations.py`
   - startup 시 보정되는 컬럼/테이블
4. `app/main.py`
   - startup 시 `Base.metadata.create_all()` 및 보정 함수 호출

## Startup Behavior
앱 startup 시 아래 작업이 수행된다.

1. SQLAlchemy 모델 기준 테이블 생성
2. `child_test.client_intake_mode` 컬럼 보정
3. `admin_client.created_source` 컬럼 보정
4. `admin_client_assignment`의 `(admin_user_id, admin_client_id, admin_custom_test_id)` unique index 보정
5. `admin_custom_test_submission.client_id` 컬럼 보정
6. `submission_scoring_result` 테이블 생성 및 인덱스 보정

즉, DB 구조는 모델 정의만 보는 것으로 끝나지 않고 startup 보정 코드까지 함께 봐야 한다.

## Operational Interpretation
- 루트 `modular.db`: 현재 앱이 기본적으로 읽고 쓰는 SQLite 파일
- 루트 `app.db`: 현재 런타임 연결 기준 파일은 아님
- `docs/` 내부 `.db` 파일들: 운영 기준 DB가 아니라 참고/백업/테스트 자산

## Caution
- DB 구조 설명은 항상 `modular.db` 기준으로 한다.
- 과거 `app.db` 기준 흔적이 있어도 실제 판단은 `app/db/*` 코드와 함께 한다.
- 인증/관리자 검증처럼 SQLite를 직접 여는 코드도 같은 `modular.db` 기준을 따라야 한다.

## Related Documents
- [docs/database/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/README.md)
- [docs/database/schema-overview.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/schema-overview.md)
- [docs/database/assets-inventory.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/assets-inventory.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
- [docs/features/admin-auth.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/admin-auth.md)
