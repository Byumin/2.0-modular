# Runtime DB

## Runtime Database File
현재 코드 기준 기본 런타임 DB 파일은 루트의 `modular.db`다.

근거:
- `app/db/session.py`
- `DATABASE_URL = "sqlite:///./modular.db"`

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
2. `admin_custom_test_submission.client_id` 컬럼 보정
3. `submission_scoring_result` 테이블 생성 및 인덱스 보정

즉, DB 구조는 모델 정의만 보는 것으로 끝나지 않고 startup 보정 코드까지 함께 봐야 한다.

## Operational Interpretation
- 루트 `modular.db`:
  현재 앱이 기본적으로 읽고 쓰는 SQLite 파일
- 루트 `app.db`:
  현재 런타임 연결 기준 파일은 아님
- `docs/` 내부 `.db` 파일들:
  운영 기준 DB가 아니라 참고/백업/테스트 자산으로 보는 것이 안전함

## Caution
- DB 구조를 설명할 때는 `modular.db`를 현재 운영 DB 기준으로 본다.
- 과거 `app.db` 기준 문서나 스크립트가 남아 있을 수 있으므로 실제 판단은 `app/db/*` 코드와 함께 본다.
