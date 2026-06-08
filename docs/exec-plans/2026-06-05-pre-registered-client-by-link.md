# Execution Plan

## Task Title
- 검사 실시 링크 기반 사전 등록 내담자 기능

## Request Summary
- `client_intake_mode = "pre_registered_only"` 검사에서, 실시 링크 생성 시 **확인 기준 필드**(match key)를 지정하고 링크 상세 화면에서 사전 등록 내담자를 관리한다.
- 수검 시 프로필 입력 → match key 필드 값으로 사전 등록 목록 확인 → 통과 후 provisional admin_client 생성 → 중간저장/제출 흐름은 기존과 동일하게 유지.

## Goal
1. 링크 생성(또는 변경) 시 `match_field_keys`를 설정할 수 있다.
2. 링크 상세 화면에서 사전 등록 내담자를 추가/삭제할 수 있다.
3. 수검 진입 시 pre_registered_only 검증이 링크 전용 사전 등록 테이블 기반으로 동작한다.
4. 사전 등록 통과 → provisional admin_client 생성 → 중간저장/최종 제출이 기존 로직 그대로 동작한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] `ARCHITECTURE.md` 확인
- [x] `docs/database/runtime-db.md` 확인
- [ ] DB 모델/보정 함수 작성
- [ ] 백엔드 schema/service/router 작성
- [ ] 프론트 링크 생성 UI (match key 선택)
- [ ] 프론트 링크 상세 UI (사전 등록 목록 CRUD)
- [ ] 빌드/검증

## Initial Hypothesis
- `admin_custom_test_access_link` 테이블에 `match_field_keys_json` 컬럼만 추가하면 기존 링크 구조 변경이 최소화된다.
- 사전 등록 내담자는 신규 `assessment_link_pre_registered_client` 테이블로 분리해 링크별로 독립 관리한다.
- `provisional_client_id` 컬럼을 통해 첫 방문/재방문 모두 동일한 admin_client ID를 반환 → 중간저장 흐름 변경 불필요.
- `validate_custom_test_profile_by_access_link` 내 `pre_registered_only` 분기만 교체하면 된다.

## Data Model

### `admin_custom_test_access_link` 컬럼 추가
```
match_field_keys_json  TEXT NOT NULL DEFAULT '["name"]'
```
- 값 예시: `["phone"]`, `["name", "birth_day"]`
- 선택 가능 범위: `name`, `gender`, `birth_day` + child_test의 additional_profile_fields 필드 label-key

### 신규 테이블 `assessment_link_pre_registered_client`
```sql
CREATE TABLE assessment_link_pre_registered_client (
    id                  SERIAL PRIMARY KEY,
    access_link_id      INTEGER NOT NULL REFERENCES admin_custom_test_access_link(id),
    admin_user_id       INTEGER NOT NULL REFERENCES admin_user(id),
    profile_data_json   TEXT NOT NULL DEFAULT '{}',   -- {"phone": "010-xxxx-xxxx"}
    provisional_client_id INTEGER REFERENCES admin_client(id),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX ON assessment_link_pre_registered_client (access_link_id);
CREATE INDEX ON assessment_link_pre_registered_client (admin_user_id);
```

## Initial Plan

### Step 1 — DB 모델 + 보정 함수
1. `app/db/models.py`
   - `AdminCustomTestAccessLink`에 `match_field_keys_json` 컬럼 추가
   - `AssessmentLinkPreRegisteredClient` 모델 신규 추가
2. `app/db/schema_migrations.py`
   - `ensure_access_link_match_field_keys_column()` 작성
   - `ensure_assessment_link_pre_registered_client_table()` 작성
3. `app/main.py` startup에 두 보정 함수 등록

### Step 2 — 백엔드 Repository
`app/repositories/custom_test_repository.py` (또는 신규 파일)에 추가:
- `get_pre_registered_entries_by_link(db, access_link_id)` → list
- `create_pre_registered_entry(db, ...)` → row
- `delete_pre_registered_entry(db, entry_id, admin_user_id)` → bool
- `find_pre_registered_entry_by_match(db, access_link_id, match_keys, profile)` → row | None
- `update_pre_registered_provisional_client(db, entry_id, client_id)` → row

