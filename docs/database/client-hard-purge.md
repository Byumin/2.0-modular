# Client Hard Purge Guide

## Document Role

- Role: 운영 가이드
- Audience: RDS에서 테스트 내담자와 관련 응답 데이터를 물리 삭제해야 하는 작업자
- Source of truth: 내담자 hard purge의 삭제 순서와 실시링크 기준 대상 산정 규칙
- Related documents:
  - [runtime-db.md](runtime-db.md)
  - [schema-overview.md](schema-overview.md)

## Core Rule

RDS의 내담자/응답 관련 FK는 `ON DELETE NO ACTION` 기준이다.

따라서 `admin_client` 또는 `admin_custom_test_submission`을 먼저 삭제하면 FK 오류가 나거나, 일부 참조 데이터가 남을 수 있다. 내담자 hard purge는 항상 대상 client id를 먼저 확정한 뒤, 아래 순서로 transaction 안에서 삭제한다.

## Dry-Run

`dry-run`은 실제 삭제를 하지 않고 삭제 대상과 테이블별 예상 삭제 건수만 조회하는 단계다.

Hard purge는 되돌리기 어렵기 때문에 다음 순서를 지킨다.

1. 대상 산정 쿼리로 `client_id` 목록을 확인한다.
2. 테이블별 삭제 예상 건수를 확인한다.
3. 수동 생성 내담자(`created_source='admin_manual'`)가 섞였는지 확인한다.
4. 확정된 `client_id` 목록을 고정값으로 두고 삭제한다.
5. 삭제 후 잔여 참조가 0인지 확인한다.

## Assessment Link Caveat

실시링크 URL의 token과 `admin_custom_test_submission.access_token`은 같은 값이 아니다.

- 실시링크 token: `admin_custom_test_access_link.access_token`
- 제출 row token: 결과 조회용 report access token

제출 저장 시 `admin_custom_test_submission.access_token`에는 실시링크 token이 아니라 결과 조회용 token이 저장된다. 따라서 특정 실시링크의 내담자를 정리할 때 submission을 `access_token = 실시링크 token`으로 찾으면 제출 완료 내담자가 누락된다.

특정 실시링크 기준으로 정리할 때는 먼저 link row에서 `admin_custom_test_id`를 찾고, 그 검사 ID 기준으로 배정/제출/임시저장/동일인 검토를 조회한다.

## Target Selection

특정 실시링크의 테스트 내담자를 정리할 때 기본 대상은 다음이다.

- 해당 link의 `admin_user_id`
- 해당 link의 `admin_custom_test_id`
- `created_source in ('assessment_link_auto', 'assessment_link_secondary')`
- 해당 검사에 배정된 내담자
- 해당 검사에 제출/임시저장/동일인 검토로 연결된 내담자

관계 테이블(`admin_client_relation`) 때문에 기존 수동 내담자가 함께 끌려올 수 있다. 예를 들어 자동 생성 자녀와 기존 수동 양육자가 관계로 묶인 경우가 있다. 이때 `admin_manual` 내담자는 기본적으로 hard purge 대상에서 제외한다.

## Secondary Client Behavior

양육자-자녀처럼 여러 인적사항을 받는 검사는 primary client와 secondary client가 따로 쌓일 수 있다.

현재 코드 기준:

- primary client는 인적사항 확인/자동 등록 단계에서 생성될 수 있다.
- secondary client와 `admin_client_relation`은 제출 완료 후 `_register_secondary_clients_and_relations()`에서 생성된다.
- `parent_name`, `parent_gender`, `parent_birth_day`처럼 이름/성별/생년월일이 모두 있어야 secondary client가 생성된다.
- 임시저장까지만 진행하고 제출하지 않은 경우 primary client와 draft/consent만 남고 secondary relation은 생기지 않을 수 있다.

## Delete Order

확정된 `client_id` 목록에 대해 아래 순서로 삭제한다.

1. `admin_client_identity_review`
2. `submission_scoring_result`
3. `client_consent_record`
4. `admin_assessment_draft`
5. `admin_client_report`
6. `admin_client_group_member`
7. `admin_client_relation`
8. `admin_assessment_log`
9. `admin_client_assignment`
10. `admin_custom_test_submission`
11. `admin_client`

`admin_custom_test_access_link`는 실시링크 자체이므로 내담자 purge 대상이 아니다. 링크를 비활성화하려면 별도 작업으로 `is_active=false`를 적용한다.

## Safe Query Pattern

삭제 시 CTE로 target set을 매 delete마다 재계산하지 않는다.

잘못된 패턴:

```sql
with target_clients as (...)
delete from admin_assessment_draft ...

with target_clients as (...)
delete from admin_client ...
```

중간 테이블을 먼저 삭제하면 다음 delete에서 CTE 대상이 비어질 수 있다. 실제로 draft를 먼저 삭제한 뒤 target set이 사라져 후속 `admin_client` 삭제가 누락될 수 있다.

안전한 패턴:

1. dry-run으로 `client_id` 목록을 출력한다.
2. 사람이 목록을 확인한다.
3. 삭제 스크립트에서 `CLIENT_IDS = [...]`처럼 고정 목록을 사용한다.
4. 각 delete는 `id = any(:ids)` 형태로 실행한다.

PostgreSQL에서 SQLAlchemy text query를 쓸 때 `where id in :ids`는 문법 오류가 날 수 있다. 배열 파라미터는 `where id = any(:ids)`를 사용한다.

## Verification

삭제 후 최소한 아래 항목이 0인지 확인한다.

```sql
select count(*) from admin_client where id = any(:ids);
select count(*) from admin_custom_test_submission where client_id = any(:ids);
select count(*) from submission_scoring_result where client_id = any(:ids);
select count(*) from client_consent_record where admin_client_id = any(:ids);
select count(*) from admin_assessment_draft where admin_client_id = any(:ids);
select count(*) from admin_client_relation where client_id_a = any(:ids) or client_id_b = any(:ids);
select count(*) from admin_assessment_log where admin_client_id = any(:ids);
select count(*) from admin_client_assignment where admin_client_id = any(:ids);
```

특정 실시링크 기준이면 추가로 확인한다.

```sql
select count(*) from admin_custom_test_access_link where access_token = :token;
select count(*) from admin_assessment_draft where access_token = :token;
select count(*) from admin_client_identity_review where access_token = :token;
```

실시링크 자체는 남기는 것이 기본이므로 `admin_custom_test_access_link`는 1일 수 있다.

## 2026-06-04 Case Note

실시링크:

```text
Gl2LASqVIs9NoOFZQKACPeAD8CHHFe5r
```

이 링크의 `admin_custom_test_id`는 `29`, 검사명은 `표준화 검사`였다.

처음에는 실시링크 token을 `admin_custom_test_submission.access_token`과 직접 비교해 대상 산정을 시도했다. 그러나 submission에는 결과 조회용 token이 저장되어 제출 완료 내담자가 누락됐다.

수정 후 `admin_custom_test_id=29`와 자동 생성 source 기준으로 남은 자동 생성/보조 생성 내담자를 추가 purge했다.

삭제한 자동 생성/보조 생성 내담자:

```text
92, 93, 94, 95, 99, 100, 101, 112, 113, 114, 115, 116, 117, 118,
124, 123, 122, 121, 120, 119, 111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 97, 96, 91, 90
```

수동 내담자 `id=1 부유민`은 `created_source='admin_manual'`이므로 삭제하지 않았다.

최종 확인:

- 해당 검사에 자동 생성/보조 생성으로 배정된 내담자: 0
- 해당 검사 제출: 0
- 실시링크 row: 1
