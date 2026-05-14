# 로컬 개발 실행 가이드

## 포트 고정 규칙

| 서버 | 주소 |
|------|------|
| FastAPI 백엔드 | `http://127.0.0.1:8120` |
| Vite 프론트엔드 | `http://localhost:5120` |

`8000` 포트는 이 프로젝트에서 사용하지 않는다. `address already in use` 오류가 `8000`에서 발생해도 무시하고 `8120` 기준으로 접속한다.

---

## 최초 세팅 (클론 후 1회만)

### 1. Node.js 패키지 설치

```bash
npm install
```

`node_modules`가 없으면 `concurrently: not found` 오류가 나며 `npm run dev`가 동작하지 않는다.

### 2. Python 가상환경 생성 및 패키지 설치

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
```

`npm run dev:api`는 `.venv/bin/python`을 직접 호출하므로 가상환경 활성화(`source .venv/bin/activate`)는 불필요하지만, `.venv` 폴더 자체는 반드시 존재해야 한다.

---

## 실행 방법

### 1. 백엔드 + 프론트엔드 동시 실행 (일반적인 개발)

```bash
npm run dev
```

- FastAPI (`127.0.0.1:8120`) + Vite (`localhost:5120`)를 동시에 띄운다.
- 내부적으로 `concurrently`로 두 프로세스를 병렬 실행한다.

### 2. 백엔드만 실행

```bash
npm run dev:api
```

- `app.main:app`을 `127.0.0.1:8120`에서 실행한다.
- `--reload` 옵션이 붙어 있어 코드 변경 시 자동 재시작된다.

### 3. 프론트엔드 개발 서버만 실행

```bash
npm run dev:frontend
```

- Vite를 `localhost:5120`에서 실행한다.
- `/api`, `/static`, `/artifacts` 요청은 `vite.config.ts` proxy 설정에 따라 `127.0.0.1:8120`으로 전달된다.
- 백엔드가 먼저 실행 중이어야 API 요청이 정상 동작한다.

### 4. 프론트엔드 빌드

```bash
npm run build:frontend
```

- `frontend/dist/`에 React SPA 빌드 산출물을 생성한다.
- 빌드 후에는 FastAPI가 직접 `/`, `/admin/*`, `/assessment/custom/{token}`, `/report/{submissionId}`, `/admin/report/{submissionId}` route를 서빙한다.

---

## 접속 주소 정리

| 목적 | 주소 |
|------|------|
| 관리자 화면 | `http://127.0.0.1:8120/admin` |
| 수검자 화면 | `http://127.0.0.1:8120/assessment/custom/{token}` |
| 결과 보고서 | `http://127.0.0.1:8120/report/{submissionId}?token={accessToken}` |
| API 헬스 체크 | `http://127.0.0.1:8120/health` |

개발 서버(`5120`) 사용 시에도 동일한 path로 접속하면 Vite proxy가 백엔드로 전달한다.

---

## 앱 시작 시 자동 수행 작업

`npm run dev` 실행 후 FastAPI가 뜨면서 자동으로 다음을 수행한다.

1. SQLAlchemy 기준 테이블 생성
2. DB 컬럼 보정 마이그레이션 실행
3. 기본 관리자 계정 시드

별도 마이그레이션 명령을 실행할 필요 없이 앱을 띄우면 DB가 준비된다.

---

## 운영 DB

- RDS PostgreSQL
- `.env`의 `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` 기준으로 접속
- 루트 `modular.db`는 RDS 전환 전 스냅샷/마이그레이션 원본이며 앱 런타임 DB가 아니다.

---

## 관련 문서

- 전체 구조: [ARCHITECTURE.md](ARCHITECTURE.md)
- 저장소 규칙: [AGENTS.md](AGENTS.md)
