# Technical Debt & Known Issues

이 문서는 코드 검토 중 발견된 버그·구조적 문제·성능 우려사항을 추적한다.
각 항목은 심각도(🔴 Critical / 🟠 Major / 🟡 Minor), 상태, 관련 파일/함수, 재현 조건, 권장 수정 방향을 기록한다.

---

## 범례

| 심각도 | 기준 |
|--------|------|
| 🔴 Critical | 잘못된 채점·데이터 오염 가능, 즉시 수정 권장 |
| 🟠 Major | 운영 중 드물게 발생하거나 규모 증가 시 문제, 계획적 수정 필요 |
| 🟡 Minor | UX·운영 불편, 여유 있을 때 개선 |

| 상태 | 의미 |
|------|------|
| `open` | 미수정 |
| `in-progress` | 수정 중 |
| `resolved` | 수정 완료 (날짜 기재) |
| `wontfix` | 의도적으로 수정 안 함 (이유 기재) |

---

## 이슈 목록

### TD-001 · 🔴 · `resolved` (2026-05-05)
**informant / gender 미입력 시 silent wrong norm selection**

- **파일**: `app/services/admin/assessment_links.py`
- **함수**: `_profile_matches_sub_test` (line 208, 215)
- **코드**:
  ```python
  if profile_gender and profile_gender not in allowed:          # gender 빈 문자열이면 skip
      return False
  if profile_informant and profile_informant not in allowed_informants:  # informant 빈 문자열이면 skip
      return False
  ```
- **문제**: 필드가 비어있으면 조건 검사를 건너뜀 → PAT-2 18개 variant 모두 통과 → 잘못된 norm으로 채점. 에러 없이 조용히 진행.
- **재현**: informant 없이 PAT-2 포함 검사 API 직접 POST
- **영향**: 정상 UI 경로(required_profile_fields 강제)에서는 발생 안 하지만 API 직접 호출·프론트 검증 누락 시 실재
- **권장 수정**: `profile_gender`가 빈 문자열일 때도 `return False` 처리 (필드가 required임을 전제한다면 엄격 모드 적용)
- **발견일**: 2026-05-05
- **수정 내용**: `if profile_gender and ...` → `if not profile_gender or ...` / `if profile_informant and ...` → `if not profile_informant or ...`

---

### TD-002 · 🔴 · `resolved` (2026-05-05)
**birth_day 미입력 시 age_range 체크 skip**

- **파일**: `app/services/admin/assessment_links.py`
- **함수**: `_profile_matches_sub_test` (line 220)
- **코드**:
  ```python
  if isinstance(age_range, dict) and birth_day is not None:   # birth_day None이면 전체 skip
  ```
- **문제**: birth_day가 없으면 연령 구간 체크를 아예 생략 → 모든 variant 통과
- **재현**: birth_day 없이 PAT-2 문항 요청
- **권장 수정**: birth_day가 None이고 age_range 조건이 있으면 `return False`
- **수정 내용**: `if isinstance(age_range, dict) and birth_day is not None:` → `if isinstance(age_range, dict): if birth_day is None: return False`

---

### TD-003 · 🔴 · `wontfix`
**멀티 매칭 시 비결정론적 첫 번째 variant 선택**

- **파일**: `app/services/admin/assessment_links.py`
- **함수**: `_select_sub_test_variant_for_profile` (line 273)
- **코드**:
  ```python
  matches.sort(key=lambda value: (age_start_from_json(value), value))
  return variant_by_json[matches[0]]
  ```
- **문제**: 멀티 매칭 시 두 번째 정렬 키가 JSON 전체 문자열 → informant 등 조건 직렬화 순서에 따라 선택 결과가 달라질 수 있음. 에러 없이 진행.
- **재현**: TD-001/TD-002 조건 하에서 멀티 매칭 발생 시
- **권장 수정**: 멀티 매칭이 1개 초과이면 에러 raise 또는 최소한 경고 로그
- **wontfix 이유**: 멀티 매칭은 TD-001/002 수정으로 정상 경로에서 발생하지 않음. 경로 2(DB 조건 overlap)는 검사 개발자·DB insert 단계에서 막아야 할 설계 책임이므로 애플리케이션 코드에서 방어 불필요.

---

### TD-004 · 🟠 · `open`
**migration과 신규 생성 간 sub_test_json 구조 불일치**

- **파일**: `app/db/schema_migrations.py`
- **함수**: `migrate_child_test_sub_test_json_to_structured` (line 505~527)
- **문제**: startup migration에서 `fetch_parent_scale_rows_by_test` 결과를 그대로 `seen`에 누적 → PAT-2는 sub_test_json에 **18개** 조건이 저장됨. 반면 신규 생성 검사는 `_build_structured_sub_test_json`의 informant 재병합으로 **6개**. 기존/신규 child_test의 sub_test_json 구조가 다름.
- **영향**: `_derive_required_profile_fields`, `_collect_profile_field_options`는 모든 variant를 union 처리해 기능 동작은 동일. 하지만 외부에서 sub_test_json 개수를 기대하는 코드·문서가 생기면 혼란.
- **권장 수정**: migration 내에서도 `_build_structured_sub_test_json`과 동일한 재병합 로직 적용

