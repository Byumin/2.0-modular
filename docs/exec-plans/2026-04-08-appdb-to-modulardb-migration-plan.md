# Execution Plan

## Task Title
- `app.db` 기준 소스를 전수 확인하고 `modular.db` 구조/내용 기준으로 수정 및 검토

## Request Summary
- 현재 저장소 안에는 과거 `app.db` 기준으로 작성된 소스, 스크립트, 노트북, 문서가 남아 있다.
- 앞으로 운영 기준 DB는 루트 `modular.db` 하나로 통일해야 한다.
- 따라서 `app.db`를 참조하는 부분을 모두 확인하고, 실제 `modular.db` 구조와 내용을 기준으로 수정하고 검토해야 한다.

## Goal
- `app.db` 기준으로 남아 있는 코드/스크립트/문서를 전수 파악한다.
- 실제 `modular.db` 구조와 현재 코드가 맞는지 확인한다.
- 운영 코드와 인증 흐름을 `modular.db` 기준으로 통일한다.
- 수정 후 검증과 회고까지 남길 수 있도록 작업 흐름을 구조화한다.

## Initial Hypothesis
- 단순 문자열 치환만으로는 끝나지 않는다.
- 런타임 DB, 인증용 직접 SQLite 접근, 보조 스크립트, 노트북, 문서가 서로 다른 DB를 보고 있을 가능성이 높다.
- 가장 먼저 확인해야 할 것은 `modular.db`의 실제 테이블/컬럼/데이터가 현재 코드 가정과 일치하는지 여부다.
- 관리자 인증 흐름은 현재 다른 경로를 보고 있을 수 있으므로 우선 점검 대상이다.

## Initial Plan
1. `app.db` 참조 위치를 코드, 스크립트, 노트북, 문서에서 전수 조사한다.
2. `modular.db`의 실제 구조와 주요 데이터를 확인한다.
3. `app/db/models.py`, `app/db/schema_migrations.py`, 서비스/리포지토리 코드와 `modular.db`를 비교한다.
4. 관리자 로그인 검증, 현재 관리자 조회, 기본 관리자 시드가 동일한 `modular.db`를 보도록 맞춘다.
5. 커스텀 검사, 내담자, 접근 링크, 제출, 채점 흐름이 `modular.db` 기준으로 정상 동작하는지 순차 검증한다.
6. 운영 필수 스크립트와 문서를 `modular.db` 기준으로 정리한다.
7. 남는 예외 자산(`docs/*.db`, 과거 노트북, 백업 파일)은 참고/백업으로 분리 표기한다.

## Progress Updates
### Update 1
- Time: 2026-04-08
- Change: 1단계 영향 범위 조사를 수행해 `app.db`, `docs/modular.db`, `modular.db` 참조 위치를 분류함
- Reason: 실제 수정 전에 운영 코드와 보조 자산의 경계를 먼저 확정해야 했음

### Update 2
- Time: 2026-04-08
- Change: `modular.db`와 `docs/modular.db`의 실제 테이블 구조와 데이터 존재 여부를 비교 확인함
- Reason: 어떤 DB를 운영 기준으로 삼을지뿐 아니라, 현재 데이터 상태와 구조 차이를 먼저 알아야 다음 수정 순서를 결정할 수 있었음

### Update 3
- Time: 2026-04-08
- Change: 인증 계층이 `docs/modular.db`가 아니라 루트 `modular.db`를 보도록 수정하고, `admin_user.id` INTEGER 구조에 맞게 기본 관리자 시드 로직을 보정함
- Reason: 런타임 DB와 인증 DB가 분리되어 있던 핵심 불일치를 먼저 해소해야 이후 관리자 기반 기능 검증이 가능했음

### Update 4
- Time: 2026-04-08
- Change: 일반 서비스 최소 검증을 수행해, 어떤 기능은 `modular.db`에서 정상 응답하고 어떤 기능은 parent 원본 테이블명 불일치로 실패하는지 확인함
- Reason: 다음 단계에서 무엇을 고쳐야 하는지 명확히 하려면 서비스별 성공/실패 지점을 먼저 구분해야 했음

