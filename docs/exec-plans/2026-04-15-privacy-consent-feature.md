# Execution Plan

## Task Title
- 개인정보동의 기능 추가

## Request Summary
- 검사 관리에서 관리자가 검사별로 개인정보동의 사용 여부를 설정할 수 있어야 함
- 동의서 내용은 관리자가 설정 메뉴에서 직접 입력
- 수검자가 검사 접속 시 동의가 필요한 검사면 동의 화면을 먼저 보여줌
- 동의 기록은 내담자별로 저장

## Goal
1. `설정` 메뉴 신설 — 관리자 계정별 개인정보동의 텍스트 저장/수정
2. `검사 생성/수정` — `requires_consent` 토글 추가
3. `수검자 흐름` — 동의 필요한 검사 접속 시 동의 화면 → 동의 후 검사 진행 / 거부 시 중단
4. `동의 기록` — 내담자 ID, 검사 ID, 동의 여부, 동의 일시 저장
5. `검사 결과 탭 제거` — TestManagement에서 불필요 탭 제거 (내담자 상세에서 추후 확인 예정)

## Initial Hypothesis
- `admin_settings` 테이블을 신설해 관리자별 동의 텍스트를 저장하는 것이 가장 단순한 구조
- `child_test` (`AdminCustomTest`) 에 `requires_consent BOOLEAN` 컬럼 추가
- `client_consent_record` 테이블 신설로 동의 기록 관리
- 수검자 assessment 흐름 (`/assessment/custom/{token}`) 에서 consent 단계 추가
- startup 보정(`schema_migrations.py`)으로 기존 DB에 컬럼/테이블 추가

## Initial Plan
1. **DB 마이그레이션**
   - `admin_settings` 테이블 추가 (id, admin_user_id, consent_text, updated_at)
   - `child_test`에 `requires_consent` 컬럼 추가 (BOOLEAN, DEFAULT FALSE)
   - `client_consent_record` 테이블 추가 (id, admin_user_id, admin_client_id, admin_custom_test_id, consented, consented_at)
   - `app/db/models.py` 모델 추가
   - `app/db/schema_migrations.py` 보정 코드 추가

2. **백엔드 API**
   - `GET /api/admin/settings/consent` — 동의 텍스트 조회
   - `PUT /api/admin/settings/consent` — 동의 텍스트 저장
   - `GET /api/assessment/custom/{token}/consent` — 수검자용 동의 정보 조회 (requires_consent, consent_text)
   - `POST /api/assessment/custom/{token}/consent` — 동의 제출 기록 저장
   - 기존 커스텀 검사 생성/수정 API에 `requires_consent` 필드 추가

3. **관리자 프런트엔드**
   - 설정 메뉴(`/admin/settings`) 신설 — 동의 텍스트 편집기 UI
   - 사이드바에 설정 메뉴 링크 추가
   - 검사 생성/수정 화면에 `requires_consent` 토글 추가
   - TestManagement에서 `검사 결과` 탭 제거

4. **수검자 프런트엔드**
   - 검사 시작 전 consent 단계 추가
   - `requires_consent === true`이면 동의 화면 노출
   - 동의 → 검사 진행, 거부 → 중단 안내

5. **문서**
   - `docs/features/privacy-consent-spec.md` 기능 스펙 작성
   - `docs/database/schema-overview.md` 신규 테이블 추가
   - `ARCHITECTURE.md` 도메인 섹션에 Settings 추가

## Progress Updates
### Update 1
- Time: 2026-04-15
- Change: 초기 계획 수립
- Reason: 기획 확정 후 문서 우선 작성

## Result
- (작업 후 기록)

## Verification
- Checked:
- Not checked:

## Retrospective
### Classification
- (작업 후 기록)

### What Was Wrong
-

### Why
-

### Next Time
-

## Related Documents
- [docs/features/privacy-consent-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/privacy-consent-spec.md)
- [docs/database/schema-overview.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/schema-overview.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