---

### TD-005 · 🟠 · `resolved` (2026-05-05)
**채점 시 오늘 날짜 기준으로 variant 재선택**

- **파일**: `app/services/scoring/submissions.py`
- **함수**: `_load_submission_scoring_bundle` (line 259)
- **코드**:
  ```python
  assessment_payload = build_custom_assessment_question_payload(custom_test, profile)
  ```
- **문제**: 채점 시 `profile`의 birth_day로 `_resolve_active_variants`를 **오늘 날짜** 기준으로 재실행. 실시일과 채점일 사이에 생일이 지나 age_range 경계를 넘으면 실시 때와 다른 norm으로 채점됨.
- **재현**: 생일 직전 실시 → 며칠 후 채점
- **권장 수정**: 제출 데이터에 실시 시점의 `resolved_sub_test_json`을 저장하고, 채점 시 이를 우선 사용
- **수정 내용**: 인적사항 UI에 검사 실시일 필드 추가 (기본값: 오늘, 변경 가능). `_profile_matches_sub_test`에서 `date.today()` → `profile.exam_date` 사용 (없으면 fallback). 채점 시 저장된 profile의 exam_date로 자동 반영.

#### TD-005-A · `resolved` (2026-05-06) — 구형 submission 채점 시 fallback 보완
- **문제**: exam_date 추가 이전에 제출된 데이터는 profile에 exam_date가 없음 → 현재 fallback이 `date.today()`(채점 시점) → 여전히 채점 날짜 기준으로 계산
- **해결**: `exam_date → submission.created_at → date.today()` 순서로 fallback
- **구현 위치**: `app/services/scoring/submissions.py` `_load_submission_scoring_bundle`에서 submission.created_at을 꺼내 profile에 주입하거나, `_profile_matches_sub_test`에 as_of 파라미터 추가
- **비용**: 낮음 (한 줄 추가 수준)
- **수정 내용**: profile에 exam_date 없으면 `submission.created_at.date().isoformat()`을 주입. fallback 순서: `exam_date → created_at → date.today()`

#### TD-005-B · `wontfix` — resolved_sub_test_json 스냅샷 저장
- **검토 내용**: 실시 시점에 선택된 variant를 submission에 snapshot으로 저장 → 채점 시 재계산 없이 저장값 사용
- **wontfix 이유**: 원형 검사 norm이 잘못 개발되어 수정이 필요한 경우, 스냅샷으로 고정하면 잘못된 snapshot을 보유한 submission을 모두 찾아 수동 수정해야 함. 현재 구조(채점 시 `_resolve_active_variants` 재실행)는 의도된 설계 — norm 수정 시 재채점만 하면 자동으로 올바른 결과 반영됨.
- **설계 철학**: 채점은 항상 최신 norm 조건 기준으로 재계산. exam_date + birth_day로 나이를 고정하는 것으로 충분.

#### TD-005-C · `wontfix` — exam_date를 profile 밖 submission 별도 컬럼으로 분리
- **검토 내용**: submission 테이블에 exam_date 컬럼 추가, profile에서 분리
- **wontfix 이유**: exam_date는 검사 실시 맥락 정보로, profile과 함께 answers_json에 저장하는 현재 구조로 충분. DB 스키마 변경 비용 대비 실익 없음. TD-005-B도 채택하지 않으므로 분리 필요성 없음.

---

### TD-006 · 🟠 · `open` (보류 — 재검토 시점 명시)
**`fetch_parent_item_bundle` / `fetch_parent_scale_struct` — 매 요청마다 전체 재계산**

- **파일**: `app/repositories/parent_test_repository.py`
- **함수**: `fetch_parent_item_bundle` (line 583), `fetch_parent_scale_struct` (line 560)
- **문제**: 두 함수 모두 `_build_records_for_test`를 호출해 DB에서 item/scale/norm/condition 전체를 재로드하고 교집합 계산 후 선형 검색. 캐싱 없음. 문항 로드·채점 경로 모두 해당.
- **영향**: 현재 데이터 규모에서는 무시 가능. 검사·척도·문항 수 증가 시 응답 지연.
- **권장 수정**: 프로세스 메모리 캐시(`grouped=False`는 무조건, `grouped=True`는 TTL 적용) 또는 장기적으로 DB 사전 저장 방식
- **보류 이유**: 현재 실사용자·검사 수·norm 규모가 작아 성능 문제 없음. 오버엔지니어링 방지.
- **재검토 시점**: 검사 종류 20개 이상 or 단일 검사 norm variant 50개 이상 or 응답 지연 체감 시

---

### TD-007 · 🟠 · `resolved` (2026-05-06)
**exact string match의 취약성 (JSON 직렬화 순서 의존)**

- **파일**: `app/repositories/parent_test_repository.py`
- **함수**: `fetch_parent_item_bundle` (line 587), `fetch_parent_scale_struct` (line 564)
- **코드**:
  ```python
  if str(record.sub_test_json).strip() == target_json:
  ```
