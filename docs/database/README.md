# Database Docs

이 디렉터리는 DB 관련 문서의 지도다.

## Read This As A Map

- [runtime-db.md](runtime-db.md): 현재 앱이 실제로 어떤 DB를 운영 기준으로 쓰는지
- [schema-overview.md](schema-overview.md): 주요 테이블과 관계를 어떻게 읽을지
- [rds-restructure-agent.md](rds-restructure-agent.md): RDS 정규화, 조회 성능, 이력 보존을 함께 다루는 재구조화 에이전트 운영 기준
- [rds-restructure-analysis-todo.md](rds-restructure-analysis-todo.md): 실제 RDS 일부 조회 결과를 바탕으로 한 재구조화 분석과 추적용 TODO
- [client-hard-purge.md](client-hard-purge.md): 테스트 내담자와 응답 데이터를 RDS에서 hard purge할 때의 대상 산정, 삭제 순서, 검증 기준
- [assets-inventory.md](assets-inventory.md): 저장소 안 `.db`, `.mwb`, `.sql` 자산이 각각 무엇인지

## Recommended Reading Order

1. [runtime-db.md](runtime-db.md)
2. [schema-overview.md](schema-overview.md)
3. [rds-restructure-agent.md](rds-restructure-agent.md)
4. [rds-restructure-analysis-todo.md](rds-restructure-analysis-todo.md)
5. [client-hard-purge.md](client-hard-purge.md)
6. [assets-inventory.md](assets-inventory.md)

## What This README Does Not Repeat

- 운영 DB 기준과 단일 DB 원칙은 `runtime-db.md`를 source of truth로 본다.
- 테이블 구조와 관계 설명은 `schema-overview.md`에서 본다.
- RDS 재구조화 작업 절차는 `rds-restructure-agent.md`에서 본다.
- 특정 RDS 조회 결과 기반의 재구조화 후보와 진행 체크리스트는 `rds-restructure-analysis-todo.md`에서 본다.
- 내담자 hard purge의 삭제 순서와 실시링크 기준 대상 산정은 `client-hard-purge.md`에서 본다.
- 자산별 용도 구분은 `assets-inventory.md`에서 본다.

## Related Documents
- [Documentation Hub](../README.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [docs/database/runtime-db.md](runtime-db.md)
- [docs/database/schema-overview.md](schema-overview.md)
- [docs/database/rds-restructure-agent.md](rds-restructure-agent.md)
- [docs/database/rds-restructure-analysis-todo.md](rds-restructure-analysis-todo.md)
- [docs/database/client-hard-purge.md](client-hard-purge.md)
- [docs/database/assets-inventory.md](assets-inventory.md)
- [docs/features/admin-auth.md](../features/admin-auth.md)
