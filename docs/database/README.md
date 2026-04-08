# Database Docs

이 폴더는 이 저장소의 DB 관련 자산과 확인 기준을 정리한 문서 모음이다.

## What To Check First
DB 관련 내용을 볼 때는 아래 순서로 확인한다.

1. 실제 앱이 어떤 DB 파일을 쓰는지 확인
2. SQLAlchemy 모델 기준 테이블 구조 확인
3. startup 시 자동 보정되는 스키마 변경 확인
4. 참고용 `.db`, `.mwb`, `.sql` 자산의 용도 확인

## Current Runtime Source Of Truth
현재 코드 기준 실제 런타임 DB 연결은 `app/db/session.py`의 `DATABASE_URL = "sqlite:///./modular.db"`다.

즉, 특별한 설정 변경이 없다면 앱이 직접 읽고 쓰는 기본 DB 파일은 루트의 `modular.db`다.

## Single DB Principle
앞으로 이 프로젝트의 모든 운영 기준 DB 연결은 루트 `modular.db` 하나로 통일한다.
인증 로직, 일반 서비스 로직, 스크립트, 문서 설명도 이 기준에 맞춰야 한다.
다른 `.db` 파일은 백업, 테스트, 참고 자산으로만 분리해서 해석한다.

## Recommended Reading Order
- `runtime-db.md`: 실제 앱이 사용하는 DB와 코드 기준
- `schema-overview.md`: 주요 테이블과 관계
- `assets-inventory.md`: 저장소 안 `.db`, `.mwb`, `.sql` 파일 목록과 용도

## Rule
- 운영 기준을 설명할 때는 항상 `modular.db`와 `app/db/models.py`를 먼저 기준으로 본다.
- `docs/` 안의 `.db`, `.mwb`, `.sql`은 기본적으로 참고/백업/테스트 자산으로 취급한다.
- 어떤 파일이 현재 기준인지 불명확하면 문서에 먼저 명시하고 사용한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
- [docs/database/runtime-db.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/runtime-db.md)
- [docs/database/schema-overview.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/schema-overview.md)
- [docs/database/assets-inventory.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/assets-inventory.md)
- [docs/features/admin-auth.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/admin-auth.md)
