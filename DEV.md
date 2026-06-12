# 로컬 개발 실행 가이드

이 문서는 로컬에서 바로 실행하기 위한 빠른 안내다. 서버 실행 모드의 source-of-truth는 [docs/runtime-run-modes.md](docs/runtime-run-modes.md)다.

## 결론부터
프론트 화면을 고치면서 확인할 때는 보통 아래만 입력한다.

```bash
npm run dev
```

브라우저는 아래 주소로 연다.

```text
http://localhost:5120/admin
```

`localhost:5120`은 Vite 개발 서버라서 `frontend/src/**` 수정이 바로 반영된다. `127.0.0.1:8120`은 FastAPI가 `frontend/dist` 빌드본을 서빙하는 주소라서 프론트 수정이 바로 보이지 않을 수 있다.

`npm run dev`는 명령을 치자마자 바로 접속되는 구조가 아니다. 먼저 프론트 빌드를 한 번 실행한 뒤 백엔드와 Vite를 띄운다. 터미널에 아래 두 줄이 모두 보인 뒤 접속한다.

```text
Uvicorn running on http://127.0.0.1:8120
VITE ... ready ... Local: http://localhost:5120/
```

이 명령의 DB는 `APP_ENV=local.dev` 기준이다. 현재 기본값은 `env.local.dev`의 `DATABASE_URL=sqlite:///./modular.db`라서 로컬 SQLite `modular.db`를 본다.

`127.0.0.1:8120`에서 최신 프론트 빌드본까지 확인하고 싶으면 아래 중 하나를 실행한다.

```bash
npm run build:frontend
```

또는 서버를 다시 시작한다.

```bash
npm run dev:api
```

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

서버를 띄우는 npm 스크립트(`npm run dev`, `npm run dev:api`, `npm run prod:api`, `npm run ec2:api`)는 항상 먼저 `npm run build:frontend`를 실행해 `frontend/dist`를 갱신한다.

### 먼저 고를 것: DB 기준 3모드

서버 실행은 먼저 “어떤 DB를 볼 것인가”로 나눈다.

| 하고 싶은 일 | 실행 위치 | DB | APP_ENV | 명령 |
| --- | --- | --- | --- | --- |
| 로컬 파일 DB로 개발 | 내 PC/WSL | `modular.db` | `local.dev` | `npm run dev` |
| 로컬에서 운영 RDS 보기 | 내 PC/WSL | EC2 SSH 터널을 경유한 RDS | `local.prod` | 터널 후 `npm run prod:api` |
| 실제 운영 서버 실행 | EC2 | RDS 직접 접속 | `ec2.prod` | EC2에서 `npm run ec2:api` |

#### 1. 로컬 파일 DB로 개발

```bash
npm run dev
```

- 화면: `http://localhost:5120/admin`
- DB: 루트 `modular.db`
- 확인: `curl http://127.0.0.1:8120/health` 결과가 `"db":"sqlite"`

#### 2. 로컬에서 운영 RDS 보기

먼저 EC2 경유 SSH 터널을 연다.

```bash
ssh -i <키페어.pem> -L 15432:<RDS_ENDPOINT>:5432 ubuntu@<EC2_IP_OR_DOMAIN> -N
```

터널 터미널은 그대로 열어두고, 다른 터미널에서 실행한다.

```bash
npm run prod:api
```

- 화면: `http://127.0.0.1:8120/admin`
- DB: `localhost:15432` 터널을 통해 연결되는 RDS
- 확인: `curl http://127.0.0.1:8120/health` 결과가 `"db":"postgresql"`
- 주의: DBeaver의 SSH 터널은 보통 DBeaver 내부에서만 쓰이므로 앱이 자동으로 공유하지 않는다.

#### 3. 실제 EC2 운영 모드

EC2 서버에 SSH로 들어간 뒤 EC2 안에서 실행한다.

```bash
npm run ec2:api
```

- 화면: `https://<production-domain>/admin`
- DB: EC2에서 RDS 직접 접속
- 확인: `https://<production-domain>/health` 결과가 `"db":"postgresql"`

### `npm run dev`와 `npm run dev:api` 차이

둘 다 React 화면을 볼 수 있다.

| 명령 | React 화면 주소 | 화면을 서빙하는 서버 | 프론트 수정 반영 | DB |
| --- | --- | --- | --- | --- |
| `npm run dev` | `http://localhost:5120/admin` | Vite 개발 서버 | 바로 반영 | `local.dev` → `modular.db` |
| `npm run dev:api` | `http://127.0.0.1:8120/admin` | FastAPI가 `frontend/dist` 빌드본 서빙 | 빌드/재시작 필요 | `local.dev` → `modular.db` |

`npm run dev`에서도 `http://127.0.0.1:8120/admin`에 접속할 수는 있다. 하지만 프론트 작업 중에는 `localhost:5120`을 봐야 수정사항이 바로 보인다.

현재 서버가 어떤 DB를 보고 있는지는 아래로 확인한다.

```bash
curl http://127.0.0.1:8120/health
```

로컬 개발 정상값은 `"db":"sqlite"`다.

### 명령 선택표

| 하고 싶은 일 | 입력할 명령 | 볼 주소 |
| --- | --- | --- |
| 프론트 수정하면서 바로 보기 | `npm run dev` | `http://localhost:5120/admin` |
| 백엔드/API와 빌드된 프론트 같이 보기 | `npm run dev:api` | `http://127.0.0.1:8120/admin` |
| 백엔드가 이미 떠 있고 프론트만 따로 보기 | `npm run dev:frontend` | `http://localhost:5120/admin` |
| 프론트 빌드본만 새로 만들기 | `npm run build:frontend` | 서버를 띄우지 않음 |
| 로컬에서 RDS 터널로 확인하기 | `npm run prod:api` | `http://127.0.0.1:8120/admin` |

### 1. 백엔드 + 프론트엔드 동시 실행 (일반적인 개발)

```bash
npm run dev
```

- FastAPI (`127.0.0.1:8120`) + Vite (`localhost:5120`)를 동시에 띄운다.
- 서버 시작 전에 stale dev server를 정리하고 `frontend/dist`를 다시 빌드한다.
- 내부적으로 `concurrently`로 두 프로세스를 병렬 실행한다.

### 2. 백엔드만 실행

```bash
npm run dev:api
```

- `app.main:app`을 `127.0.0.1:8120`에서 실행한다.
- 서버 시작 전에 stale dev server를 정리하고 `frontend/dist`를 다시 빌드한다.
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

React 소스 수정이 바로 보이는 주소는 `http://localhost:5120`이다. `http://127.0.0.1:8120`은 서버 시작 전에 빌드된 `frontend/dist`를 보며, 새 React 변경을 이 주소에서 확인하려면 서버를 다시 시작하거나 `npm run build:frontend`를 다시 실행한다.

### 프론트 수정이 안 보일 때

1. 터미널에 `VITE ... ready ... Local: http://localhost:5120/`가 떴는지 확인한다.
2. 브라우저 주소가 `http://localhost:5120/...`인지 확인한다.
3. `http://127.0.0.1:8120/...`로 보고 있다면 `npm run build:frontend`를 다시 실행하거나 `npm run dev`를 다시 시작한다.
4. API 호출이 실패하면 백엔드(`127.0.0.1:8120`)가 떠 있는지 `http://127.0.0.1:8120/health`로 확인한다.

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

- 서버 실행 모드 상세 기준: [docs/runtime-run-modes.md](docs/runtime-run-modes.md)
- 전체 구조: [ARCHITECTURE.md](ARCHITECTURE.md)
- 저장소 규칙: [AGENTS.md](AGENTS.md)