### Update 5
- Time: 2026-04-08
- Change: `parent_test_repository.py`를 `parent_*` 구 테이블 가정에서 `TEST/SCALE/SCALECONDITION/ITEM/ITEMCONDITION/CHOICE/TEMPLATE` 기반 조립 방식으로 교체하고, 카탈로그/질문 번들/커스텀 검사 생성까지 재검증함
- Reason: `modular.db`의 실제 원본 검사 구조를 기존 서비스 인터페이스로 매핑하지 못하면 4단계 이후 기능 검증이 계속 막히기 때문임

### Update 6
- Time: 2026-04-08
- Change: `scripts/`와 노트북에 남아 있던 `app.db` / `docs/modular.db` 참조를 정리하고, 운영용 `mig` 노트북은 루트 `modular.db`, 구 parent 실험 노트북은 `legacy_parent.db`로 분리 표기함
- Reason: 운영용 자산과 레거시 참고 자산이 같은 경로를 섞어 보지 않게 해야 이후 작업 실수를 줄일 수 있음

### Update 7
- Time: 2026-04-08
- Change: `create_modular_db.py` 검증 실행 중 루트 `modular.db`를 재생성하는 판단 실수가 있었고, 이후 git 기준 파일로 즉시 복구함
- Reason: 계획 자체보다 검증 중간 판단이 잘못되어 운영 DB 파일을 덮어썼고, 동일 유형 실수를 막기 위해 회고 대상으로 남겨야 함

### Update 8
- Time: 2026-04-08
- Change: 7단계 검증 중 제출/채점은 성공하지만 대시보드 통계가 증가하지 않는 문제를 확인했고, 제출 성공 시 `admin_assessment_log`를 남기도록 보정한 뒤 전체 흐름을 재검증함
- Reason: 기능이 개별적으로는 동작해도 대시보드 지표까지 연결되지 않으면 실제 운영 흐름 검증이 끝난 것이 아니기 때문임

## Phase 1 Findings
아래 내용은 1단계 조사 시점의 기록이다. 현재 상태는 이후 Update 6, Update 7과 `Current Assessment`를 기준으로 해석해야 한다.

### A. 현재 운영 코드 기준 `modular.db`
- `app/db/session.py`
  - `DATABASE_URL = "sqlite:///./modular.db"`
- SQLAlchemy 세션을 타는 일반 라우터/서비스/리포지토리 흐름은 이 기준을 따름

### B. 인증 우회 경로가 아직 `docs/modular.db`
- `app/modular_auth_repository.py`
  - `MODULAR_DB_PATH = ROOT / "docs" / "modular.db"`
- 영향:
  - 관리자 로그인 검증
  - 현재 로그인 관리자 조회
  - 기본 관리자 시드
- 우선 수정 대상

### C. 보조 스크립트가 아직 `app.db`
- `scripts/generate_golden_shared_item_audit.py`
- `scripts/apply_golden_shared_item_reverse.py`
- 운영 필수 스크립트인지 여부를 확인한 뒤 정리 필요

### D. 보조 스크립트가 `docs/modular.db`
- `scripts/create_modular_db.py`
- 이름상 문서용/생성용 스크립트일 가능성이 높아 용도 확인 후 유지 여부 판단 필요

### E. 노트북이 아직 `app.db`
- `app/db/item_db_setup.ipynb`
- `app/db/item_choice_db_setup.ipynb`
- `app/db/scale_db_setup.ipynb`

### F. 노트북이 `docs/modular.db`
- `app/db/mig/template_setup.ipynb`
- `app/db/mig/scale_setup.ipynb`
- `app/db/mig/choice_setup.ipynb`
- `app/db/mig/item_setup.ipynb`

### G. 문서
- DB 운영 기준 문서는 현재 `modular.db` 기준으로 반영됨
- 실행 계획 문서는 과거 `app.db` 기준에서 전환된 이력이 남아 있음
- 문서 참조는 정상이며 문제는 주로 코드/스크립트/노트북에 집중됨

