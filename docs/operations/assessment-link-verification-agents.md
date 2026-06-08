# Assessment Link Verification Agents

## 문서 역할

- 역할: 운영 가이드
- 독자: 실시링크를 실제로 응시하고 RDS 저장 상태를 검수하는 작업자
- Source of truth: 실시링크 검수 에이전트 구성, 실행 순서, 역할별 책임
- 관련 문서:
  - [docs/database/runtime-db.md](../database/runtime-db.md)
  - [docs/database/client-hard-purge.md](../database/client-hard-purge.md)
  - [docs/runtime-run-modes.md](../runtime-run-modes.md)

## 기본 실행 순서

실시링크 검수는 아래 순서로 진행한다.

1. 케이스/문항 선택 번호 생성 에이전트가 검수 케이스를 만든다.
2. 실제 제출 실행 에이전트가 생성된 케이스로 실시링크에 접속해 인적사항 입력, 문항 응답, 제출을 수행한다.
3. 제출 실행 에이전트가 `client_id`, `submission_id`, 결과조회 token, 캡처, 선택 번호 벡터를 보고한다.
4. 관점별 검수 에이전트들이 같은 `client_id/submission_id`를 기준으로 RDS 읽기 전용 검증을 수행한다.
5. 메인 에이전트가 결과를 통합하고, 필요 시 테스트 데이터 hard purge를 별도 절차로 수행한다.

## 공통 규칙

- 모든 에이전트는 먼저 `AGENTS.md`를 확인한다.
- RDS 기준 문서는 `docs/database/runtime-db.md`를 따른다.
- 실시링크 token과 submission 결과조회 token을 혼동하지 않는다.
- DB delete/hard purge는 검수 에이전트가 수행하지 않는다.
- 관점별 검수 에이전트는 기본적으로 읽기 전용 SQL만 실행한다.
- 실제 제출 실행 에이전트만 검수 목적의 데이터 생성 행동을 수행할 수 있다.
- 제출 후 검수 기준은 `admin_custom_test_submission.id`인 `submission_id`를 중심으로 잡는다.

## Agent 0. Orchestrator

### 역할

메인 에이전트가 전체 작업을 조율한다.

### 책임

- 대상 실시링크와 token을 확정한다.
- 케이스 생성 에이전트를 먼저 실행한다.
- 제출 실행 에이전트에 확정된 케이스와 선택 번호 벡터를 전달한다.
- 제출 결과의 `client_id`, `submission_id`, 결과조회 token을 관점별 검수 에이전트에게 전달한다.
- 최종 결과를 통합한다.
- 테스트 데이터 삭제가 필요하면 [client-hard-purge.md](../database/client-hard-purge.md) 기준으로 별도 진행한다.

### 금지

- 케이스 생성 전 실제 제출을 시작하지 않는다.
- 검수 완료 전 임의로 테스트 데이터를 삭제하지 않는다.

## Agent 1. Case And Choice Generator

### 역할

검사별 인적사항 분기, norm 분기, item 분기를 고려해 실제 검수 케이스와 문항별 선택 번호 벡터를 만든다.

### 확인 대상

- `admin_custom_test_access_link`
- `child_test`
- `selected_scales_json`
- `session_configs_json`
- `test_profile_config`
- `condition_profile_map`
- 검사별 `age_range`, `gender`, `informant`, `subject_type`
- 문항별 선택지 수와 역채점/점수 검증에 유리한 선택 패턴

### 입력

- 실시링크 token
- 검수 목적
- 필요한 분기 조건

### 출력

- 케이스명
- primary 인적사항
- secondary 인적사항
- 선택 번호 생성 규칙
- 문항별 선택 번호 벡터 또는 생성 알고리즘
- 기대되는 item/norm/profile 분기
- 제출 실행 에이전트에게 넘길 payload 요약

### 금지

- DB write/delete
- 실제 제출

## Agent 2. Submission Runner

### 역할

케이스 생성 에이전트가 만든 payload로 실제 실시링크에 접속해 인적사항 입력부터 문항 응답, 제출까지 수행한다.

### 입력

- 실시링크 URL
- 케이스명
- primary/secondary 인적사항
- 문항별 선택 번호 벡터
- 동의/재응시/모호 매칭 분기 처리 지침

### 수행

1. Playwright 등 브라우저 자동화로 실시링크에 접속한다.
2. 개인정보 동의가 있으면 동의한다.
3. 인적사항을 입력한다.
4. 본인 확인/자동 등록 분기를 진행한다.
5. 문항 수와 선택 번호 벡터 길이를 비교한다.
6. 각 문항에 지정된 선택 번호를 선택한다.
7. 제출한다.
8. 완료 화면, `submission_id`, 결과조회 token을 확보한다.
9. RDS 읽기 전용 쿼리로 저장 여부를 1차 확인한다.

### 출력

- 케이스명
- 입력한 인적사항
- 실제 선택 번호 벡터
- `client_id`
- `submission_id`
- 결과조회 token
- 캡처 경로
- 제출 중 발생한 분기
- 미확인 항목

### 허용되는 DB 변경

- 실제 실시링크 제출로 인해 앱이 생성하는 검수 데이터

### 금지

- DB delete
- 수동 insert/update
- 케이스 생성 에이전트 결과 없이 제출 시작

## Agent 3. Link And Test Config Verifier

### 역할

실시링크와 검사 설정이 정상인지 확인한다.

### 확인 대상

