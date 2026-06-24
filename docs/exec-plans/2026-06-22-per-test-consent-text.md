# Execution Plan

## Task Title
- 검사별 개인정보 수집·이용 동의서 문구 지원

## Request Summary
- 관리자 설정의 전역 개인정보 동의서 문구만 쓰는 구조를 확장해, 검사 생성 1단계 기본 정보에서 개인정보동의 사용 여부와 동의서 문구를 함께 입력하도록 한다.
- 검사별로 다른 개인정보 수집·이용 동의서 문구를 수검자 동의 화면에 표시한다.

## Goal
- `child_test`에 검사별 동의서 문구를 저장한다.
- 생성/수정 API와 UI에서 `requires_consent`, `consent_text`를 함께 관리한다.
- 수검자 동의 API는 검사별 문구를 우선 사용하고, 비어 있으면 기존 관리자 설정 문구로 fallback한다.
- 기존 전역 설정 기반 검사는 깨지지 않게 유지한다.

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
- 현재 전역 문구는 `admin_settings.consent_text`, 검사별 사용 여부는 `child_test.requires_consent`에 분리되어 있다.
- 검사별 문구는 `child_test.consent_text` 컬럼을 추가하는 것이 가장 단순하고 기존 구조와 맞다.

## Initial Plan
1. DB 모델과 startup schema migration에 `child_test.consent_text` 보정을 추가한다.
2. 생성/수정 schema와 서비스에 `consent_text`를 추가한다.
3. 수검자 동의 API가 검사별 문구 우선, 전역 설정 fallback으로 반환하도록 한다.
4. 검사 생성/상세 수정 UI에서 동의 토글 아래에 문구 입력 textarea를 추가한다.
5. 빌드와 가능한 API/DB 검증을 수행한다.

## Progress Updates
### Update 1
- Time: 2026-06-22
- Change: 계획 수립.
- Reason: DB/API/UI를 함께 바꾸는 작업이라 영향 범위를 고정하기 위해서다.

### Update 2
- Time: 2026-06-22
- Change: `child_test.consent_text` 모델/스키마 보정, 생성/수정 API, 수검자 동의 조회 fallback 로직을 추가.
- Reason: 검사별 문구를 우선 사용하되 기존 관리자 설정 문구와 기존 검사 흐름을 유지하기 위해서다.

### Update 3
- Time: 2026-06-22
- Change: 검사 생성 1단계와 검사 상세 설정 카드에 개인정보동의 문구 textarea를 추가.
- Reason: 생성 시점과 운영 중 수정 시점 모두에서 검사별 동의 문구를 관리할 수 있어야 한다.

### Update 4
- Time: 2026-06-22
- Change: 개인정보동의 기능 스펙과 스키마 개요 문서에 검사별 동의 문구 우선순위를 반영.
- Reason: 관리자 설정 문구가 전역 기본값으로 바뀐 운영 의미를 문서화하기 위해서다.

## Result
- 완료.
- `child_test.consent_text` 컬럼을 모델과 startup schema migration에 추가했다.
- 검사 생성/수정 API는 `requires_consent`와 `consent_text`를 함께 받는다.
- 수검자 동의 조회 API는 검사별 `child_test.consent_text`가 있으면 우선 반환하고, 비어 있으면 기존 `admin_settings.consent_text`를 fallback으로 반환한다.
- 검사 생성 1단계 기본 정보와 검사 상세 설정 카드에 검사별 동의서 문구 입력란을 추가했다.
- 개인정보동의 기능 스펙과 스키마 개요 문서를 갱신했다.

## Verification
- Checked:
  - `npm run build:frontend` 통과.
  - `python3 -m compileall app` 통과.
  - `npm run dev`는 sandbox socket 제한으로 1차 실패 후 권한 밖에서 재시도했다.
  - 권한 밖 `npm run dev` 재시도에서 Vite는 `http://localhost:5120/`로 기동했다.
  - FastAPI `8120`은 이미 실행 중인 RDS 연결 백엔드가 점유하고 있었고, `/health` 응답은 `{"db":"postgresql"}`였다.
  - 현재 `8120` OpenAPI의 `CreateCustomTestBatchIn`, `UpdateCustomTestSettingsIn` 스키마에 `consent_text`가 반영된 것을 확인했다.
  - 운영 RDS 기준 `child_test`에 `consent_text` 컬럼이 존재하는 것을 읽기 전용으로 확인했다.
  - `http://127.0.0.1:8120/admin`이 최신 `frontend/dist` JS를 서빙하고, 빌드 산출물에 새 검사별 동의서 문구 UI 문자열이 포함된 것을 확인했다.
- Not checked:
  - Playwright/브라우저 스크린샷 검증은 이 환경의 Chromium 지원 문제로 수행하지 못했다.
  - 로그인 세션이 필요한 실제 검사 생성 E2E 클릭 검증은 수행하지 않았다.

## Retrospective
### Classification
- 기능 확장

### What Was Wrong
- 기존 구조는 동의 필요 여부만 검사별이고, 동의서 본문은 관리자 설정 전역 문구 하나만 사용할 수 있었다.

### Why
- 검사 성격이나 필드테스트 조건에 따라 개인정보 수집·이용 문구가 달라질 수 있는데 저장 위치가 전역 설정뿐이었다.

### Next Time
- 전역 설정 문구는 기본 템플릿으로, 검사별 운영 문구는 `child_test`에 두는 정책을 유지한다.

## Related Documents
- [AGENTS.md](../../AGENTS.md)
- [DESIGN.md](../../DESIGN.md)
- [QUALIT_SCORE.md](../../QUALIT_SCORE.md)
- [docs/database/runtime-db.md](../database/runtime-db.md)
- [docs/features/privacy-consent-spec.md](../features/privacy-consent-spec.md)
