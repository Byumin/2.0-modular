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

## 환경 파일 구조

앱 실행 시 `APP_ENV` 환경변수 값에 따라 로드할 `env.*` 파일이 결정된다.

| `APP_ENV` | 로드 파일 | 실행 위치 | DB |
|-----------|----------|----------|----|
| `local.dev` (기본값) | `env.local.dev` | 로컬 Mac | SQLite (`modular.db`) |
| `local.prod` | `env.local.prod` | 로컬 Mac | RDS (SSH 터널 경유) |
| `ec2.prod` | `env.ec2.prod` | EC2 서버 | RDS (직접 접속) |

- `APP_ENV`를 지정하지 않으면 `local.dev`로 동작한다.
- 세 파일 모두 `.gitignore`에 의해 git 추적에서 제외된다.
- EC2에서 `APP_ENV` 없이 직접 `uvicorn`을 실행하면 기본값 `local.dev`로 동작하므로 RDS가 아니라 로컬 SQLite를 보게 된다.
- 로컬에서 RDS 접속 시 SSH 터널이 필요하다 (포트 15432).

### npm 스크립트와 APP_ENV 매핑

| 명령 | APP_ENV | DB |
|------|---------|----|
| `npm run dev` | `local.dev` | SQLite |
| `npm run dev:api` | `local.dev` | SQLite |
| `npm run prod:api` | `local.prod` | RDS (SSH 터널) |
| `npm run ec2:api` | `ec2.prod` | RDS (직접) |

EC2에서 FastAPI만 직접 실행해야 한다면 아래처럼 `APP_ENV=ec2.prod`를 반드시 붙인다.

```bash
APP_ENV=ec2.prod .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8120
```

### SSH 터널 (local.prod 사용 시)

```bash
ssh -i <키페어.pem> -L 15432:<RDS_ENDPOINT>:5432 ubuntu@<EC2_IP> -N -f
```

터널이 열린 상태에서 `npm run prod:api`를 실행해야 RDS에 접속된다.

---

## 관련 문서

- 전체 구조: [ARCHITECTURE.md](ARCHITECTURE.md)
- 저장소 규칙: [AGENTS.md](AGENTS.md)
