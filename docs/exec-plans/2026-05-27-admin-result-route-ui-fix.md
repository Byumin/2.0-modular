# 실행 계획: 관리자 검사 결과 화면 구버전 UI 노출 수정

## 요청 요약
- 운영 RDS를 바라보는 로컬 서버에서 `npm run build`, 강력 새로고침 후에도 검사 결과 화면이 예전 UI로 보인다.
- 사용자가 확인하는 경로는 `관리자 로그인 -> 내담자 관리 -> 상세 -> 결과 확인`이다.
- 실행계획부터 화면 캡처까지 포함해 원인을 확인하고 해결한다.

## 작업 목표
- 사용자가 실제로 클릭하는 `결과 확인` 버튼이 어떤 React 라우트로 이동하는지 확인한다.
- 새 결과 UI가 적용된 화면과 사용자가 보는 화면의 라우트 불일치가 있으면 연결을 수정한다.
- 로컬 실행 화면을 캡처해 수정 전/후를 비교한다.

## 초기 가설
- 최근 작업은 `/report/:submissionId` 또는 `/admin/report/:submissionId`의 `ReportPage.tsx`에 반영되었지만, 사용자가 누르는 버튼은 여전히 `/admin/clients/:id/result`의 `ClientResult`로 이동할 수 있다.
- 따라서 `npm run build`나 브라우저 캐시 문제가 아니라 진입 버튼이 다른 화면을 열고 있을 가능성이 높다.

## 실행 계획
1. 내담자 상세/결과 버튼 구현과 React 라우트 매핑을 확인한다.
2. 현재 로컬 서버 실행 상태와 빌드 산출물 경로를 확인한다.
3. 실제 관리자 흐름을 Playwright로 캡처해 현재 URL과 화면을 기록한다.
4. 버튼이 구버전 라우트로 연결되어 있으면 `/admin/report/{submissionId}`로 수정한다.
5. 빌드 및 화면 캡처로 수정 후 UI 반영을 검증한다.
6. 결과와 미검증 항목, 회고를 이 문서에 갱신한다.

## 작업 중 변경 사항
- `frontend/src/pages/ClientDetail.tsx`
  - 상세 상단의 구버전 `/admin/clients/{id}/result` 링크를 제거했다.
  - 완료된 검사 중 최신 항목이 있을 때만 `최근 결과 확인` 버튼을 보이고 `/admin/report/{submissionId}`로 직접 연결한다.
- `frontend/src/pages/ClientResult.tsx`
  - 구버전 `/admin/clients/{id}/result` 라우트에 직접 들어오면 클라이언트의 최신 완료 검사 로그를 찾아 `/admin/report/{submissionId}`로 `replace` 이동한다.
  - 완료된 검사 로그가 없는 경우에만 기존 빈 결과/대기 화면을 유지한다.

## 결과
- 사용자가 상세 화면의 `결과 확인`을 누르는 경로는 `/admin/report/{submissionId}` 새 결과 UI로 열린다.
- 예전 즐겨찾기나 잘못된 버튼으로 `/admin/clients/{id}/result`에 들어가도 최신 완료 결과가 있으면 새 결과 UI로 자동 이동한다.
- 원인 후보였던 오래 떠 있던 `8120` 서버는 `npm run prod:api`의 preflight가 종료했고, 새 빌드 후 서버가 새 JS 번들을 서빙하는 것을 확인했다.
- 추가 확인: 사용자가 다시 첨부한 `docs/design/reference/report-ui-ux/20260527_151051.png`는 `127.0.0.1:8120/admin/report/48`에서 이전 `Sidebar + T점수 프로파일` UI가 보이는 화면이다.
- 같은 코드/DB를 새 포트 `8121`에 직접 띄우면 `/admin/report/48`이 새 `전체 비교 + 검사별 결과 한눈에` UI로 렌더링된다. 따라서 남은 문제는 코드가 아니라 사용자의 브라우저/Windows localhost가 기존 `8120` 서버 또는 기존 번들을 보고 있는 런타임 불일치로 판단한다.

## 검증 내용
- `npm run build:frontend` 통과
  - 새 번들: `frontend/dist/assets/index-MzG9LYjF-v2.js`
- 서버 응답 확인
  - `curl http://127.0.0.1:8120/admin/report/48`가 `/assets/index-MzG9LYjF-v2.js`를 포함한 새 `index.html` 반환
- Playwright 캡처
  - `artifacts/screenshots/2026-05-27-client-detail-after-route-fix.png`
  - `artifacts/screenshots/2026-05-27-admin-report-after-route-fix.png`
  - `artifacts/screenshots/2026-05-27-legacy-client-result-redirect-after.png`
- Playwright 확인값
  - 상세 화면의 `결과 확인` 링크: `/admin/report/48`
  - 클릭 후 URL: `http://127.0.0.1:8120/admin/report/48`
  - 새 UI 확인 문자열: `전체 비교`, `검사별 결과 한눈에`
  - 구버전 URL `/admin/clients/108/result` 직접 접근 후 URL: `http://127.0.0.1:8120/admin/report/48`
- 추가 Playwright 확인값
  - URL: `http://127.0.0.1:8121/admin/report/48`
  - 새 UI 확인 문자열: `전체 비교=true`, `검사별 결과 한눈에=true`
  - 구 UI 확인 문자열: `척도 탐색=false`, `T점수 프로파일=false`
  - 캡처: `artifacts/screenshots/2026-05-27-admin-report-8121-new-port.png`

## 회고
- Classification: Mixed
- Plan Problem: 이전 작업은 새 결과 UI가 적용된 `ReportPage`만 확인했고, 사용자가 실제로 혼동할 수 있는 구버전 `/admin/clients/{id}/result` 진입점을 끝까지 차단하지 않았다.
- Execution Judgment Problem: `npm run build` 후에도 반영이 안 되는 현상을 캐시 문제로만 볼 수 있었지만, 실제로는 오래 떠 있던 서버와 구버전 라우트가 함께 혼동을 만들었다.
- Next Time: UI 변경 검증 시 대상 화면뿐 아니라 동일한 의미의 레거시 라우트, 상단 액션 버튼, 목록/상세/직접 URL 진입을 모두 캡처한다.
