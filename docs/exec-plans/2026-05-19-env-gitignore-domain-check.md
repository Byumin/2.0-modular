# Execution Plan

## Task Title
- .env Git 추적 제외 및 도메인 접속 상태 확인

## Request Summary
- 구매한 도메인으로 접속되지 않는 이유를 설명한다.
- `.env`가 Git에 포함되지 않도록 무시하고 추적에서 제외한다.

## Goal
- `.env`를 `.gitignore`에 추가한다.
- 로컬 `.env` 파일은 유지하되 Git index에서 제거한다.
- 현재 개발 서버 주소와 도메인 주소가 다른 이유를 정리한다.

## Initial Hypothesis
- 현재 `npm run dev`는 `127.0.0.1:8120`과 `localhost:5120`에만 바인딩하는 개발 서버다.
- 도메인으로 접속하려면 DNS, EC2 보안 그룹, 80/443 리버스 프록시, 운영 빌드 서빙 설정이 필요하다.
- `.env`는 이미 추적 중이라 `.gitignore`만으로는 부족하고 `git rm --cached .env`가 필요하다.

## Execution Plan
1. `.gitignore`에 `.env`를 추가한다.
2. `.env`를 Git index에서 제거하되 실제 파일은 유지한다.
3. `git status`와 `git ls-files .env`로 검증한다.
4. 도메인 접속 조건을 사용자에게 요약한다.

## Progress Updates
- Change: 실행계획 작성.
- Reason: Git 추적 상태를 바꾸는 작업이라 변경 의도를 남긴다.
- Change: `.gitignore`에 `.env`를 추가하고 `git rm --cached .env`로 index에서 제거했다.
- Reason: 실제 EC2 로컬 환경 파일은 유지하면서 이후 커밋에 비밀번호가 포함되지 않게 하기 위함.

## Result
- `.env`는 Git 추적 대상에서 제거됐다.
- `.env`는 `.gitignore` 규칙으로 무시된다.
- 도메인 접속은 Git 설정과 별개로 DNS/보안그룹/리버스 프록시/운영 서빙 설정이 필요하다.

## Verification
- `git ls-files .env` 결과가 비어 있음을 확인했다.
- `git check-ignore -v .env`가 `.gitignore:3:.env`를 반환함을 확인했다.

## Retrospective
- Classification: `No Major Issue`
- What Was Wrong: `.env`가 추적 중이라 비밀번호 입력 후 Git 변경으로 잡혔다.
- Why: `.gitignore`에 `.env`가 없었고, 이미 Git index에 등록된 파일은 나중에 ignore 규칙을 추가해도 자동으로 빠지지 않는다.
- Next Time: 환경 파일은 생성 직후 `.gitignore`에 추가하고, 이미 추적된 경우 `git rm --cached`까지 함께 수행한다.
