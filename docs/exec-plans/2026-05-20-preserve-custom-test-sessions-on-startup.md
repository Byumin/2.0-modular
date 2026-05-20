# Preserve Custom Test Sessions On Startup

## Request Summary
- 공개 검사 링크에서 서버 재시작 후 2개였던 세션이 1개로 합쳐진 원인을 확인한다.
- 원인이 코드라면 재발하지 않도록 수정한다.

## Goal
- `child_test.selected_scales_json.__sessions`가 서버 startup migration에서 사라지지 않게 한다.
- 이미 세션 메타가 없는 데이터는 원인을 명확히 설명하고, 별도 복구가 필요한 상태로 남긴다.

## Initial Hypothesis
- 수검자 화면의 세션 분리는 DB의 `selected_scales_json.__sessions`와 `parts[*].session_id`에 의존한다.
- 운영 DB에서 해당 링크의 `__sessions`가 없으면 모든 검사가 fallback `session_1`로 묶인다.

## Preflight Checklist
- `AGENTS.md` 확인 완료.
- 디버깅 설명 규칙 `docs/debug/explanation-rule.md` 확인 완료.
- DB/구조 변경은 기존 source-of-truth와 실제 코드 기준으로 확인한다.

## Plan
1. 운영 링크의 API/DB 상태를 확인한다.
2. 세션 메타를 삭제할 수 있는 startup/update/create 경로를 추적한다.
3. startup migration이 `__sessions`를 보존하도록 수정한다.
4. 로컬 재현 코드로 `__sessions` 보존 여부를 검증한다.
5. 데이터 재작성 migration이 서버 시작 때 자동 실행되지 않도록 제한한다.
6. startup 함수 중 기존 row를 UPDATE/DROP/재작성하는 다른 후보도 점검한다.

## Changes During Work
- 운영 DB 확인 결과 custom test `29`의 `selected_scales_json`에는 `__sessions`가 없었다.
- `migrate_child_test_sub_test_json_to_structured()`가 모든 `selected_scales_json`을 재작성하면서 메타 키를 버리는 경로를 확인했다.
- 사용자 확인에 따라 custom test `29`의 `__sessions`를 `K-PSI-4-SF/PAT-2/PCT`와 `PSES` 2개 세션으로 복구했다.
- 사용자 제공 문구에 따라 custom test `29`의 세션별 `description`과 `guide_items`를 복구했다.
- startup의 schema 보정은 유지하되, `migrate_child_test_sub_test_json_to_structured()`는 `RUN_STARTUP_DATA_MIGRATIONS=1`일 때만 실행되도록 바꿨다.
- 추가 점검 결과 `rotate_shared_submission_access_tokens()`, `ensure_test_profile_config_restructure()`, `ensure_test_profile_condition_profile_maps()`도 기존 데이터를 바꾸는 작업이라 같은 opt-in 조건으로 묶었다.

## Result
- `app/db/schema_migrations.py`에서 `selected_scales_json` 재작성 시 `__`로 시작하는 메타 키를 먼저 보존하도록 수정했다.
- 검사 ID 순회 중 `__sessions` 같은 메타 키는 parent test로 처리하지 않도록 제외했다.
- 운영 DB의 custom test `29`는 이미 `__sessions`가 삭제된 상태라 코드 패치만으로 자동 복구되지는 않는다.
- custom test `29` 운영 데이터는 지정된 세션 배정으로 수동 복구했다.
- custom test `29` 운영 데이터는 지정된 세션 안내 문구와 안내 항목으로 수동 복구했다.
- 서버 시작 시 데이터 재작성 migration은 기본적으로 실행되지 않는다.
- 서버 시작 시 제출 토큰 회전, profile config 테이블 재구성/drop, condition profile map JSON 보정도 기본적으로 실행되지 않는다.

## Verification
- 운영 DB 조회: 링크 `Gl2LASqVIs9NoOFZQKACPeAD8CHHFe5r`는 custom test `29`를 가리키며 현재 `selected_scales_json.__sessions`가 없다.
- 로컬 격리 실행: `migrate_child_test_sub_test_json_to_structured()` 실행 후 `__sessions` 2개가 보존되는 것을 확인했다.
- 문법 검증: `.venv/bin/python3 -m py_compile app/db/schema_migrations.py`
- 문법 검증: `.venv/bin/python3 -m py_compile app/main.py app/db/schema_migrations.py`
- 운영 DB 복구 검증: `load_custom_test_session_configs()` 결과가 세션 1 `K-PSI-4-SF/PAT-2/PCT`, 세션 2 `PSES`로 반환된다.
- 운영 payload 검증: 샘플 프로필 기준 `parts`가 세션 1 파트 3개, 세션 2 파트 1개로 생성된다.
- 운영 payload 검증: 세션 1 안내 항목 3개, 세션 2 안내 항목 4개가 각 세션 part에 포함된다.

## Retrospective
- Execution Judgment Problem: 기존 startup migration이 검사 config만 고려하고 같은 JSON 필드에 저장되는 세션 메타를 보존하지 않았다.