## Phase 2 Findings
### A. `modular.db` 구조
- 아래 운영 테이블이 모두 존재함
  - `admin_user`
  - `child_test`
  - `admin_client`
  - `admin_assessment_log`
  - `admin_client_assignment`
  - `admin_custom_test_access_link`
  - `admin_custom_test_submission`
  - `submission_scoring_result`
- 현재 확인 범위에서는 `app/db/models.py` 가정과 컬럼 구조가 일치함

### B. `modular.db` 데이터 상태
- 운영 테이블 카운트가 모두 `0`임
  - `admin_user = 0`
  - `child_test = 0`
  - `admin_client = 0`
  - `admin_custom_test_submission = 0`
  - `submission_scoring_result = 0`
- 즉 구조는 준비되어 있지만 운영 데이터는 아직 비어 있음

### C. `docs/modular.db` 상태
- `admin_user`만 존재하고 1건 데이터가 있음
- 확인된 샘플:
  - `admin|admin|2026-04-08 13:59:53`
- 반면 `child_test`, `admin_client`, `admin_custom_test_submission`, `submission_scoring_result` 같은 앱 운영 테이블은 없음

### D. 해석
- 현재 인증 우회 경로는 앱 운영 DB가 아니라 `admin_user`만 들어 있는 별도 스냅샷/보조 DB를 보고 있는 상태임
- `modular.db`를 운영 기준 DB로 통일하려면, 인증 경로도 같은 DB를 보게 해야 함
- 동시에 `modular.db`에는 관리자 계정이 비어 있으므로, `seed_default_admin()` 또는 데이터 마이그레이션 방식이 함께 정리되어야 함

## Phase 3 Findings
### A. 수정 내용
- `app/modular_auth_repository.py`
  - `MODULAR_DB_PATH`를 루트 `modular.db`로 변경
  - `ModularAdminUser.id`를 INTEGER 구조에 맞게 `int`로 정리
  - 기본 관리자 생성 시 `id`를 직접 문자열로 넣지 않고 자동 증가 PK를 사용하도록 수정
- `app/services/admin/modular_auth.py`
  - 관리자 생성/조회 시 타입과 생성 로직을 정리
- `app/services/admin/auth.py`
  - `ADMIN_SESSIONS` 값을 `int` 기준으로 정리

### B. 검증 결과
- `seed_default_admin()` 호출 후 `modular.db` 기준 기본 관리자 계정 생성 성공
- `verify_modular_admin_login('admin', 'admin1234')` 성공
- `admin_login(None, 'admin', 'admin1234')` 성공
- `get_current_admin(None, token)` 성공
- 세션 맵에 `token -> 1` 형태로 저장되는 것 확인

### C. 현재 상태
- 인증 계층은 이제 루트 `modular.db`를 기준으로 동작함
- `modular.db`에는 최소 기본 관리자 1건이 시드된 상태가 됨
- `docs/modular.db`는 더 이상 운영 인증 기준으로 사용하면 안 됨

## Phase 4 Findings
### A. 정상 동작 확인
- `list_admin_clients(db, token)`
  - 빈 목록 `{items: []}` 정상 반환
- `admin_assessment_stats(db, token, 14)`
  - 14일 0건 통계 정상 반환
- `trigger_submission_scoring(db, token, 1)`
  - 제출 데이터가 없어서 `404 제출 데이터를 찾을 수 없습니다.` 반환
  - 즉 인증과 기본 조회/에러 응답 경로는 동작함

### B. 즉시 실패한 기능
- `get_admin_test_catalog(db, token)`
  - `sqlite3.OperationalError: no such table: parent_item`
- 원인:
  - `app/repositories/parent_test_repository.py`는 아래 테이블을 가정함
    - `parent_item`
    - `parent_scale`
    - `parent_item_choice`
  - 하지만 실제 `modular.db`에는 아래 테이블만 존재함
    - `ITEM`
    - `SCALE`
    - `CHOICE`
    - `TEMPLATE`
    - `TEST`

