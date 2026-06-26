# RDS Restructure Analysis TODO

## Document Role

- 역할: 실제 RDS 일부 조회와 현재 코드 분석을 바탕으로 한 재구조화 분석 결과 및 TODO 추적 문서
- 독자: 이후 RDS 정규화/마이그레이션 작업을 이어갈 작업자
- source of truth 여부: 아님. 운영 DB 기준은 `runtime-db.md`, 현재 스키마 기준은 `schema-overview.md`, 재구조화 작업 원칙은 `rds-restructure-agent.md`를 따른다.
- 작성 기준: 2026-06-24 Zeno read-only 분석 결과

## Analysis Baseline

- 서버 API 기준: `http://127.0.0.1:8120/health`에서 `db=postgresql` 확인
- 직접 SQL 기준: `APP_ENV=ec2.prod`, RDS PostgreSQL, DB `modular_db`, schema `public`
- 수행한 DB 작업: `SELECT`, metadata 조회, row count, group-by/count 성격의 read-only 조회
- 수행하지 않은 DB 작업: `UPDATE`, `DELETE`, `DDL`, 대량 rewrite
- 민감정보 처리: 이름, 전화, 생년월일, 토큰, 응답 원문은 문서에 원문 노출하지 않음

## Current Data Signals

| 영역 | 실제 관측 | 해석 |
| --- | --- | --- |
| 검사 정의 | `child_test` 40건, active 8건, deleted 32건 | 과거 운영 흔적이 active보다 훨씬 많고, 제출 이력과 삭제 정책이 강하게 연결된다. |
| 제출 | `admin_custom_test_submission` 70건 | 제출 사건은 많지 않지만 보고서/동의/채점과 연결되는 핵심 이력이다. |
| 제출과 검사 정의 | 제출 70건 중 deleted `child_test` 연결 46건, missing `child_test` 연결 1건 | 과거 제출 재현성이 현재 검사 정의 row 생존 여부에 의존한다. |
| 제출 payload | 모든 제출이 `{profile, answers}` top-level 구조, 평균 약 12.9KB, 최대 약 33.7KB | 제출 원문은 snapshot 성격이 강하며 완전 구조화보다 원문 보존과 핵심 메타데이터 분리가 우선이다. |
| 채점 결과 | submission 70건 대비 scoring result 77건, 5개 submission은 2개 이상, 최대 4개 | 재채점 이력인지 중복 생성인지 DB 모델만으로 구분되지 않는다. |
| 동의 기록 | `client_consent_record` 120건 | 동의 사건은 쌓였지만 당시 문구 snapshot 정책이 필요하다. |
| 사전등록 | `assessment_link_pre_registered_client` 1218건 | profile JSON key 기반 매칭의 성능/정합성 문제가 커질 수 있다. |
| 사전등록 key | `name`, `birth_day`, `phon_num`, 일부 `gender`, `phone` | `phon_num`/`phone` 혼재로 key 표준화 문제가 이미 발생했다. |
| 내담자 | `admin_client` 129건 | 자동 생성 source가 대부분이라 삭제/병합/보존 정책이 중요하다. |
| 내담자 source | `assessment_link_auto` 85, `assessment_link_secondary` 29, `assessment_link_provisional` 13, `admin_manual` 2 | 수동 관리 master라기보다 검사 운영 과정에서 생성된 엔티티 성격이 강하다. |
| 링크 | `admin_custom_test_access_link` 42건 | 외부 수검 진입 토큰이므로 DB 제약이 중요하다. |
| 무결성 주의 | `access_token` unique가 ORM에는 있으나 RDS index 조회에서 확인되지 않음 | 코드 기대와 실제 DB 제약이 불일치할 수 있다. |
| 관계 주의 | `admin_client_relation` FK가 RDS metadata상 확인되지 않음 | orphan 관계 row 가능성을 DB가 차단하지 못한다. |

## TODO Overview

- [ ] P0. 제출/보고서 재현성을 위한 submission definition snapshot 도입
- [ ] P0. 동의 기록에 당시 문구 snapshot 도입
- [ ] P1. `child_test` JSON 구성의 관계형 정규화 설계
- [ ] P1. 사전등록 profile match field 구조화
- [ ] P1. access token unique 제약 확인 및 보정
- [ ] P2. scoring result current/history 모델 도입
- [ ] P2. 내담자 hard delete를 archive/soft lifecycle로 전환
- [ ] P2. `admin_client_relation` FK와 중복 정책 보정
- [ ] P2. 관리자 목록/보고서용 read model 필요성 검증

