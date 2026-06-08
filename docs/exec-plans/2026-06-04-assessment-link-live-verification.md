# Execution Plan

## Task Title
- 실시링크 실제 제출 및 RDS 저장 검수

## Request Summary
- `<assessment-link-token>` 실시링크로 검수 케이스를 실제 제출한다.
- 제출 후 RDS에서 인적사항, 응답, 문항별 선택 번호, 점수, 채점 결과, 동의/로그/배정/관계를 검수한다.

## Goal
- `A_main_3_7_mother` 케이스를 1건 제출한다.
- `client_id`, `secondary_client_id`, `submission_id`, 결과조회 token을 확보한다.
- 관점별 검수 결과를 기록한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 케이스/선택 번호 생성 에이전트 결과 확보
- [x] 기존 제출 실행 에이전트가 데이터 생성하지 않은 것 확인
- [ ] 실제 제출 실행
- [ ] RDS 저장 검수
- [ ] 문항별 선택 번호/점수 검수
- [ ] 결과 기록

## Initial Hypothesis
- API 레벨로도 실제 실시링크 submit 경로를 동일하게 검증할 수 있다.
- 브라우저 자동화가 막히면 동일 endpoint를 사용해 제출하되, UI 구조 검증은 별도 캡처로 보완한다.

## Initial Plan
1. 대상 링크와 현재 데이터 baseline을 확인한다.
2. profile validate/register/consent/assessment payload 흐름을 실행한다.
3. `assessment_payload.items`와 score map으로 선택 번호 벡터를 만든다.
4. submit endpoint로 제출한다.
5. RDS에서 저장 체인을 검증한다.

## Progress Updates
### Update 1
- Time: 2026-06-04
- Change: 이전 제출 실행 에이전트가 장시간 무응답이었고 RDS에 검수 케이스 데이터가 없음을 확인했다.
- Reason: 중복 제출을 피하고 실제 진행 여부를 판단하기 위함이다.

### Update 2
- Time: 2026-06-04
- Change: API 흐름으로 검수 케이스 `A_main_3_7_mother`를 실제 제출했다.
- Result:
  - `client_id=125`
  - `submission_id=54`
  - `access_token=<report-access-token>`
  - `scoring_result_id=59`
  - `scoring_status=scoring_completed`
  - expected answer artifact: `artifacts/verification/2026-06-04-A-main-expected-answers.json`
- Reason: 이후 RDS 저장 검수에서 실제 저장값과 선택 번호/점수 기대값을 대조하기 위함이다.

### Update 3
- Time: 2026-06-04
- Change: 제출 직후 RDS 검수 스크립트를 실행했으나 `127.0.0.1:15432` 접속이 거부되었다.
- Evidence:
  - `psycopg.OperationalError: connection to server at "127.0.0.1", port 15432 failed: Connection refused`
  - 샌드박스 밖 소켓 접속 확인도 `ConnectionRefusedError: [Errno 111] Connection refused`
- Reason: RDS SSH 터널이 현재 내려간 상태로 판단된다.

### Update 4
- Time: 2026-06-04
- Change: RDS 터널 재연결 후 `submission_id=54` 기준 저장 검수를 완료했다.
- Result:
  - primary client: `id=125`, `검수아동A0604`, `assessment_link_auto`
  - secondary client: `id=126`, `검수양육자A0604`, `assessment_link_secondary`
  - relation: primary-secondary 관계 존재
  - assignment: primary 1건, secondary 1건
  - consent record: 1건
  - draft: 제출 후 0건
  - assessment log: 1건
  - submission answers: 기대 244문항 / 저장 244문항
  - selected option mismatch: 0건
  - scored item count: 129문항 (`K-PSI-4-SF`, `PAT-2`, `PCT`)
  - DB `scale.struct` 기준 score mismatch: 0건
  - `PSES`: `unsupported_test_id`로 skipped
  - report artifact: `artifacts/verification/2026-06-04-A-main-rds-verification.json`
- Note: 선택번호 생성 에이전트의 기대 점수 파일에는 PCT 역채점 해석 오류 13건이 있었다. 실제 저장 점수는 RDS `scale.struct` 기준과 일치했다.

### Update 5
- Time: 2026-06-04
- Change: 중간저장 검수를 별도 draft-only 케이스로 추가 진행한다.
- Plan:
  - `검수아동D0604`, `검수양육자D0604` 프로필로 자동 내담자 등록
  - 일부 문항만 응답 후 `PUT /api/assessment-links/{token}/draft`
  - 제출 전 RDS `admin_assessment_draft` row 생성/내용 확인
  - `GET /api/assessment-links/{token}/draft` 복원 응답 확인
  - 최종 제출 후 RDS draft 삭제 확인
- Reason: 기존 제출 검수는 제출 후 draft 삭제만 확인했고, 제출 전 draft row 내용은 사후 확인할 수 없었기 때문이다.

### Update 6
- Time: 2026-06-04
- Change: 중간저장 검수를 완료했다.
- Result:
  - successful draft case: `client_id=131`, `submission_id=57`, `scoring_result_id=62`
  - draft row before submit: `admin_assessment_draft.id=39`
  - partial draft answers: 17문항
  - full submit answers: 244문항
  - draft row after submit: 0건
  - artifact: `artifacts/verification/2026-06-04-draft-verification-170812.json`