### C. 해석
- 현재 `modular.db`는 인증/운영 테이블 구조는 맞지만, parent 원본 검사 데이터 접근 계층은 현재 repository 쿼리와 스키마가 맞지 않음
- 즉 일반 서비스 검증에서 가장 큰 막힘은 `modular.db` 데이터 부족보다도 `parent_*` 테이블 가정 자체가 실제 스키마와 다르다는 점임
- 따라서 다음 단계는 `parent_test_repository.py`를 실제 `modular.db` 스키마(`TEST`, `SCALE`, `ITEM`, `CHOICE`, `TEMPLATE`)에 맞게 재설계하는 것임

### D. 후속 수정 및 재검증
- `app/repositories/parent_test_repository.py`
  - `parent_item / parent_scale / parent_item_choice` 직접 조회를 제거함
  - 실제 `modular.db`의 `SCALE + SCALECONDITION`으로 `sub_test_json`, `scale_struct`를 구성함
  - `ITEM + ITEMCONDITION + CHOICE + TEMPLATE`로 `item_json`, `item_template`, `render_rules_json`을 조립함
  - 카탈로그용 `item_json`은 평면 구조로, 실제 검사 화면용 `item_json`은 `likert_matrix` 그룹을 살리는 구조로 분리함
- 검증 결과
  - `get_admin_test_catalog(db, token)` 성공
  - `fetch_parent_item_bundle()` 기준 `GOLDEN`, `STS` 질문 번들 로딩 성공
  - `GOLDEN` 성인형 번들에서 `bipolar_with_prompt -> likert_matrix -> bipolar_labels_only` 렌더 구간이 유지되는 것 확인
  - `create_admin_custom_test_batch()`로 임시 커스텀 검사 생성 후 `build_custom_assessment_question_payload()` 성공
  - 검증용 임시 `AdminCustomTest` row는 테스트 직후 삭제함

## Work Breakdown
### Phase 1. 영향 범위 조사
- `app.db` 문자열 참조 전수 검색
- `docs/modular.db` 직접 참조 여부 확인
- 운영 코드 / 보조 스크립트 / 실험 노트북 / 문서로 분류

### Phase 2. `modular.db` 실사
- 테이블 목록 확인
- 핵심 테이블 컬럼 확인
- 관리자 계정, 커스텀 검사, 내담자, 제출, 채점 결과 관련 데이터 존재 여부 확인
- 모델 정의와 다른 점 기록

### Phase 3. 인증 계층 우선 정리
- 관리자 로그인 검증 경로 확인
- 현재 관리자 조회 경로 확인
- startup 시 기본 관리자 시드 경로 확인
- 모두 동일하게 루트 `modular.db` 기준으로 맞춤

### Phase 4. 주요 기능 정합성 확인
- 커스텀 검사 목록/상세
- 내담자 목록/상세
- 접근 링크
- 제출 저장
- 채점 결과 저장/조회

### Phase 5. 스크립트/노트북 정리
- 운영에 필요한 스크립트 우선 수정
- 과거 실험/마이그레이션 노트북은 별도 분류
- 무조건 일괄 치환하지 말고 용도 확인 후 반영

### Phase 6. 문서 동기화
- DB 문서
- 아키텍처 문서
- 작업 규칙 문서
- 실행 계획/회고 문서

### Phase 7. 검증
- 앱 startup 성공
- 관리자 로그인 성공
- 관리자 세션 유지 확인
- 주요 관리자 API 조회 성공
- 필요 시 UI 스크린샷 기반 점검

## Phase 7 Findings
### A. 확인된 문제
- `submit_custom_test_by_access_link()`로 제출과 채점은 성공했지만 `admin_assessment_stats()`는 같은 날 통계를 `0`으로 유지했음
- 원인:
  - 대시보드 통계는 `admin_assessment_log`만 집계함
  - 제출 흐름에서는 `admin_assessment_log`를 생성하지 않았음

### B. 수정 내용
- `app/services/admin/assessment_links.py`
  - 제출 후 `score_submission_by_id()`가 끝나면 `create_assessment_log()`를 호출하도록 보정함
  - 결과적으로 제출/채점/대시보드 통계가 같은 운영 흐름으로 연결되도록 정리함