## P0. Submission Definition Snapshot

### Problem

현재 제출은 `admin_custom_test_submission.answers_json`에 `{profile, answers}`를 저장하지만, 제출 당시 검사 정의 자체는 별도 snapshot으로 고정하지 않는다.

실제 RDS에서 제출 70건 중 deleted `child_test`에 연결된 제출이 46건이고, missing `child_test` 연결도 1건 있었다. 이는 과거 제출이 현재 `child_test` row 상태에 의존하고 있음을 보여준다.

### Normalization And Anomaly Diagnosis

- 1NF: `answers_json` 자체는 반복 응답 그룹을 담지만 제출 원문 보존 목적이 있으므로 무조건 분해 대상은 아니다.
- 3NF/이력: 제출 결과의 의미가 현재 `child_test`, 현재 원본 기준표, 현재 해석표에 간접 의존한다.
- 변경 이상: 검사 정의 JSON이나 해석 기준을 바꾸면 과거 제출 보고서 의미가 바뀔 수 있다.
- 삭제 이상: `child_test` 삭제 후 과거 제출의 검사 구성을 재현하기 어렵다.

### Proposed Shape

```text
submission_definition_snapshot
- id
- submission_id
- admin_custom_test_id
- custom_test_name_snapshot
- test_ids_snapshot_json
- selected_scales_snapshot_json
- session_configs_snapshot_json
- additional_profile_fields_snapshot_json
- consent_policy_snapshot_id nullable
- source_catalog_snapshot_json nullable
- snapshot_source
- created_at
```

### TODO

- [ ] 현재 보고서 생성 흐름에서 실제로 읽는 `child_test` 필드 목록 정리
- [ ] 제출 시점에 필요한 snapshot 최소 필드 확정
- [ ] 기존 70개 submission에 대해 가능한 best-effort snapshot backfill 가능성 확인
- [ ] missing `child_test` 1건의 처리 정책 결정: `legacy_orphan`, 수동 복구, 보고서 제한 중 선택
- [ ] snapshot 기반 보고서 생성 shadow compare 설계

### Trade-Off

- 저장량 증가가 있다.
- 대신 보고서 재현성, 감사 가능성, 삭제된 검사 정의에 대한 과거 제출 보존성이 생긴다.

## P0. Consent Text Snapshot

### Problem

`client_consent_record`는 동의 사건을 저장하지만, 당시 동의 문구와 보안 안내 문구를 명확히 snapshot하지 않는다.

실제 동의 기록은 120건이다. 문구가 바뀌면 과거 120건이 어떤 문구에 동의했는지 현재 DB만으로 재현하기 어렵다.

### Proposed Shape

```text
client_consent_record
- existing columns
- consent_text_snapshot
- security_notice_text_snapshot
- consent_policy_version nullable
- snapshot_source
```

또는 버전 테이블:

```text
consent_policy_version
- id
- admin_user_id
- admin_custom_test_id nullable
- consent_text
- security_notice_text
- effective_from
- effective_to nullable
- created_at
```

### TODO

- [ ] 동의 문구 원천이 `admin_settings`인지 `child_test`인지 화면/서비스별로 정리
- [ ] 제출 전 동의 API가 저장해야 할 snapshot 필드 확정
- [ ] 기존 120건에 대해 정확한 당시 문구 복구 가능 여부 확인
- [ ] 복구 불가 row에는 `snapshot_source='unknown_legacy'` 같은 출처 표시 정책 결정

### Trade-Off

- 문구 중복 저장은 정규화 관점에서 중복이다.
- 하지만 동의는 현재값 참조보다 당시값 보존이 중요하므로 의도적 snapshot이 맞다.

## P1. Normalize `child_test` Configuration

### Problem

`child_test`는 커스텀 검사 정의를 표현하지만, 한 row에 반복 그룹과 여러 변경 이유가 섞여 있다.

주요 JSON/text 필드:

- `test_id`: JSON 배열 문자열
- `sub_test_json`
- `selected_scales_json`
- `session_configs_json`
- `additional_profile_fields_json`
- `consent_text`

### Normalization Diagnosis

- 1NF 위반 후보: `test_id`가 배열 문자열이고, 세션/척도/추가필드가 JSON 배열 또는 중첩 구조다.
- 2NF 후보: 선택 척도와 실시구간은 `child_test.id` 전체보다 `(custom_test, source_test, variant)`에 의존한다.
- 3NF 후보: 원본 검사 기준에서 유도 가능한 값과 관리자 선택값이 JSON 안에 섞인다.

### Proposed Shape

