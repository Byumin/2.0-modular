# Execution Plan

## Task Title
- 개인정보 보안관리 안내 확인 기능

## Request Summary
- 관리자 설정에 `개인정보 보안관리 안내` 섹션을 추가해 문구를 저장한다.
- 검사 생성 1단계 기본 정보에서 `개인정보 보안관리 안내` 사용 여부를 체크할 수 있게 한다.
- 검사 실시 링크에서 해당 검사가 보안관리 안내를 요구하면 `개인정보 보안관리 확인했습니다` 체크란을 추가한다.
- `내용 보기`로 설정에 저장한 문구를 확인하고 확인 버튼을 눌러야 체크 완료되며, 이 조건까지 만족해야 검사를 실시할 수 있게 한다.

## Goal
- 관리자별 보안관리 안내 문구를 `admin_settings`에 저장한다.
- 검사별 보안관리 안내 요구 여부를 `child_test`에 저장한다.
- 생성/수정 API와 관리자 UI에서 보안관리 안내 사용 여부를 관리한다.
- 수검자용 동의 정보 API가 보안관리 안내 필요 여부와 문구를 함께 반환한다.
- 수검자 프로필 단계에서 동의 체크와 보안관리 확인 체크가 모두 만족되어야 다음 단계로 진행된다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: `ARCHITECTURE.md`
  - DB: `docs/database/runtime-db.md`, `docs/database/schema-overview.md`
  - UI/디자인: `DESIGN.md`, `QUALIT_SCORE.md`
  - 문서 체계: 해당 없음
  - 설명/디버깅: 해당 없음
  - 코드 정리 산출물: 해당 없음
- [x] 운영/실행 서버 DB가 필요한 작업이면 `docs/database/runtime-db.md`의 DB 조회 전 확인 규칙 적용
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- 개인정보 수집·이용 동의와 보안관리 안내는 수검자에게 같은 프로필 단계에서 확인시키는 것이 자연스럽다.
- 보안관리 안내 문구는 검사별 override 요구가 없으므로 `admin_settings.security_notice_text`에 두고, 검사별 사용 여부만 `child_test.requires_security_notice`에 둔다.

## Initial Plan
1. `admin_settings.security_notice_text`, `child_test.requires_security_notice` 모델과 startup 보정을 추가한다.
2. 설정 API/UI에 보안관리 안내 문구 조회/저장을 추가한다.
3. 커스텀 검사 생성/수정 스키마와 서비스에 `requires_security_notice`를 추가한다.
4. 수검자 동의 정보 API에 `requires_security_notice`, `security_notice_text`를 추가한다.
5. 검사 생성/상세 UI와 수검자 프로필 단계 확인 UI를 수정한다.
6. 빌드/컴파일/가능한 런타임 스키마 검증을 수행한다.

## Progress Updates
### Update 1
- Time: 2026-06-22
- Change: 계획 수립.
- Reason: 관리자 설정, 검사 생성, 수검자 gating이 동시에 바뀌므로 변경 범위를 고정하기 위해서다.

### Update 2
- Time: 2026-06-22
- Change: `admin_settings.security_notice_text`, `child_test.requires_security_notice` 모델/스키마 보정과 설정 API를 추가.
- Reason: 보안관리 안내 문구는 관리자 기본 설정으로 관리하고, 검사별 필요 여부만 검사 설정에 저장하기 위해서다.

### Update 3
- Time: 2026-06-22
- Change: 검사 생성/상세 설정 UI와 생성/수정 API payload에 `requires_security_notice`를 연결.
- Reason: 검사별로 보안관리 안내 확인 요구 여부를 운영자가 설정해야 하기 때문이다.

### Update 4
- Time: 2026-06-22
- Change: 수검자 프로필 단계에 `개인정보 보안관리 확인했습니다` 체크란과 내용 보기/확인 모달을 추가.
- Reason: 안내 내용을 확인하고 확인 버튼을 누른 경우에만 검사 시작이 가능해야 하기 때문이다.

### Update 5
- Time: 2026-06-22
- Change: 관련 기능/DB 문서를 갱신.
- Reason: 설정 항목과 검사별 gating 규칙이 동의서 단일 구조에서 확장되었기 때문이다.

## Result
- 완료.
- 관리자 설정에 `개인정보 보안관리 안내` 섹션을 추가했다.
- 설정 API `/api/admin/settings/security-notice` 조회/저장을 추가했다.
- 검사 생성 1단계 기본 정보와 검사 상세 설정에 `개인정보 보안관리 안내` 체크를 추가했다.
- 수검자 동의 정보 API가 `requires_security_notice`, `security_notice_text`를 함께 반환한다.
- 수검자 프로필 단계에서 보안관리 안내가 켜진 검사는 내용 보기 모달의 `확인했습니다` 버튼을 눌러야 체크 완료되고, 체크 전에는 검사 실시가 진행되지 않는다.

## Verification
- Checked:
  - `python3 -m compileall app` 통과.
  - `npm run build:frontend` 통과.
  - `npm run dev` 재시작을 시도했고, 기존 `8120` 프로세스가 교체되며 현재 `/health` 응답은 `postgresql`로 확인.
  - 현재 `8120` OpenAPI에서 `/api/admin/settings/security-notice`, `requires_security_notice`, `security_notice_text` 반영 확인.
  - 운영 RDS 기준 `child_test.requires_security_notice`, `admin_settings.security_notice_text` 컬럼 존재 확인.
  - `http://127.0.0.1:8120/admin`이 최신 빌드 JS `index-BeOlveVe-v2.js`를 서빙하는 것 확인.
  - 빌드 산출물에 `개인정보 보안관리 안내`, `개인정보 보안관리 확인했습니다`, `requires_security_notice`, `security_notice_text` 포함 확인.
- Not checked:
  - Playwright/브라우저 스크린샷 검증은 이 환경의 Chromium 지원 문제로 수행하지 못했다.
  - 로그인 세션이 필요한 실제 설정 저장 및 검사 생성 클릭 E2E는 수행하지 않았다.

## Retrospective
### Classification
- 기능 확장

### What Was Wrong
- 기존 설정/검사 시작 흐름은 개인정보 수집·이용 동의만 다뤘고, 별도 보안관리 안내 확인 절차가 없었다.

### Why
- 운영 검사별로 수검자가 개인정보 보안관리 안내를 확인했음을 명시적으로 gating해야 하는 요구가 추가되었다.

### Next Time
- 확인 기록을 장기 보관해야 하는 요구가 생기면 `client_consent_record`와 별도 보안관리 확인 기록 테이블을 함께 설계한다.

## Related Documents
- [AGENTS.md](../../AGENTS.md)
- [DESIGN.md](../../DESIGN.md)
- [QUALIT_SCORE.md](../../QUALIT_SCORE.md)
- [docs/database/runtime-db.md](../database/runtime-db.md)
- [docs/features/privacy-consent-spec.md](../features/privacy-consent-spec.md)