- Checks:
  - `PUT /draft` 후 RDS `admin_assessment_draft` row 생성 확인
  - `profile_json`이 입력 profile과 일치
  - `answers_json`이 17문항 partial answers와 일치
  - `current_part_index=1`, `current_page=3` 저장 확인
  - `GET /draft` 복원 응답이 RDS row와 일치
  - 최종 제출 후 draft 삭제 확인
- Note: 첫 draft 검수 시도는 제출 후 삭제된 ORM 객체를 다시 읽으면서 리포트 작성만 실패했다. 해당 시도도 `client_id=129`, `submission_id=56`까지 생성되었고 제출 후 draft 0건 상태다.

### Update 7
- Time: 2026-06-04
- Change: 사용자 요청에 따라 기존 에이전트 6개를 재사용해 관점별 재검수를 배정했다.
- Assigned:
  - Link/Test Config Verifier
  - Client/Relation Verifier
  - Draft Verifier
  - Submission Verifier
  - Scoring/Item Choice Verifier
  - Consent/Log/Assignment Verifier
- Reason: 메인 검수 결과를 독립 관점으로 재확인하기 위함이다.

### Update 8
- Time: 2026-06-04
- Change: 에이전트 재검수 결과를 수집했다.
- Result:
  - Link/Test Config Verifier: PASS
  - Client/Relation Verifier: PASS
  - Draft Verifier: PASS
  - Submission Verifier: PASS
  - Scoring/Item Choice Verifier: PASS
  - Consent/Log/Assignment Verifier: PASS with policy note
- Findings:
  - 링크 `id=29`, `child_test.id=29`, `is_active=true`, `requires_consent=true`, `client_intake_mode=auto_create`
  - 본 제출 `submission_id=54`, `client_id=125`, secondary `126`, relation `id=31`
  - draft 검수 제출 `submission_id=57`, `client_id=131`, secondary `132`, relation `id=34`
  - 본 제출 응답 244/244 저장 일치, 선택 보기 mismatch 0건
  - scored item 129/129 DB `scale.struct` 기준 점수 일치
  - `PSES`는 `unsupported_test_id`로 skipped
  - 중간저장은 `admin_assessment_draft.id=39` 생성/복원 후 제출 시 삭제 확인
  - consent/log/assignment는 primary/secondary assignment 및 log 모두 존재, consent row는 primary 기준 존재
- Policy Note:
  - 한 에이전트가 secondary parent client `126`, `132`에 별도 `client_consent_record`가 없음을 조건부 이슈로 표시했다.
  - 현재 문서 기준은 동의 필수 검사에서 `consented=true` row 1건 이상이며, 앱 흐름도 primary client 기준으로 동의를 저장한다.
  - 만약 정책상 secondary client에도 별도 동의 기록이 필요하면 현재 구현/요건 보완 대상이다.

## Result
- 실제 제출 및 RDS 사후 검수를 완료했다.
- 저장 검수는 통과했다.
- 중간저장 생성/복원/제출 후 삭제 검수도 통과했다.
- 에이전트 관점별 재검수도 통과했다.
- 단, 선택번호 생성 에이전트의 기대 점수 산출 로직은 PCT 역채점 처리 보완이 필요하다.
- 정책상 secondary client별 동의 기록이 필요하면 추가 요구사항으로 분리해야 한다.

## Verification
- Checked: `검수아동A0604`, `검수양육자A0604` 관련 client/submission 없음
- Checked: 실제 제출 API 응답에서 `submission_id=54`, `scoring_result_id=59`, `scoring_completed` 확인
- Checked: RDS 사후 저장 검수 완료
- Checked: 문항별 선택 번호 244/244 저장 일치
- Checked: 문항별 점수 129/129 DB `scale.struct` 기준 일치
- Checked: 관계/동의/로그/배정 최종 대조 완료
- Checked: 중간저장 row 생성 및 `profile_json`/`answers_json`/페이지 상태 저장 일치
- Checked: 중간저장 GET 복원 응답 일치
- Checked: 최종 제출 후 중간저장 row 삭제
- Checked: 에이전트 6개 관점별 독립 재검수
- Not checked: PSES 점수 저장. 현재 scoring registry에서 `unsupported_test_id`로 skipped 처리됨.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- RDS 터널이 제출 이후 끊겨 사후 DB 검수가 중단되었다.
- 선택번호 생성 에이전트의 기대 점수 산출 로직이 PCT 일부 역채점 문항을 반대로 계산했다.

### Why
- 로컬 포트 `15432`에 리스닝 중인 터널이 없거나 터널 프로세스가 RDS로 연결하지 못하는 상태다.
- PCT는 scale-level `choice_score`에 역채점 반영본이 있으며, 단순 choice_score 탐색으로 기대 점수를 만들면 facet/parent 구조에서 잘못된 맵을 집을 수 있다.

### Next Time
- 점수 기대값 생성은 scoring utility의 `build_scoring_scale_index` 또는 RDS `scale.struct`의 실제 selected scale code를 기준으로 생성한다.
- `PSES` 채점 검수는 scorer 등록 후 별도 케이스로 재검수한다.

## Related Documents
- [docs/operations/assessment-link-verification-agents.md](/mnt/c/Users/user/workspace/2.0-modular/docs/operations/assessment-link-verification-agents.md)
- [docs/database/client-hard-purge.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/client-hard-purge.md)