```text
Source of truth:
- child_test: 기존 custom test 상위 row. 1차 expand 단계에서는 유지한다.
- admin_custom_test_source: custom test에 포함된 원형 검사 source_test_id와 순서.
- admin_custom_test_scale_selection: 관리자가 선택한 scale_code 의도.
- admin_custom_test_session: 수검 세션 메타.
- admin_custom_test_session_source: 세션과 원형 검사 연결.
- admin_custom_test_profile_field: custom test 자체의 추가 profile field.

Projection:
- admin_custom_test_variant_projection: 원형 item/scale/norm condition 교집합으로 계산된 현재 실시구간.
- admin_custom_test_source_dependency: projection이 관측한 원형 condition/scale/item dependency hash.
- admin_custom_test_variant_scale_projection: projection별 available/selected/unavailable scale 상태.

Snapshot:
- submission_custom_test_snapshot: 제출 당시 custom test 구성과 dependency hash snapshot.
```

#### Dependency Rule

`sub_test_json`, `available_scale_codes`, variant별 `selected_scale_codes`는 원형 검사 condition에서 계산된 결과다. 따라서 source of truth로 영구 저장하지 않고 projection으로 관리한다.

```text
관리자가 직접 선택한 의도 = 저장
원형 검사 condition에서 계산 가능한 결과 = projection/recompute
제출 당시 의미 = snapshot
```

원형 `itemcondition`, `scalecondition`, `normcondition`, `scale`, `item`이 바뀌면 `admin_custom_test_source_dependency.dependency_hash`를 비교해 stale projection을 찾고 재계산한다. 이미 제출된 결과는 `submission_custom_test_snapshot`을 기준으로 보존한다.

### TODO

- [ ] active `child_test` 8건의 JSON 구조를 표본으로 source/selection/session/profile backfill 규칙 작성
- [ ] deleted `child_test` 32건은 운영 이력 보존용으로만 backfill할지 결정
- [ ] `selected_scales_json`에서 관리자 scale selection만 추출하는 idempotent backfill 함수 설계
- [ ] 원형 condition hash 산출 규칙과 stale projection 판정 기준 설계
- [ ] `session_configs_json`에서 session/source 관계를 추출하는 규칙 설계
- [ ] 기존 `/api/admin/custom-tests` 응답과 새 구조 조립 응답을 비교하는 shadow check 작성
- [ ] 수검자 `/api/assessment-links/{access_token}` payload 조립 성능 측정

### Trade-Off

- 조회 조인이 증가한다.
- 대신 관리자 선택 의도와 원형 검사 condition 파생값을 분리할 수 있다.
- 원형 condition 변경은 현재 projection에 반영하고, 제출 당시 의미는 snapshot으로 보존한다.
- 수검 시작 payload는 projection table 또는 repository 조립으로 완충한다.

## P1. Pre-Registered Profile Match Field Structure

### Problem

`assessment_link_pre_registered_client.profile_data_json`에는 링크별 사전등록 profile이 JSON으로 저장된다.

실제 RDS에는 1218건이 있고, key가 `phon_num`과 `phone`처럼 혼재한다. 이 상태에서는 matching key를 바꿀 때마다 JSON key 관례가 여러 코드 경로와 업로드 데이터에 흩어진다.

### Proposed Shape

1차 하이브리드 컬럼 방식:

```text
assessment_link_pre_registered_client
- existing columns
- name_normalized nullable
- birth_day nullable
- phone_digits nullable
- gender_normalized nullable
- raw_profile_data_json
```

확장형 field table:

```text
assessment_link_pre_registered_profile_field
- entry_id
- field_key
- raw_value
- normalized_value
```

### TODO

- [ ] 현재 `match_field_keys`에서 실제로 쓰는 field key 목록 추출
- [ ] `phon_num`, `phone`, 기타 전화번호 key의 canonical key를 `phone` 또는 `phone_digits`로 확정
- [ ] 1218건에 대한 normalized field 채움 가능성 확인
- [ ] profile validate API를 JSON scan에서 normalized field 조회로 바꾸는 단계 설계
- [ ] 원본 JSON 보존 기간과 사용처 정의

### Trade-Off

- 모든 동적 profile field를 처음부터 구조화하면 과하다.
- 매칭에 쓰는 핵심 field만 먼저 구조화하고 원본 JSON을 보존하는 방식이 위험이 낮다.

## P1. Access Token Unique Constraint

### Problem

ORM에는 `admin_custom_test_access_link.access_token` unique constraint가 있으나, RDS metadata 조회에서는 unique index가 확인되지 않았다.

