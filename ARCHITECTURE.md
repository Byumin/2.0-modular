# Architecture

## Overview
이 프로젝트는 FastAPI 백엔드와 정적 HTML/JavaScript 프론트엔드를 결합한 모듈형 검사 운영 웹 애플리케이션이다.

현재 운영 기준의 메인 엔트리포인트는 `app/main.py`이며, 애플리케이션은 다음 흐름으로 구성된다.

`Browser(static HTML/JS) -> FastAPI Router -> Pydantic Schema -> Service -> Repository -> SQLAlchemy Model/DB`

주요 목적은 다음과 같다.

1. 관리자가 로그인해서 관리자 화면에 접근한다.
2. 관리자가 커스텀 검사를 생성하고 운영한다.
3. 수검자에게 접근 링크를 배포한다.
4. 수검자가 프로필 검증 후 검사를 제출한다.
5. 제출 결과를 저장하고 관리자 화면에서 조회/관리한다.
6. 제출 데이터를 채점 엔진으로 계산하고 결과 활용 흐름으로 연결한다.

## Entry Point
실제 앱 구성의 시작점은 `app/main.py`다.

여기서 수행하는 핵심 역할은 다음과 같다.

- `.env` 파일 로드
- FastAPI 앱 생성
- `/static` 정적 파일 mount
- `/artifacts` 산출물 파일 mount
- 각 라우터 등록
- startup 시 DB 테이블 생성
- 필요한 스키마 보정 마이그레이션 수행
- 기본 관리자 계정 시드

루트 `main.py`도 존재하지만 현재 모듈형 구조의 기준점은 `app/main.py`로 본다.

## Layered Structure
프로젝트는 대체로 아래 계층 규칙을 따른다.

1. `router`
HTTP 요청을 받고 URL, 메서드, 파라미터, 쿠키, DB 세션 의존성을 연결한다.

2. `schema`
Pydantic 스키마로 요청 데이터를 검증하고 구조를 정한다.

3. `service`
실제 비즈니스 로직을 처리한다. 인증, 검사 생성, 평가 링크 처리, 제출 처리, 채점 같은 도메인 규칙이 여기에 있다.

4. `repository`
DB 조회/저장/수정/삭제를 담당한다.

5. `db`
SQLAlchemy 모델, 세션, 엔진, 초기화 및 보정 코드를 제공한다.

## Main Domains
### 1. Admin Auth
- 관리자 로그인/로그아웃
- `admin_session` 쿠키 기반 인증 상태 처리
- 현재 로그인 관리자 조회

### 2. Custom Test Management
- 검사 카탈로그 조회
- 커스텀 검사 생성
- 커스텀 검사 목록/상세 조회
- 수정, 삭제, 일괄 삭제

### 3. Assessment Link
- 커스텀 검사별 접근 토큰 발급
- 토큰으로 수검 페이지 진입
- 프로필 유효성 검증
- 응답 제출

### 4. Client Management
- 클라이언트 생성/조회/수정/삭제
- 검사 배정
- 평가 로그 생성
- 결과/리포트 문맥 조회

### 5. Dashboard
- 관리자 대시보드 데이터 조회
- 최근 평가 통계 조회

### 6. Scoring
- 제출된 `submission` 기준 채점 트리거
- 채점 엔진 및 검사 타입별 scoring 로직 분기

## Runtime Flow
대표적인 운영 시나리오는 아래와 같다.

1. 관리자가 `/admin`에서 로그인한다.
2. 관리자 화면이 `/api/admin/...` 엔드포인트로 커스텀 검사를 생성하거나 조회한다.
3. 서버는 커스텀 검사에 대한 접근 링크를 발급한다.
4. 수검자는 `/assessment/custom/{access_token}` 페이지에 진입한다.
5. 프론트엔드가 `/api/assessment-links/{access_token}`로 검사 정보를 조회한다.
6. 수검자가 프로필 검증과 답변 제출을 진행한다.
7. 서버는 제출 데이터를 DB에 저장한다.
8. 관리자는 관리자 화면에서 클라이언트/결과/통계를 확인한다.
9. 필요 시 `/api/admin/submissions/{submission_id}/score`로 채점을 실행한다.

