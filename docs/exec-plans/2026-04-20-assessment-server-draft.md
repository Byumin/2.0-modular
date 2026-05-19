# Execution Plan

## Task Title
- 검사 실시 서버 임시저장 추가

## Request Summary
- 검사 실시 도중 창을 닫아도 서버에 중간 답변을 저장하고 재진입 시 이어서 진행할 수 있도록 DB 구조, 현재 소스, 문서를 검토한 뒤 계획을 세워 반영한다.

## Goal
- 정식 제출 데이터와 분리된 draft 저장소를 추가한다.
- 수검자 client가 확정된 뒤 답변 변경을 서버에 자동 저장한다.
- 같은 수검자가 같은 검사 링크로 다시 들어오면 저장된 답변과 위치를 복원한다.
- 최종 제출 성공 시 draft를 정리한다.

## Initial Hypothesis
- 현재 답변은 `QuestionStep`의 React 상태에만 있고, 최종 제출 시 `/submit`에서만 DB에 저장된다.
- 같은 검사 링크를 여러 사람이 사용할 수 있으므로 draft 식별자는 `access_token` 단독이 아니라 `admin_user_id + custom_test_id + client_id` 기준이어야 한다.
- 현재 프로젝트는 SQLAlchemy 모델과 startup 보정 함수를 함께 사용하므로 모델, schema migration, repository를 같이 추가해야 한다.

## Initial Plan
1. DB 모델과 startup 보정 함수에 `admin_assessment_draft` 테이블을 추가한다.
2. draft 조회/저장/삭제 repository 함수를 추가한다.
3. assessment link schema/router/service에 draft GET/PUT API를 추가하고, 최종 제출 성공 시 draft를 삭제한다.
4. profile 검증 응답에 기존 draft를 포함해 프론트가 복원할 수 있게 한다.
5. `QuestionStep`에 초기 답변/위치와 진행 변경 콜백을 추가하고, `AssessmentPage`에서 debounce 자동 저장을 붙인다.
6. 빌드와 서버 기동 기반 흐름 검증을 진행한다.

## Progress Updates
### Update 1
- Time: 2026-04-20
- Change: AGENTS, ARCHITECTURE, doc governance, exec-plan 규칙과 현재 assessment link 제출 구조를 확인했다.
- Reason: DB 구조 변경과 수검자 흐름 변경이 함께 필요한 작업이므로 기존 계층 규칙과 startup 보정 방식을 먼저 맞췄다.

### Update 2
- Time: 2026-04-20
- Change: `admin_assessment_draft` 모델, startup 보정 함수, repository upsert/get/delete, draft API, 최종 제출 후 draft 삭제, 프론트 복원/자동 저장 연결을 추가했다.
- Reason: 정식 제출 저장과 중간 저장을 분리하고, 같은 링크 공유 상황에서 client 기준으로 draft가 섞이지 않도록 하기 위해서다.

## Result
- 서버 임시저장 기능을 추가했다.
- `admin_assessment_draft` 테이블을 추가하고 startup 보정에서 운영 DB에 생성되도록 연결했다.
- 수검자 client가 확정된 뒤 문항 진행 상태를 `/api/assessment-links/{token}/draft`에 debounce 저장한다.
- 같은 인적사항으로 재진입하면 profile 검증 응답에 포함된 draft를 `QuestionStep` 초기 답변/위치로 복원한다.
- 최종 제출 성공 시 해당 client/test draft를 삭제한다.

## Verification
- Checked:
  - `.venv/bin/python -m compileall app`
  - `npm run build`
  - FastAPI startup으로 `admin_assessment_draft` 테이블 생성 확인
  - Playwright 브라우저 흐름으로 답변 1개 선택 후 임시저장, 창 닫기, 같은 인적사항 재진입, `1/29 문항 완료` 복원 확인
  - `modular.db`에서 draft row의 `answers_json`에 1개 답변 저장 확인
- Not checked:
  - 모든 문항 제출 후 draft 삭제 UI 흐름은 전체 29문항 입력 시간이 커서 직접 브라우저로 끝까지 제출하지 않았다. 서버 제출 성공 경로에는 draft 삭제 호출을 연결했다.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 별도 문제 없음.

### Why
- 기존 계층 구조와 startup 보정 방식에 맞춰 추가했고, 브라우저 검증에서 저장/복원 흐름이 확인됐다.

### Next Time
- 운영 정책이 필요해지면 draft 만료 기간과 관리자 미완료 검사 노출 여부를 별도 요구사항으로 분리한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