access token은 외부 수검 진입 URL의 식별/인증 수단이다. 중복되면 링크 조회 의미가 깨진다.

### TODO

- [ ] 운영 RDS에서 중복 token 확인
- [ ] ORM 정의와 실제 RDS index/constraint 차이 재확인
- [ ] 중복이 없으면 unique index 추가 계획 수립
- [ ] index 추가는 운영에서 `CONCURRENTLY` 가능 여부와 트랜잭션 경계 확인

### Verification SQL

```sql
select access_token, count(*)
from admin_custom_test_access_link
group by access_token
having count(*) > 1;
```

## P2. Scoring Result Current/History Model

### Problem

submission 70건 대비 scoring result는 77건이고, 5개 submission은 scoring result가 2개 이상이다. 최대 4개 결과가 있는 submission도 있다.

이 다중 결과가 재채점 이력인지 중복 생성인지, 최신 결과가 무엇인지가 스키마에 명시되어 있지 않다.

### Proposed Shape

```text
submission_scoring_result
- existing columns
- run_number
- is_current
- scoring_engine_version
- definition_snapshot_id nullable
- status
- started_at
- completed_at
- error_message nullable
```

Partial unique index 후보:

```sql
create unique index concurrently uq_scoring_current_per_submission
on submission_scoring_result(submission_id)
where is_current = true;
```

### TODO

- [ ] 다중 scoring result 5개 submission의 생성 시점과 보고서 사용 row 확인
- [ ] 기존 코드가 최신 결과를 어떤 기준으로 고르는지 확인
- [ ] `is_current` backfill 기준 확정: 가장 큰 `id`, 최신 `created_at`, 또는 보고서 사용 이력
- [ ] 재채점 시 이전 current를 false로 내리는 트랜잭션 설계
- [ ] scoring engine version 문자열 정책 결정

## P2. Client Archive Lifecycle

### Problem

`admin_client` 129건 중 자동 생성 계열이 대부분이다.

- `assessment_link_auto`: 85
- `assessment_link_secondary`: 29
- `assessment_link_provisional`: 13
- `admin_manual`: 2

내담자는 수동 master라기보다 검사 운영 과정에서 생성되는 엔티티 성격이 강하다. hard delete는 제출/채점/동의/관계 이력과 충돌할 수 있다.

### Proposed Shape

```text
admin_client
- existing columns
- is_archived
- archived_at
- archive_reason
- pii_erased_at nullable
```

### TODO

- [ ] 현재 내담자 삭제 서비스가 실제로 삭제하는 연관 테이블 목록 확인
- [ ] UI에서 archive와 closed의 의미를 분리할지 결정
- [ ] 개인정보 삭제 요청과 검사 이력 보존 정책 분리
- [ ] archive client가 목록/검색/보고서에서 어떻게 보일지 정의

## P2. `admin_client_relation` Integrity

### Problem

`admin_client_relation`은 실제 row가 30건 있으나 RDS metadata상 FK가 확인되지 않았다. orphan 관계 row를 DB가 막지 못한다.

### Proposed Constraints

```text
- client_id_a FK -> admin_client(id)
- client_id_b FK -> admin_client(id)
- admin_user_id FK -> admin_user(id)
- unique(admin_user_id, client_id_a, relation_type, client_id_b)
```

### TODO

- [ ] orphan relation 확인
- [ ] 역방향 중복을 허용할지 결정
- [ ] 자기 자신과의 관계를 금지할지 결정
- [ ] FK 추가 전 기존 데이터 정리 필요 여부 확인

### Verification SQL

```sql
select count(*)
from admin_client_relation r
left join admin_client a on a.id = r.client_id_a
left join admin_client b on b.id = r.client_id_b
where a.id is null or b.id is null;
```

## P2. Read Model Candidates

### Candidate 1. `admin_client_summary`

목적:
- 관리자 내담자 목록/검색에서 여러 테이블을 읽고 Python에서 필터링하는 비용을 줄인다.

TODO:
- [ ] 현재 `/api/admin/clients` 조회 쿼리와 Python 후처리 목록화
- [ ] 목록 화면에 필요한 컬럼만 정의
- [ ] stale 허용 범위 결정
- [ ] 원천 테이블과 재생성 SQL 정의

### Candidate 2. `admin_custom_test_summary`

목적:
- 검사 목록에서 JSON 파싱과 제출/링크/배정 집계를 반복하지 않게 한다.

TODO:
- [ ] 현재 `/api/admin/custom-tests` 응답 필드별 원천 정리
- [ ] active link, submission count, assigned client count 계산 원천 확정
- [ ] 검사 생성/수정/삭제/제출 시 summary 갱신 타이밍 정의

