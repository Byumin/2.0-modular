# Execution Plan

## Task Title
- FAT 검사 실시 링크 인적사항 옵션 보완

## Request Summary
- RDS에 생성된 `FAT` 검사의 실시 링크에서 부족한 인적사항 UI 옵션을 보완한다.
- 연구 참여 안내 카드를 검사별로 표시/숨김 가능하게 한다.
- 추가 인적사항 타입이 `phone`인 경우 단일 입력이 아니라 `박스 - 박스 - 박스` 3분할 입력으로 표시한다.

## Goal
- 검사 생성/상세 설정에서 연구 참여 안내 표시 여부를 저장할 수 있다.
- 실시 링크 첫 화면은 저장된 설정에 따라 `ResearchNotice`를 조건부 렌더링한다.
- `phone` 타입 추가 인적사항은 3개 입력칸으로 렌더링하고 profile 값은 기존 호환성을 위해 하이픈으로 합쳐 저장한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] `DESIGN.md` 확인
- [x] `docs/database/runtime-db.md` 확인
- [x] 저장 위치 확정
- [x] 백엔드 schema/service/payload 수정
- [x] 프론트 검사 생성/상세 설정 수정
- [x] 프론트 실시 링크 phone 입력 UI 수정
- [x] 빌드/검증

## Initial Hypothesis
- `child_test`에 `show_research_notice` boolean 컬럼을 추가하는 것이 가장 명확하다.
- 기존 검사에는 기존 동작 보존을 위해 기본값 `true`를 적용한다.
- phone 타입은 값 저장 형식을 `010-1234-5678` 문자열로 유지하면 서버 정규화/저장 흐름 변경을 최소화할 수 있다.

## Initial Plan
1. 현재 `ProfileStep`, `TestManagement`, `TestDetail`, 백엔드 custom test schema/service 구조를 확인한다.
2. `child_test.show_research_notice` 컬럼과 startup 보정 함수를 추가한다.
3. 생성/상세 조회/수정 payload에 `show_research_notice`를 포함한다.
4. 관리자 검사 생성/상세 설정 UI에 토글을 추가한다.
5. 실시 링크 payload에 `show_research_notice`를 내려주고 `ResearchNotice`를 조건부 렌더링한다.
6. `ProfileStep`의 `phone` 타입 입력을 3분할 UI로 바꾼다.
7. 빌드와 가능하면 로컬 화면 캡처로 확인한다.

## Progress Updates
### Update 1
- Time: 2026-06-05
- Change: `child_test.show_research_notice` 컬럼과 startup 보정 함수를 추가했다.
- Reason: 검사별로 연구 참여 안내 카드 표시 여부를 저장하기 위함이다.

### Update 2
- Time: 2026-06-05
- Change: 검사 생성/상세 수정 schema와 service payload에 `show_research_notice`를 연결했다.
- Reason: 관리자 화면에서 설정한 값을 RDS에 저장하고 실시링크 payload로 내려주기 위함이다.

### Update 3
- Time: 2026-06-05
- Change: 관리자 검사 생성 1단계와 검사 상세 설정 카드에 `첫 화면에 연구 참여 안내 카드 표시` 체크박스를 추가했다.
- Reason: FAT 같은 검사별 요구에 따라 연구 안내 카드를 켜고 끌 수 있게 하기 위함이다.

### Update 4
- Time: 2026-06-05
- Change: `ProfileStep`에서 `payload.show_research_notice !== false`일 때만 `ResearchNotice`를 렌더링하도록 변경했다.
- Reason: 기존 검사는 기본 표시를 유지하면서 설정값이 false인 검사만 숨기기 위함이다.

### Update 5
- Time: 2026-06-05
- Change: `phone` 타입 인적사항 입력을 3분할 입력(`010 - 1234 - 5678`)으로 변경했다.
- Reason: 전화번호 입력이 필요한 경우 수검자가 번호 구간을 명확히 입력할 수 있게 하기 위함이다.
- Note: profile 저장값은 기존 호환성을 위해 `010-1234-5678` 문자열로 합쳐 저장한다.

### Update 6
- Time: 2026-06-05
- Change: RDS에 `show_research_notice` 컬럼 보정을 적용하고 FAT row를 확인했다.
- Result:
  - FAT custom test: `child_test.id=31`, `custom_test_name=검사 생성 테스트`, `test_id=["FAT"]`
  - `show_research_notice=true`
  - `additional_profile_fields_json={"schema_version": 2, "fields": []}`

### Update 7
- Time: 2026-06-05
- Change: 사용자가 제공한 FAT 실시링크 `QTTyYNqCms_zYk4yVr4PhQzCf6TwsrLf`의 payload를 확인했다.
- Result:
  - `custom_test_id=32`
  - `show_research_notice=false`
  - `additional_profile_fields=[]`
  - `profile_config.fields.phon_num.type="phon"`
- Finding: 기존 구현은 `type="phone"`만 3분할 전화번호 입력으로 처리했고, RDS payload는 `phon`을 내려줘 일반 text input으로 렌더링됐다.

### Update 8
- Time: 2026-06-05
- Change: 전화번호 입력 타입 alias를 `phone`, `phon`, `phon_num_input` 모두 인식하도록 확장했다.
- Result:
  - 실시링크에서 `phon_num` 필드가 `010 - 1234 - 5678` 형태의 3개 `tel` 입력으로 렌더링된다.

## Result
- 연구 참여 안내 카드는 검사별 옵션이 됐다.
- phone 타입 인적사항은 3분할 입력으로 표시된다.
- 현재 RDS의 FAT 검사에는 추가 인적사항 필드가 비어 있어 phone 입력은 아직 표시되지 않는다. phone 타입 필드를 추가하면 3분할 입력이 적용된다.

## Verification
- Checked: `npm run build:frontend` 통과
- Checked: `.venv/bin/python -m compileall app` 통과
- Checked: `npm run prod:api` 실행 후 `/health`가 `db=postgresql` 반환
- Checked: FAT 실시링크 payload에 `show_research_notice=true` 반환
- Checked: 관리자 상세 화면 캡처 `artifacts/screenshots/2026-06-05-fat-detail-research-toggle.png`
- Checked: FAT 실시링크 화면 캡처 `artifacts/screenshots/2026-06-05-fat-assessment-research-notice.png`
- Checked: `QTTyYNqCms_zYk4yVr4PhQzCf6TwsrLf` 실시링크에서 `profile_config.fields.phon_num.type="phon"` 확인
- Checked: `QTTyYNqCms_zYk4yVr4PhQzCf6TwsrLf` 실시링크에서 전화번호 `tel` input 3개 렌더링 확인
- Checked: 수정 후 캡처 `artifacts/screenshots/2026-06-05-fat-phone-input-fixed.png`

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 연구 참여 안내 카드가 모든 검사 실시 링크에서 항상 표시됐다.
- phone 타입 인적사항이 단일 입력으로 표시되어 전화번호 구간 입력 요구를 만족하지 못했다.

### Why
- `ProfileStep`이 `ResearchNotice`를 설정값 없이 고정 렌더링했다.
- 기존 `phone` 타입은 HTML input type만 `tel`로 바꾸고 UI 구조는 일반 text input과 동일하게 처리했다.

### Next Time
- 기존 검사에 phone 필드를 추가해야 하는 경우 관리자 상세 화면의 추가 인적사항 편집 기능 또는 RDS 설정 변경 절차를 별도로 마련한다.
