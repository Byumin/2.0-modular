# Execution Plan

## Task Title
- PSES optional profile config 지역 옵션 점검 및 보정

## Request Summary
- `test_profile_config` 테이블에서 `PSES` test_id의 `optional_profile_json`을 확인한다.
- 지역 정보 옵션이 덜 입력된 부분을 채운다.
- 일부 선택 필드가 버튼식이고 일부가 드롭다운식으로 보이는 원인을 확인한다.

## Goal
- 운영 기준 DB의 `PSES` optional profile 설정 누락을 확인하고 필요한 경우 보정한다.
- 프로필 입력 UI의 선택 방식이 데이터 설정 문제인지 프론트 렌더링 규칙 문제인지 구분한다.
- 변경 및 검증 결과를 기록한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: `ARCHITECTURE.md`
  - DB: `docs/database/runtime-db.md`, `docs/database/schema-overview.md`
  - UI/디자인: `DESIGN.md`, `QUALIT_SCORE.md`
  - 문서 체계: 해당 없음
  - 설명/디버깅: 해당 없음
  - 코드 정리 산출물: 해당 없음
- [x] 운영 DB가 필요한 작업이면 RDS PostgreSQL 기준 확인
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- `optional_profile_json.fields` 안의 지역 관련 필드 옵션이 일부만 들어가 있거나 비어 있을 수 있다.
- 프론트 `ProfileStep`은 `type: "select"`를 드롭다운으로, `radio`/기본 enum 성격 필드를 버튼식으로 렌더링할 가능성이 있다.

## Initial Plan
1. `test_profile_config` 스키마와 `PSES` row의 `optional_profile_json` 현재 상태를 조회한다.
2. 프론트 `ProfileStep`에서 profile config 필드 타입과 옵션을 어떻게 렌더링하는지 확인한다.
3. 지역 옵션 누락이 확인되면 기존 데이터 구조를 유지하면서 `PSES` optional config만 보정한다.
4. API payload 또는 UI 렌더링 결과로 보정 반영 여부를 검증한다.

## Progress Updates
### Update 1
- Time: 2026-06-02
- Change: 작업 전 지침, DB 문서, UI 문서를 확인하고 `optional_profile_json` 사용처를 조사하기 시작했다.
- Reason: DB 설정과 수검자 UI 렌더링이 함께 영향을 받는 작업이다.

### Update 2
- Time: 2026-06-02
- Change: 로컬 SQLite를 먼저 조회/보정하는 방향으로 잘못 진행했다.
- Reason: 사용자의 대상은 RDS `test_profile_config`였고, 로컬 `modular.db`는 운영 기준이 아니다.

### Update 3
- Time: 2026-06-02
- Change: `APP_ENV=local.prod` 같은 env-prefix 명령이 샌드박스에서 SSH 터널 소켓 접근을 깨뜨리는 현상을 확인했다. 파이썬 내부에서 `os.environ["APP_ENV"] = "local.prod"`를 설정하는 방식으로 RDS에 접속했다.
- Reason: 터널 자체는 PostgreSQL `SSLRequest`에 `b"S"`를 반환해 정상으로 확인됐고, env-prefix 방식에서만 `PermissionError`/`connection is bad`가 재현됐다.

### Update 4
- Time: 2026-06-02
- Change: RDS `test_profile_config`의 `PSES.optional_profile_json.fields.region.options`를 2개에서 17개 광역자치단체 전체 목록으로 업데이트했다.
- Reason: 현재 RDS 값은 `["서울특별시", "대전광역시"]`만 들어 있어 지역 정보가 불완전했다.

### Update 5
- Time: 2026-06-02 13:18 KST
- Change: RDS `PSES.optional_profile_json.fields.caregiver_type`을 삭제했다.
- Reason: `추가 인적사항 (선택)` 영역에 `주 양육자 Y/N`이 계속 보였고, 실제 RDS row에 해당 필드가 남아 있었다.

### Update 6
- Time: 2026-06-02 13:19 KST
- Change: RDS `PSES.optional_profile_json.fields.caregiver_type`을 다시 추가하고 label을 `주 양육자`로 설정했다. options는 `["Y", "N"]`로 유지했다.
- Reason: 사용자의 의도는 필드 삭제가 아니라 label의 `Y/N` 문구 제거였고, 선택 버튼은 유지되어야 했다.

## Result
- RDS `PSES.optional_profile_json.fields.region.options` 보정 완료.
- 보정 후 `region_option_count = 17` 확인.
- RDS `PSES.optional_profile_json.fields.caregiver_type`은 `label: "주 양육자"`, `options: ["Y", "N"]`로 설정 완료.
- 선택 UI 차이 원인 확인: `frontend/src/pages/assessment/steps/ProfileStep.tsx`의 optional field 렌더링은 옵션이 1~4개면 버튼형 radio, 5개 이상이면 dropdown으로 렌더링한다. 따라서 `caregiver_type`은 `type: "select"`라도 옵션 2개라 버튼형으로 보일 수 있고, `region`/`marriage`는 옵션이 많아 dropdown으로 보인다.

## Verification
- Checked:
  - SSH 터널 PostgreSQL `SSLRequest` 응답 `b"S"` 확인
  - RDS `PSES.optional_profile_json` 업데이트 전/후 조회
  - 업데이트 후 `region` 옵션 17개 확인
  - 업데이트 후 `caregiver_type.label = "주 양육자"`, `caregiver_type.options = ["Y", "N"]` 확인
  - optional field 렌더링 분기 코드 확인
- Not checked:
  - 실제 수검자 화면 스크린샷 확인은 미수행

## Retrospective
### Classification
- `Mixed`

### What Was Wrong
- 초기 작업에서 로컬 SQLite를 먼저 보정했고, 사용자가 요청한 RDS 보정 대상을 놓쳤다.
- `APP_ENV=local.prod` env-prefix 명령으로 RDS 접속을 시도해 샌드박스 네트워크 권한 문제를 DB/터널 문제처럼 오해했다.
- `주 양육자 Y/N` 요청을 label 문구 수정이 아니라 필드 삭제로 잘못 해석했다.

### Why
- `docs/database/runtime-db.md`의 RDS 운영 기준을 확인했지만 실제 실행 명령에서 로컬 기본 환경을 먼저 사용했다.
- 이 실행 환경에서는 명령 앞 env-prefix가 local socket 접근 권한에 영향을 주며, 파이썬 프로세스 내부 env 설정과 다르게 동작한다.

### Next Time
- RDS 작업은 처음부터 `os.environ` 내부 설정 또는 승인된 EC2 직접 실행 방식으로 확인한다.
- local.dev SQLite 조회 결과는 운영 판단 근거로 쓰지 않는다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