### Candidate 3. `submission_report_snapshot`

목적:
- 보고서 조회 시 매번 현재 기준표를 읽고 재채점하는 위험을 줄인다.

TODO:
- [ ] 현재 보고서 builder가 읽는 result/source table 목록화
- [ ] report snapshot에 저장할 최종 표시 데이터와 원천 result 분리
- [ ] 재채점과 기존 보고서 보존 정책 결정

## Migration Checklist

### Expand

- [ ] snapshot/정규화 대상 새 테이블 추가
- [ ] legacy JSON 컬럼은 유지
- [ ] unique/index 추가 전 중복/orphan 검증 SQL 실행
- [ ] 운영에서는 큰 index를 `CONCURRENTLY`로 추가할 수 있는지 별도 확인

### Backfill

- [ ] `child_test` JSON에서 component/variant/scale/session/profile field 추출
- [ ] 기존 submission snapshot best-effort 생성
- [ ] 기존 consent snapshot source 표시
- [ ] scoring result current row 선정
- [ ] pre-registered profile normalized field 채움

### Verify

- [ ] 기존 JSON count와 새 row count 비교
- [ ] active 8개 `child_test`에 대해 기존 API 응답과 새 구조 조립 응답 비교
- [ ] submission 70건의 보고서 결과 비교
- [ ] 사전등록 1218건 matching 결과 비교
- [ ] 다중 scoring result 5개 submission의 current 선정 결과 검토

### Dual Path

- [ ] 쓰기 시 legacy JSON과 새 테이블 동시 기록
- [ ] 읽기 시 feature flag로 새 구조 shadow compare
- [ ] report/scoring은 기존 경로 유지 후 snapshot 기반 경로를 별도 검증

### Cutover

- [ ] custom test 관리 API 읽기 전환
- [ ] assessment link payload 읽기 전환
- [ ] pre-registration matching 읽기 전환
- [ ] report builder 읽기 전환

### Contract

- [ ] 충분한 운영 검증 후 legacy JSON을 archive/read-only로 격하
- [ ] drop column/table은 별도 배포와 백업 후 진행
- [ ] 문서 `schema-overview.md` 갱신

## Global Verification SQL

```sql
-- Orphan submission custom test
select count(*)
from admin_custom_test_submission s
left join child_test t on t.id = s.admin_custom_test_id
where t.id is null;

-- Token duplicates
select access_token, count(*)
from admin_custom_test_access_link
group by access_token
having count(*) > 1;

-- Multiple scoring results
select submission_id, count(*)
from submission_scoring_result
group by submission_id
having count(*) > 1;

-- Relation orphan
select count(*)
from admin_client_relation r
left join admin_client a on a.id = r.client_id_a
left join admin_client b on b.id = r.client_id_b
where a.id is null or b.id is null;

-- child_test JSON test_id shape
select id, jsonb_array_length(test_id::jsonb)
from child_test
where jsonb_typeof(test_id::jsonb) = 'array';
```

## API Regression Checklist

- [ ] `GET /api/admin/custom-tests`
- [ ] `GET /api/admin/custom-tests/{id}`
- [ ] `GET /api/assessment-links/{token}`
- [ ] `POST /api/assessment-links/{token}/validate-profile`
- [ ] `PUT /api/assessment-links/{token}/draft`
- [ ] `POST /api/assessment-links/{token}/submit`
- [ ] `GET /api/report/by-submission/{submission_id}?token=...`
- [ ] `GET /api/admin/report/{submission_id}`
- [ ] `GET /api/admin/clients`
- [ ] `GET /api/admin/clients/{client_id}`

## Open Questions

- [ ] 원본 기준표(`item`, `scale`, `interpret`) 변경 이력/versioning을 별도 테이블로 둘 것인가?
- [ ] 제출 당시 기준표 전체를 snapshot할 것인가, version reference만 저장할 것인가?
- [ ] 동의 문구는 관리자 전역 설정과 검사별 설정 중 어느 쪽을 우선 source로 볼 것인가?
- [ ] 내담자 개인정보 삭제 요청 시 제출/채점/보고서 이력은 어떤 수준으로 익명화할 것인가?
- [ ] `child_test` legacy JSON 제거 시점은 몇 번의 운영 배포 후로 둘 것인가?

## Related Documents

- [Database Docs](README.md)
- [runtime-db.md](runtime-db.md)
- [schema-overview.md](schema-overview.md)
- [rds-restructure-agent.md](rds-restructure-agent.md)
