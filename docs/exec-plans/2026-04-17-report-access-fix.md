# Report Access Fix

## 요청 요약
- 코드 리뷰에서 확인한 공개 리포트 접근 오류와 관리자 리포트 오류 처리 문제를 수정한다.

## 작업 목표
- 공개 리포트가 검사 링크 토큰만으로 임의의 첫 제출을 반환하지 않게 한다.
- 공개 리포트는 제출 ID와 검사 링크 토큰을 함께 검증해 해당 제출만 반환한다.
- 관리자 리포트 API 오류가 프런트 런타임 오류로 이어지지 않게 한다.

## 초기 가설
- 현재 `/report/:token`은 검사 접근 링크 토큰을 리포트 식별자로 재사용한다.
- `admin_custom_test_submission.access_token`은 같은 검사 링크로 여러 제출이 발생하면 중복될 수 있다.
- `ReportPage`는 `response.ok` 확인 없이 JSON을 `ReportData`로 처리한다.

## 실행 계획
1. 제출 완료 응답의 `submission_id`를 프런트 상태에 저장한다.
2. 수검자 결과 보기 URL을 `/report/:submissionId?token=:accessToken` 형태로 변경한다.
3. 공개 리포트 API를 `submission_id + access_token` 검증 방식으로 변경한다.
4. 관리자/공개 리포트 fetch에서 HTTP 오류와 응답 구조를 방어적으로 처리한다.
5. 관련 기능 문서와 이 실행 계획을 갱신한다.
6. 타입 체크 또는 빌드로 프런트 계약을 검증하고, 가능한 범위에서 API 동작을 확인한다.

## 작업 중 변경 사항
- 공개 리포트 API를 `/api/report/by-submission/{submission_id}?token=...` 형태로 변경했다.
- 제출 완료 화면은 제출 응답의 `submission_id`를 저장하고 `/report/{submission_id}?token=...`로 이동하도록 변경했다.
- 리포트 프런트는 HTTP 상태와 응답 구조를 검증한 뒤 렌더링하도록 변경했다.

## 결과
- 공개 리포트는 더 이상 검사 링크 토큰만으로 조회하지 않는다.
- 제출 완료 후 `submission_id`를 저장하고 `/report/{submission_id}?token=...`로 이동한다.
- 공개 API는 `admin_custom_test_submission.id`와 `access_token`이 모두 일치하는 제출만 반환한다.
- 관리자 리포트에서 401 등 HTTP 오류가 정상 리포트 데이터처럼 렌더링되지 않도록 방어 로직을 추가했다.
- 관련 문서의 공개 리포트 API와 브라우저 라우트 설명을 갱신했다.

## 검증 내용
- `.venv/bin/python -m compileall app/router/report_router.py app/router/page_router.py app/services/report/builder.py`
- `.venv/bin/python -c "from app.main import app; ..."`로 새 공개 API 라우트 등록 확인
- 실제 DB 제출 `12` 기준:
  - 올바른 `submission_id + token`은 리포트 반환
  - 잘못된 token은 `{"error": "not_found"}` 반환
  - 관리자 API 비로그인 호출은 401 반환
- `npm run build` 통과
- Playwright로 `/report/12?token=...` 렌더링 확인 및 스크린샷 저장:
  - `artifacts/screenshots/2026-04-17-report-access-fix-after.png`

## 회고
- Plan Problem: 없음. 리뷰에서 세운 `submission_id + token` 검증 방향이 실제 데이터 모델과 맞았다.
- Execution Judgment Problem: 수정 전 스크린샷은 남기지 못했다. 이후 유사 UI 수정에서는 서버와 테스트 데이터를 먼저 확정한 뒤 전 스크린샷부터 확보해야 한다.
