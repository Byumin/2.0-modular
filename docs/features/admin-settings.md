# Admin Settings

## Purpose
관리자 단위로 유지되는 전역 설정을 저장/조회하는 기능을 다룬다. 현재는 개인정보 수집·이용 동의서 본문을 저장하는 용도로 사용된다.

## Main Endpoints
- `GET /api/admin/settings/consent`: 현재 관리자 기준 동의서 본문 조회
- `PUT /api/admin/settings/consent`: 동의서 본문 저장(최초면 insert, 기존이면 update)

## Main Files
- `app/router/settings_router.py`
- `app/schemas/settings.py`: `ConsentTextIn`, `ConsentTextOut`
- `app/services/admin/settings.py`
- `app/db/models.py`: `AdminSettings`
- `frontend/src/pages/Settings.tsx`
- React 라우트: `/admin/settings`

## Behavior Summary
- `AdminSettings`는 관리자 1명당 최대 1행(`admin_user_id` unique)이 존재하는 단일 설정 레코드다.
- 동의서 본문은 검사별 "개인정보 동의 사용 여부" 토글과 조합되어 수검자 동의 단계에서 실제 노출될 텍스트의 source가 된다.
- 최초 조회 시 레코드가 없으면 빈 문자열을 반환한다. 저장 시에는 upsert로 동작하며 `updated_at`이 갱신된다.

## Core Flow
1. 관리자가 `/admin/settings`를 열면 `GET /api/admin/settings/consent`가 호출되어 현재 저장된 동의서 본문을 로드한다.
2. 관리자가 textarea에서 본문을 수정하고 저장하면 `PUT /api/admin/settings/consent`로 전송된다.
3. 서비스 레이어가 `AdminSettings` 행 존재 여부를 확인해 insert 또는 update를 수행한다.
4. 이후 검사 실시 링크의 동의 단계에서는 이 본문을 기준으로 동의서 화면이 구성된다(자세한 흐름은 `privacy-consent-spec.md` 참고).

## Data Model
`AdminSettings` 주요 필드:
- `admin_user_id`: FK, unique. 관리자 1:1 매핑
- `consent_text`: 동의서 본문 전체 텍스트
- `updated_at`: 수정 시각, 저장할 때마다 갱신

## Notes
- 현재 설정 항목은 동의서 본문 1개뿐이다. 새 전역 설정이 필요하면 `AdminSettings`에 컬럼을 추가하고 `settings_router.py`에 엔드포인트를 확장한다.
- 검사별 동의 사용 여부 토글 자체는 `child_test` 테이블에 보관되며 본 문서 범위가 아니다(개인정보 동의 기능 문서 참고).

## Related Documents
- [docs/features/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/README.md)
- [docs/features/privacy-consent-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/privacy-consent-spec.md)
- [docs/database/runtime-db.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/runtime-db.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
