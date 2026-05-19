# Ambiguous New Client Force Create

## Task Title
- 모호 매칭 신규 내담자 선택 시 항상 신규 생성

## Request Summary
- 수검자가 모호 매칭 모달에서 `신규 내담자로 등록`을 선택하면 기존 내담자 exact identity 재사용을 하지 않고 항상 신규 내담자를 생성하도록 수정한다.

## Goal
- `responder_choice == "new"` 분기에서만 기존 내담자 재사용 로직을 우회한다.
- 일반 `auto_create` 확인 모달의 기존 exact identity 재사용 동작은 유지한다.
- provisional 내담자 사후 검토/병합 흐름과 제출 연결을 유지한다.

## Initial Hypothesis
- 현재 `responder_choice == "new"`와 일반 `register-client` 흐름이 모두 `register_client_and_assign_for_public_assessment()`를 사용한다.
- 해당 함수는 먼저 `find_admin_client_by_identity()`로 기존 내담자를 찾고 있으면 재사용한다.
- 모호 매칭 신규 선택에는 기존 조회를 하지 않는 전용 생성/배정 함수가 필요하다.

## Initial Plan
1. 기존 등록 함수와 모호 매칭 분기 호출 위치를 확인한다.
2. `clients.py`에 재사용을 하지 않는 provisional 신규 생성/배정 함수를 추가한다.
3. `assessment_links.py`의 `responder_choice == "new"` 분기만 새 함수를 사용하게 바꾼다.
4. 직접 함수 호출 검증으로 exact identity 기존 내담자가 있어도 신규 row가 생성되는지 확인한다.

## Progress Updates
### Update 1
- Time: 2026-04-13
- Change: 계획 문서 작성 및 호출 구조 확인.
- Reason: 동명이인 검증 정책 변경이므로 변경 의도와 회고를 남긴다.

### Update 2
- Time: 2026-04-13
- Change: `create_provisional_client_and_assign_for_public_assessment()`를 추가하고, `responder_choice == "new"` 분기만 이 함수를 호출하도록 변경했다.
- Reason: 공통 자동 등록 함수는 exact identity 기존 내담자를 재사용하므로, 수검자가 후보 중 누구도 아니라고 선택한 모호 매칭 신규 경로에는 맞지 않았다.

### Update 3
- Time: 2026-04-13
- Change: 새 내담자 생성 후 배정 전에 `db.flush()`로 ID를 확정하도록 보정하고 직접 함수 호출 검증을 수행했다.
- Reason: 신규 생성 직후 배정을 만들 때 `new_item.id`가 아직 `None`일 수 있어, 배정 row 생성 전 flush가 필요했다.

## Result
- 모호 매칭 모달에서 `신규 내담자로 등록`을 선택하면 기존 exact identity 내담자를 재사용하지 않고 항상 `assessment_link_provisional` 내담자를 새로 만든다.
- 일반 `auto_create` 확인 모달의 기존 exact identity 재사용 동작은 유지했다.
- 신규 row 생성 직후 배정 row를 만들기 전에 `db.flush()`로 client id를 확정한다.

## Verification
- Checked:
  - `AGENTS.md`
  - `app/services/admin/assessment_links.py`
  - `app/services/admin/clients.py`
  - `app/repositories/client_repository.py`
  - `.venv/bin/python -m compileall app/services/admin/clients.py app/services/admin/assessment_links.py`
  - 직접 함수 호출 검증:
    - 동일 `name + gender + birth_day` 기존 내담자가 있을 때 일반 자동 등록 함수는 기존 내담자를 재사용하고 `created=False`를 반환
    - 동일 인적사항에서 provisional 신규 생성 함수는 별도 내담자를 새로 만들고 `created_source=assessment_link_provisional`을 반환
    - 검증 데이터 cleanup 후 동일 이름 row `0`건 확인
- Not checked:
  - 브라우저 E2E 제출 플로우

## Retrospective
### Classification
- `Execution Judgment Problem`

### What Was Wrong
- 모호 매칭의 `new` 선택과 일반 자동 등록이 같은 함수에 묶여 있어, 수검자의 신규 선택 의도와 다르게 기존 exact identity 재사용이 가능했다.

### Why
- 중복 내담자 방지용 공통 함수가 모든 자동 등록 경로에서 재사용됐고, 모호 매칭의 “후보 중 누구도 아님” 의미가 함수 경계에 반영되지 않았다.

### Next Time
- UI 선택지가 의미하는 정책이 다르면 같은 저장 함수를 공유하지 말고, 저장 전 identity 재사용 여부를 함수명과 분기로 분리한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
