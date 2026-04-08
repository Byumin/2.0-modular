# Dashboard

## Purpose
관리자 작업 현황을 요약해서 보여주는 대시보드와 최근 평가 통계 기능을 다룬다.

## Main Endpoints
- `GET /api/admin/dashboard`
- `GET /api/admin/assessment-stats`

## Main Files
- `app/router/dashboard_router.py`
- `app/services/admin/dashboard.py`
- `app/repositories/assessment_repository.py`
- `app/services/admin/clients.py`
- `app/services/admin/custom_tests.py`

## Behavior Summary
- 현재 운영 중인 검사 수
- 전체 내담자 수
- 미실시 내담자 수
- 오늘 평가 수
- 최근 내담자 목록
- 최근 N일 통계

위 데이터를 조합해 관리자 첫 화면에 필요한 요약 정보를 제공한다.

## Calculation Rule
- 통계 기간은 기본 14일이다.
- `days` 파라미터는 최소 7일, 최대 60일로 보정한다.
- 대시보드 summary는 검사 목록, 클라이언트 목록, 일별 통계를 다시 조합해서 계산한다.

## Flow Summary
1. 관리자가 대시보드 화면에 진입한다.
2. 서버가 관리자 인증을 확인한다.
3. 커스텀 검사 목록, 내담자 목록, 평가 통계를 각각 조회한다.
4. 서비스가 summary와 최근 클라이언트 목록을 재계산한다.
5. 프론트엔드가 카드, 차트, 리스트 형태로 렌더링한다.

## Notes
- 이 기능은 독립 도메인이라기보다 여러 기능의 운영 현황을 묶어서 보여주는 집계 레이어에 가깝다.
- summary 값은 단일 테이블에서 바로 오지 않고 여러 서비스 결과를 조합해서 계산된다.

## Related Documents
- [docs/features/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/README.md)
- [docs/features/custom-test-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/custom-test-management.md)
- [docs/features/client-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-management.md)
- [docs/database/schema-overview.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/schema-overview.md)
- [docs/design/design-system.md](/mnt/c/Users/user/workspace/2.0-modular/docs/design/design-system.md)