## Directory Responsibilities
### `app/`
현재 메인 FastAPI 애플리케이션 코드가 모여 있는 루트 패키지다.

### `app/main.py`
실제 서버 조립 지점이다.

### `app/router/`
HTTP 엔드포인트를 기능별로 분리한다.

- `auth_router.py`: 관리자 인증
- `page_router.py`: 정적 HTML 진입 페이지
- `custom_test_router.py`: 커스텀 검사 관리
- `assessment_link_router.py`: 수검 링크 기반 API
- `client_router.py`: 클라이언트 관리
- `dashboard_router.py`: 대시보드/통계
- `scoring_router.py`: 제출 채점 트리거

### `app/schemas/`
Pydantic 요청/응답 구조를 관리한다.

### `app/services/`
비즈니스 로직 계층이다.

- `app/services/admin/`: 관리자 도메인 로직
- `app/services/scoring/`: 채점 로직
- `sub_test_service.py`, `test_a_adapter.py`: 검사 관련 보조 로직

### `app/repositories/`
DB 접근 로직을 기능별로 분리한다.

### `app/db/`
SQLAlchemy 모델, 세션, 엔진, 스키마 보정, DB 관련 자산을 관리한다.

### `static/`
브라우저에서 직접 내려가는 HTML, CSS, JavaScript 정적 파일이 있다.

### `docs/`
다이어그램, 점검 자료, 분석 문서를 둔다.

### `scripts/`
DB 생성, E2E 점검, 화면 캡처, 검증 스크립트를 둔다.

### `artifacts/`
생성된 HTML 리포트나 스크린샷 등 산출물을 저장한다.

### `logs/`
서버 로그와 테스트 실행 로그를 보관한다.

## Data and State
- DB는 SQLite 기반으로 사용된다.
- ORM은 SQLAlchemy를 사용한다.
- 요청/응답 검증은 Pydantic이 담당한다.
- 관리자 인증 상태는 `admin_session` 쿠키로 전달된다.
- 정적 리소스는 FastAPI `StaticFiles`로 서빙한다.

## Startup Responsibilities
애플리케이션 startup 시 다음 작업을 수행한다.

1. SQLAlchemy 메타데이터 기준 테이블 생성
2. 제출 테이블 관련 컬럼/테이블 보정
3. 기본 관리자 계정 시드

즉, 이 프로젝트는 완전 분리된 별도 마이그레이션 런타임만 의존하기보다, 앱 시작 시 필요한 최소 보정 작업도 함께 수행하는 구조다.

## Design Rules
- 현재 구조 해석의 기준점은 `app/main.py`다.
- 구현 설명 시에는 실제 코드 호출 흐름을 기준으로 본다.
- 라우터는 얇게 유지하고 비즈니스 로직은 서비스 계층에 둔다.
- DB 접근은 가능하면 repository 계층으로 모은다.
- 정적 관리자 화면과 API 서버는 같은 저장소 안에서 함께 운영한다.

## Extension Guide
새 기능을 추가할 때는 아래 기준을 따른다.

1. 새 API가 필요하면 `app/router/`에 기능별 라우터를 추가한다.
2. 요청 구조가 필요하면 `app/schemas/`에 스키마를 추가한다.
3. 비즈니스 로직은 `app/services/` 하위에 둔다.
4. DB 접근은 `app/repositories/`에 추가한다.
5. 모델 변경이 필요하면 `app/db/models.py`와 관련 보정 코드를 함께 검토한다.
6. 관리자 UI가 필요하면 `static/`에 HTML/JS를 추가하거나 기존 화면을 확장한다.
7. 구조 설명이나 추적 규칙이 필요하면 `docs/`에 문서를 보강한다.

## Related Documents
- `AGENTS.md`: 작업 시작 전 확인할 저장소 공통 규칙
- `docs/debug/explanation-rule.md`: 기능 설명, 디버깅, 호출 흐름 추적 규칙