- **문제**: 조회 키와 저장 값 모두 `json.dumps(..., ensure_ascii=False)` (sort_keys 없음). `_condition_intersection`의 dict 삽입 순서에 의존. 로직 변경이나 Python dict 순서 보장이 깨지면 miss → 404.
- **권장 수정**: 비교 전 양쪽 모두 `json.loads` → `json.dumps(sort_keys=True)` 정규화
- **수정 내용**: `_normalize_json_for_match` 헬퍼 추가. `fetch_parent_scale_struct`, `fetch_parent_item_bundle` 비교 라인에 적용.

---

### TD-008 · 🟡 · `resolved` (2026-05-06)
**매칭 실패 에러에 원인 검사명 없음**

- **파일**: `app/services/admin/assessment_links.py`
- **함수**: `_select_sub_test_variant_for_profile` (line 260)
- **코드**:
  ```python
  raise HTTPException(status_code=400, detail="입력한 인적정보와 일치하는 검사 구간이 없습니다.")
  ```
- **문제**: 번들 검사(PAT-2 + K-PSI-4-SF + PCT 등)에서 하나가 미매칭 시 어느 검사 때문인지 알 수 없음. `_resolve_active_variants`가 어느 test_id 처리 중 실패했는지 정보 없음.
- **권장 수정**: `detail`에 `test_id` 포함: `"입력한 인적정보와 일치하는 검사 구간이 없습니다. (검사: {test_id})"`
- **수정 내용**: `_select_sub_test_variant_for_profile`에 `test_id: str = ""` 키워드 파라미터 추가. `prefix = f"({test_id}) " if test_id else ""`로 두 HTTPException 모두 prefix 적용. `_resolve_active_variants`에서 호출 시 `test_id=test_id` 전달.

---

### TD-009 · 🟠 · `open`
**어드민 세션 메모리 저장 — 프로세스 재시작/멀티 워커 시 세션 소멸**

- **파일**: `app/services/admin/auth.py:14`
- **코드**: `ADMIN_SESSIONS: dict[str, int] = {}`
- **문제**: 서버 재시작 시 모든 로그인 세션 소멸 → 강제 로그아웃. gunicorn 멀티 워커 또는 다중 서버 환경에서 세션 공유 불가.
- **권장 수정**: Redis 기반 세션 스토어, 또는 DB 테이블(`admin_session`)에 token → admin_id 매핑 저장
- **발견일**: 2026-04-11

---

### TD-010 · 🟠 · `resolved` (2026-05-25)
**SHA256 패스워드 해싱 — Salt 없음**

- **파일**: `app/services/admin/modular_auth.py` (실제 사용처). `app/services/admin/auth.py`에 있던 `make_password_hash`는 dead code였음.
- **이전 코드**: `hashlib.sha256(raw.encode("utf-8")).hexdigest()`
- **문제**: Salt 없는 단순 SHA256 → 레인보우 테이블·사전 공격 취약.
- **수정 내용**:
  - `bcrypt==5.0.0` 도입 (`requirements.txt`)
  - `make_modular_password_hash`를 bcrypt 기반으로 교체
  - `_verify_password` 헬퍼: bcrypt prefix(`$2a$`/`$2b$`/`$2y$`)면 bcrypt, 64자 hex면 레거시 SHA256으로 검증
  - `verify_modular_admin_login`에서 레거시 SHA256으로 인증 성공 시 자동으로 bcrypt 재해싱 후 DB 저장 (무중단 마이그레이션)
  - `update_modular_admin_password_hash` 레포지토리 함수 추가
  - dead `make_password_hash`(auth.py) 제거
  - bcrypt 72바이트 제한 안전 처리 (`_truncate`)
- **발견일**: 2026-04-11
- **해결일**: 2026-05-25

---

## 변경 이력

| 날짜 | 항목 | 내용 |
|------|------|------|
| 2026-05-05 | TD-001~008 | 최초 작성 (PAT-2 + K-PSI-4-SF + PCT 구조 검토 중 발견) |
| 2026-05-05 | TD-001, TD-002 | resolved — `_profile_matches_sub_test` 엄격 모드 적용 (gender/informant/birth_day/school_age 전체) |
| 2026-05-05 | TD-003 | wontfix — DB 설계 책임으로 분류 |
| 2026-05-05 | TD-005 | resolved — 검사 실시일 UI 추가 + exam_date 기준 나이 계산 |
| 2026-05-06 | TD-005-A | resolved — 구형 submission created_at fallback 주입 |
| 2026-05-06 | TD-005-B, TD-005-C | wontfix — 설계 철학에 따라 채택 안 함 |
| 2026-05-06 | TD-007 | resolved — _normalize_json_for_match 헬퍼로 양쪽 정규화 후 비교 |
| 2026-05-06 | TD-008 | resolved — test_id 키워드 파라미터 추가, 에러 메시지에 prefix 포함 |
| 2026-05-21 | TD-009, TD-010 | docs/debug/security-debt.md에서 이관 |
| 2026-05-25 | TD-010 | resolved — bcrypt 적용 + 레거시 SHA256 자동 재해싱 마이그레이션 |