### Step 3 — 백엔드 Service
1. `app/services/admin/assessment_links.py`
   - `generate_custom_test_access_link` — `match_field_keys` 파라미터 수용
   - `validate_custom_test_profile_by_access_link` — pre_registered_only 분기 교체:
     ```
     기존: find_assigned_client_for_profile_with_code (admin_client_assignment 기반)
     신규: find_pre_registered_entry_by_match
           → 없으면 403 "사전 등록되지 않은 내담자입니다"
           → 있고 provisional_client_id 있으면 → 해당 client 사용
           → 있고 provisional_client_id 없으면 → provisional client 생성 → entry 업데이트
     ```
   - `list_pre_registered_clients_for_link(db, admin_session, access_token)` 신규
   - `add_pre_registered_client_for_link(db, admin_session, access_token, profile_data)` 신규
   - `delete_pre_registered_client_for_link(db, admin_session, access_token, entry_id)` 신규

2. `app/services/admin/assessment_links.py`
   - `get_custom_test_by_access_link`의 payload에 `match_field_keys` 포함

### Step 4 — 백엔드 Router
`app/router/custom_test_router.py` (또는 신규 `assessment_link_admin_router.py`):
- `GET  /api/admin/access-links/{access_token}/pre-registered` — 목록 조회
- `POST /api/admin/access-links/{access_token}/pre-registered` — 내담자 추가
- `DELETE /api/admin/access-links/{access_token}/pre-registered/{entry_id}` — 삭제
- `PUT  /api/admin/custom-tests/{custom_test_id}/access-link/match-fields` — match key 변경

### Step 5 — 프론트 링크 생성 UI
`frontend/src/pages/TestDetail.tsx` (링크 생성/관리 카드)
- `pre_registered_only` 검사일 때 링크 생성 시 match key 선택 UI 추가
- 선택 가능 목록: 기본 필드(`이름`, `성별`, `생년월일`) + 검사의 추가 인적사항 필드

### Step 6 — 프론트 링크 상세 UI
`TestDetail.tsx` 내 링크 상세 섹션
- 사전 등록 내담자 목록 테이블 (match key 값, 등록 일시, 삭제 버튼)
- 등록 버튼 → 모달: match key 필드만 입력

### Step 7 — 빌드/검증
- `npm run build:frontend`
- `python -m compileall app`
- `npm run prod:api` + `/health` 확인
- RDS에서 테이블/컬럼 존재 확인
- 수검 링크에서 사전 등록된 내담자 → 통과 확인
- 미등록 내담자 → 403 확인

## Progress Updates

### Update 1 — 2026-06-05
- DB 모델 (`AdminCustomTestAccessLink.match_field_keys_json`, `AssessmentLinkPreRegisteredClient`) 추가
- startup 보정 함수 2개 작성 및 `app/main.py` 등록
- Repository 함수 5개 추가 (`get/create/delete/find/update_provisional`)
- Service: `validate_custom_test_profile_by_access_link` pre_registered_only 분기 교체 (링크 pre_registered 테이블 기반)
- Service: 관리자용 CRUD 함수 4개 추가 (`list/add/remove/update_match_keys`)
- Router: 관리자 사전 등록 API 4개 추가
- 프론트: `TestDetail.tsx`에 사전 등록 관리 UI 추가 (확인 기준 필드 선택 + 내담자 목록 CRUD)

## Result
- `admin_custom_test_access_link` 테이블에 `match_field_keys_json` 컬럼 추가됨
- `assessment_link_pre_registered_client` 테이블 신규 생성됨
- `pre_registered_only` 수검 진입 시 링크 전용 사전 등록 테이블 기반으로 검증
- 통과 후 provisional admin_client 생성 → 중간저장/제출 기존 흐름 유지
- 링크 상세 화면에서 확인 기준 필드 설정 및 내담자 등록/삭제 가능

## Verification
- Checked: `python -m compileall app` 오류 없음
- Checked: `npm run build:frontend` 성공
- Checked: `npm run prod:api` → `/health` `db=postgresql` 반환
- Checked: RDS `admin_custom_test_access_link.match_field_keys_json` 컬럼 존재 확인
- Checked: RDS `assessment_link_pre_registered_client` 테이블 존재 확인
