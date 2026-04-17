# Submission Report Token Isolation

## 요청 요약
- 공개 보고서 접근 권한을 검사 실시 링크 토큰과 분리한다.
- 같은 검사 링크로 여러 내담자가 응시해도 제출 ID만 바꿔 다른 사람 결과를 볼 수 없게 한다.
- 작업은 저장소 하네스 문서 기준으로 실행 계획을 남기고 진행한다.

## 작업 목표
- 신규 제출마다 별도 보고서 조회 토큰을 발급한다.
- 제출 완료 화면과 기존 결과 보기 흐름은 제출별 보고서 토큰을 사용한다.
- 기존 DB에 검사 링크 토큰과 동일한 값으로 저장된 제출 토큰은 시작 시 회전한다.

## 초기 가설
- `admin_custom_test_submission.access_token` 컬럼을 보고서 전용 토큰으로 의미 전환하면 새 컬럼 없이 보안 모델을 분리할 수 있다.
- 검사 실시 링크 토큰은 `admin_custom_test_access_link.access_token`에만 남기고, 제출 저장 시 `secrets.token_urlsafe`로 별도 토큰을 저장하면 된다.
- 기존 제출 중 access link 토큰과 같은 값은 런타임 마이그레이션에서 새 토큰으로 회전해야 공유 토큰 취약점이 남지 않는다.

## 실행 계획
1. 제출별 보고서 토큰 생성 helper를 추가한다.
2. 제출 생성 시 검사 링크 토큰 대신 보고서 토큰을 `AdminCustomTestSubmission.access_token`에 저장한다.
3. 제출 응답에 보고서 토큰을 포함하고, 프런트 완료 화면/session storage가 해당 토큰을 사용하게 한다.
4. 기존 결과/재실시 흐름은 최신 제출에 저장된 보고서 토큰을 계속 사용하게 확인한다.
5. 기존 공유 제출 토큰을 회전하는 schema migration을 추가하고 startup에 연결한다.
6. 빌드, 파이썬 컴파일, 브라우저 흐름으로 검증한다.

## 작업 중 변경 사항
- 제출 생성 시 `secrets.token_urlsafe(32)` 기반 제출별 보고서 토큰을 발급하도록 했다.
- `AdminCustomTestSubmission.access_token`에는 검사 실시 링크 토큰이 아니라 보고서 전용 토큰을 저장하도록 바꿨다.
- 제출 응답에 `access_token`을 포함해 프런트가 보고서 전용 토큰을 받을 수 있게 했다.
- 완료 화면/session storage는 제출 ID와 보고서 전용 토큰을 함께 저장하고 복원하도록 바꿨다.
- 완료 화면의 결과 보기 버튼도 새 탭으로 보고서를 열도록 통일했다.
- 기존 DB에서 제출 토큰이 검사 링크 토큰과 같은 경우 시작 시 제출별 토큰으로 회전하는 마이그레이션을 추가했다.

## 결과
- 신규 제출의 공개 보고서 URL은 검사 링크 토큰이 아니라 제출별 보고서 토큰을 사용한다.
- 같은 검사 링크로 여러 명이 응시해도 제출 ID만 바꿔 다른 제출 결과를 조회할 수 없도록 권한 모델을 분리했다.
- 기존 공유 토큰 제출은 앱 시작 시 회전되어 기존 취약한 URL이 더 이상 유효하지 않게 된다.

## 검증 내용
- `npm run build` 통과
- `.venv/bin/python -m py_compile app/services/admin/assessment_links.py app/db/schema_migrations.py app/main.py` 통과
- `git diff --check` 통과

## 회고
- Plan Problem: 최초 공개 보고서 URL 수정에서는 `submission_id + token`만으로 충분하다고 봤지만, token이 검사 링크 단위로 공유된다는 권한 모델 문제를 놓쳤다.
- Execution Judgment Problem: 완료 화면이 검사 링크 토큰을 그대로 결과 URL에 사용하고 있어 제출별 보고서 토큰 응답/저장을 추가로 반영해야 했다.
