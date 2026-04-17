# Client Detail Result Button Cleanup

## 요청 요약
- 내담자 관리의 완료된 검사 목록에서 `보고서` 버튼 문구를 `결과 확인`으로 바꾼다.
- 그 옆에 있던 기존 `결과 확인` 버튼은 제거한다.

## 작업 목표
- 완료된 검사 행의 결과 진입 버튼을 하나로 정리한다.
- 새 리포트 경로(`/admin/report/{submissionId}`)로 연결되는 버튼만 남긴다.

## 초기 가설
- 버튼은 `frontend/src/pages/ClientDetail.tsx`의 완료된 검사 목록에서 렌더링된다.
- 기존 `/admin/clients/{id}/result` 버튼은 중복 진입점이므로 제거해도 현재 요청 범위에 맞다.

## 실행 계획
1. 완료된 검사 버튼 영역을 수정한다.
2. 관련 문구가 남아있는지 검색한다.
3. 프런트 빌드 또는 타입 체크로 검증한다.

## 작업 중 변경 사항
- 완료된 검사 목록의 `/admin/report/{submissionId}` 버튼 문구를 `보고서`에서 `결과 확인`으로 변경했다.
- 기존 `/admin/clients/{id}/result`로 이동하던 옆 `결과 확인` 버튼을 제거했다.

## 결과
- 완료된 검사 행에는 새 리포트 화면으로 이동하는 `결과 확인` 버튼 하나만 남는다.

## 검증 내용
- `rg`로 해당 영역의 `보고서` 버튼 문구와 `/admin/clients/${id}/result` 링크 제거 확인
- `npm run build` 통과

## 회고
- Plan Problem: 없음.
- Execution Judgment Problem: UI 변경 전 스크린샷은 확보하지 못했다. 이후 버튼/문구 수정도 가능하면 수정 전에 화면 캡처를 먼저 남긴다.