### C. 재검증 결과
- `seed_default_admin()` 성공
- `admin_login(None, 'admin', 'admin1234')` 성공
- `get_admin_test_catalog(db, token)` 성공
- `GOLDEN` 4~14세 구간 기준 임시 커스텀 검사 생성 성공
- 임시 내담자 생성 및 검사 배정 성공
- 접근 링크 생성 성공
- 프로필 검증 후 문항 payload 로드 성공
- 응답 제출 성공
- `trigger_submission_scoring()` 성공
- `build_scoring_context_from_submission()` 성공
- `admin_assessment_stats()`에서 같은 날 카운트가 `0 -> 1`로 증가하는 것 확인
- 검증용 `child_test`, `admin_client`, `assignment`, `access_link`, `submission`, `scoring_result`, `assessment_log`는 실행 직후 정리함

### D. 검증 범위 메모
- 이번 7단계는 서비스 계층 기준 검증임
- 실제 브라우저 UI 스크린샷 검증은 아직 수행하지 않았음

## Verification Plan
- `DATABASE_URL`과 직접 SQLite 접근 경로가 모두 `modular.db`를 보는지 확인
- 로그인 후 `/api/admin/me` 확인
- 관리자 주요 조회 API 확인
- 실패 시 원인을 `계획 문제`와 `실행 판단 문제`로 분리 기록

## Risks
- `modular.db` 실제 구조가 현재 ORM/서비스 가정과 다를 수 있음
- 인증 계층만 다른 DB를 보고 있으면 로그인은 되더라도 다른 기능과 불일치가 발생할 수 있음
- 스크립트/노트북을 무분별하게 치환하면 과거 백업/실험 자산의 의미가 훼손될 수 있음

## Success Criteria
- 운영 코드 기준 DB 연결이 모두 루트 `modular.db`로 통일됨
- 인증과 일반 서비스가 동일한 DB 기준으로 동작함
- `app.db` 참조는 운영 코드에서 제거되거나 명확히 비운영 자산으로 분류됨
- 문서가 실제 코드/DB 기준과 일치함

## Current Assessment
- 1단계 영향 범위 조사는 완료됨
- 2단계 `modular.db` 실제 구조 확인도 완료됨
- 3단계 인증 계층 정리도 완료됨
- 4단계 일반 서비스 검증과 parent 원본 데이터 접근 로직 수정까지 완료됨
- 5단계 스크립트/노트북 경로 정리도 완료됨
- 6단계 문서 동기화도 완료됨
- 7단계 핵심 서비스 흐름 검증도 완료됨
- 현재 상태 기준:
  - 운영용 `app/db/mig/*.ipynb`는 루트 `modular.db`를 기준으로 함
  - 구 `parent_*` 실험 노트북은 `legacy_parent.db` 기준으로 분리 표기함
  - `scripts/generate_golden_shared_item_audit.py`와 `scripts/apply_golden_shared_item_reverse.py`는 더 이상 `app.db`를 보지 않음
  - `scripts/create_modular_db.py`는 기본 실행만으로 기존 `modular.db`를 덮어쓰지 않도록 보정함
  - 제출/채점 후 대시보드 통계가 증가하도록 `admin_assessment_log` 연결도 반영됨
- 현재 남은 우선순위는 브라우저 UI 기준 최종 확인과 필요 시 스크린샷 검증임

## Retrospective Note
- 이번 작업에서 가장 큰 문제는 실행 계획이 틀렸던 것이 아니라, 검증 단계에서 `create_modular_db.py`를 그대로 실행해도 안전하다고 판단한 점이었음
- 실제로는 이 스크립트가 루트 `modular.db`를 삭제 후 재생성하는 동작을 하므로, 운영 데이터가 있는 상태에서 직접 실행하면 안 됨
- 다행히 `modular.db`가 git 추적 대상이어서 저장소 버전으로 복구할 수 있었음
- 이후 같은 유형의 검증은 반드시 읽기 전용 확인 또는 별도 대상 파일로만 수행해야 함

## Related Documents
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [docs/database/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/README.md)
- [docs/database/runtime-db.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/runtime-db.md)
- [docs/database/schema-overview.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/schema-overview.md)
- [docs/database/assets-inventory.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/assets-inventory.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