- `admin_custom_test_access_link`
- `child_test`
- `test_profile_config`
- 동의 설정
- selected scale/session/profile config

### 정상 기준

- link row가 1개이고 `is_active=true`
- `child_test.is_deleted=false`
- `selected_scales_json`이 비어 있지 않음
- 각 test id에 `test_profile_config`가 존재
- `requires_consent=true`이면 동의 문구가 존재

## Agent 4. Client And Relation Verifier

### 역할

인적사항 자동 등록, primary/secondary client, relation이 정상 생성됐는지 확인한다.

### 확인 대상

- `admin_client`
- `admin_client_assignment`
- `admin_client_relation`

### 정상 기준

- 신규 primary는 `created_source='assessment_link_auto'`
- 신규 secondary는 제출 후 `created_source='assessment_link_secondary'`
- secondary는 `parent_name`, `parent_gender`, `parent_birth_day`가 모두 있을 때 생성
- primary/secondary relation이 역할과 함께 생성
- 기존 exact match가 있으면 기존 client 재사용 가능

## Agent 5. Draft Verifier

### 역할

중간 저장과 재진입 복원을 검수한다.

### 확인 대상

- `admin_assessment_draft`
- `profile_json`
- `answers_json`
- `current_part_index`
- `current_page`

### 정상 기준

- 중간 저장 후 draft row 1개 존재
- 같은 내담자의 재저장은 새 row가 아니라 기존 row update
- 재진입 시 draft가 복원됨
- 최종 제출 후 해당 draft는 삭제됨

## Agent 6. Submission Verifier

### 역할

최종 제출 row와 저장 구조를 검수한다.

### 확인 대상

- `admin_custom_test_submission`
- `answers_json.profile`
- `answers_json.answers`
- 결과조회 token

### 정상 기준

- 제출 후 submission row가 생성됨
- `submission.access_token`은 실시링크 token이 아니라 결과조회 token
- `answers_json` 최상위에 `profile`, `answers`가 존재
- `admin_user_id`, `admin_custom_test_id`, `client_id`가 링크/내담자와 일치

## Agent 7. Scoring Result Verifier

### 역할

채점 결과 저장과 parent test별 result 구조를 검수한다.

### 확인 대상

- `submission_scoring_result`
- `result_json`
- parent test별 `status`, `test_id`, `scales`, `meta`

### 정상 기준

- 제출 후 최신 scoring result가 존재
- `submission_id`, `client_id`, `admin_custom_test_id`, `admin_user_id`가 submission과 일치
- 지원되는 parent test는 `status='scored'`와 비어 있지 않은 `scales`를 가진다
- 수동 재채점으로 중복 row가 있을 수 있으므로 최신 row 기준으로 판단

## Agent 8. Consent Log Assignment Verifier

### 역할

동의, 실시 로그, 배정 상태를 검수한다.

### 확인 대상

- `client_consent_record`
- `admin_assessment_log`
- `admin_client_assignment`

### 정상 기준

- 동의 필수 검사면 `consented=true` row가 1건 이상 존재
- 제출 후 primary client의 assessment log가 생성됨
- secondary client가 생성된 경우 secondary log도 생길 수 있음
- assignment는 `(admin_user_id, admin_client_id, admin_custom_test_id)` 기준으로 존재

## Agent 9. Item Choice And Score Verifier

### 역할

문항별 선택 보기 번호와 채점 점수 저장을 검수한다.

### 확인 대상

- 프론트 문항 선택 컴포넌트
- `admin_custom_test_submission.answers_json`
- `submission_scoring_result.result_json`
- `choice_score` 기반 점수

### 정상 기준

- 화면에서 선택한 보기 번호가 `answers_json.answers[].items[].answer_value`에 그대로 저장됨
- 저장 문항 수가 제출 당시 문항 수와 같음
- 채점 `item_scores[].answer_value`가 저장된 보기 번호와 일치
- 채점 `item_scores[].score`는 `choice_score[item_id][answer_value]`와 일치
- 역채점은 런타임 공식이 아니라 `choice_score` 맵에 반영된 점수로 검증

## Data Handoff

### Case Generator To Submission Runner

```json
{
  "case_name": "검수_0604_01",
  "assessment_url": "https://www.inpsyt-norm.com/assessment/custom/<token>",
  "profile": {
    "name": "...",
    "gender": "...",
    "birth_day": "...",
    "parent_name": "...",
    "parent_gender": "...",
    "parent_birth_day": "..."
  },
  "choice_strategy": "alternating_1_to_5",
  "choices_by_order": [1, 2, 3, 4, 5]
}
```

### Submission Runner To Verifiers

```json
{
  "case_name": "검수_0604_01",
  "client_id": 0,
  "secondary_client_id": 0,
  "submission_id": 0,
  "report_access_token": "...",
  "choices_by_item": [
    {
      "order": 1,
      "item_id": "...",
      "selected_option": "1"
    }
  ],
  "screenshots": []
}
```

## Completion Criteria

검수는 아래가 모두 만족될 때 완료로 본다.

- 실제 제출이 성공했다.
- submission row가 생성됐다.
- scoring result가 생성됐다.
- 문항별 선택 보기 번호가 저장값과 일치한다.
- 문항별 점수가 `choice_score` 기준과 일치한다.
- primary/secondary client와 relation이 기대대로 생성됐다.
- 동의, 로그, 배정 row가 기대대로 생성됐다.
- 최종 결과가 실행계획 문서에 기록됐다.
