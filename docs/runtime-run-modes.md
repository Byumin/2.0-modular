# 서버 실행 모드

## 문서 역할
이 문서는 서버를 어떤 목적으로 어떤 방식으로 띄우는지 정리하는 운영 가이드다.

- 독자: 로컬 개발, UI 검증, 빌드 확인, 운영 도메인 배포를 구분해야 하는 작업자
- 역할: 서버 실행 모드의 source-of-truth
- 구조 기준: [ARCHITECTURE.md](../ARCHITECTURE.md)
- DB 런타임 기준: [docs/database/runtime-db.md](database/runtime-db.md)

## 가장 빠른 실행법
대부분의 로컬 개발은 아래 한 줄이면 된다.

```bash
npm run dev
```

브라우저는 아래 주소로 연다.

```text
http://localhost:5120/admin
```

이 모드는 FastAPI 백엔드(`127.0.0.1:8120`)와 Vite 프론트엔드(`localhost:5120`)를 같이 띄운다.

주의할 점은 명령을 치자마자 바로 접속되는 것이 아니라는 점이다. `npm run dev`는 먼저 `frontend/dist` 빌드를 끝낸 뒤에 서버를 띄운다. 터미널에 아래 두 줄이 모두 보인 뒤 접속한다.

```text
Uvicorn running on http://127.0.0.1:8120
VITE ... ready ... Local: http://localhost:5120/
```

React 소스를 수정하면 보통 `localhost:5120` 화면에 바로 반영된다.

이때 DB는 `APP_ENV=local.dev` 기준이다. 현재 기본 설정은 `env.local.dev`의 `DATABASE_URL=sqlite:///./modular.db`이므로 로컬 SQLite `modular.db`를 본다.

백엔드만 확인하거나 FastAPI가 빌드된 React 화면까지 직접 서빙하는 상태를 보려면 아래를 사용한다.

```bash
npm run dev:api
```

브라우저는 아래 주소로 연다.

```text
http://127.0.0.1:8120/admin
```

단, `8120`은 `frontend/dist` 빌드 산출물을 보기 때문에 React 소스 수정이 실시간으로 반영되지 않는다. `8120`에서 새 프런트 변경을 보려면 `npm run build:frontend`를 다시 실행하거나 서버를 재시작한다.

## `npm run dev`와 `npm run dev:api` 차이
둘 다 React 화면을 볼 수 있다. 차이는 React 화면을 어떤 서버가 서빙하느냐다.

| 명령 | 같이 뜨는 서버 | React 화면 주소 | React 파일 출처 | 프런트 수정 반영 | DB |
| --- | --- | --- | --- | --- | --- |
| `npm run dev` | FastAPI `8120` + Vite `5120` | 보통 `http://localhost:5120/admin` | Vite가 `frontend/src`를 개발 서버로 서빙 | 즉시 반영 | `local.dev` → `modular.db` |
| `npm run dev:api` | FastAPI `8120`만 | `http://127.0.0.1:8120/admin` | FastAPI가 `frontend/dist` 빌드본을 서빙 | 빌드 또는 서버 재시작 필요 | `local.dev` → `modular.db` |

즉 `npm run dev`에서 React 화면이 안 보이는 것이 아니다. React 화면은 `localhost:5120`에서 보는 것이 기본이고, API 요청은 Vite proxy가 `8120` 백엔드로 넘긴다.

`npm run dev`를 켠 상태에서도 `http://127.0.0.1:8120/admin`에 접속할 수는 있다. 다만 그 주소는 Vite가 아니라 FastAPI가 빌드본을 보여주는 주소라서 프런트 수정이 바로 반영되지 않는다.

## DB 기준 3가지 실행 모드
이 프로젝트의 서버 실행은 DB 기준으로 먼저 3가지 중 하나를 고른다.

| 모드 | 실행 위치 | DB 접근 방식 | APP_ENV | 실행 명령 | 주 용도 |
| --- | --- | --- | --- | --- | --- |
| 로컬 DB 모드 | 내 PC/WSL | 로컬 파일 `modular.db` 직접 사용 | `local.dev` | `npm run dev` 또는 `npm run dev:api` | 프런트/백엔드 일반 개발 |
| 로컬에서 RDS 보기 | 내 PC/WSL | SSH 터널로 EC2를 경유해 RDS 접속 | `local.prod` | SSH 터널 후 `npm run prod:api` | 운영 데이터 확인, 배포 전 점검 |
| EC2 운영 모드 | EC2 서버 | EC2에서 RDS에 직접 접속 | `ec2.prod` | EC2에서 `npm run ec2:api` 또는 systemd | 실제 운영 서비스 |

### 1. 로컬 DB 모드
내 PC에서 앱을 띄우고 로컬 SQLite 파일을 본다.

```bash
npm run dev
```

- 실행 위치: 내 PC/WSL
- 접속 화면: `http://localhost:5120/admin`
- 백엔드: `http://127.0.0.1:8120`
- DB: 루트 `modular.db`
- 환경 파일: `env.local.dev`
- 확인값: `/health` 응답의 `"db":"sqlite"`

### 2. 로컬에서 RDS 보기
내 PC에서 앱을 띄우지만 DB는 운영 RDS를 본다. 이때 RDS는 EC2를 통해서만 접근하므로 SSH 터널이 먼저 필요하다.

```bash
ssh -i <키페어.pem> -L 15432:<RDS_ENDPOINT>:5432 ubuntu@<EC2_IP_OR_DOMAIN> -N
```

터널을 연 터미널은 그대로 둔 상태에서, 다른 터미널에서 서버를 실행한다.

```bash
npm run prod:api
```

- 실행 위치: 내 PC/WSL
- 접속 화면: `http://127.0.0.1:8120/admin`
- DB: SSH 터널 `localhost:15432`를 통해 연결되는 RDS
- 환경 파일: `env.local.prod`
- 전제: `127.0.0.1:15432`가 열려 있어야 함
- 확인값: `/health` 응답의 `"db":"postgresql"`

DBeaver가 EC2 SSH 터널로 RDS에 붙어 있어도, 그 터널은 보통 DBeaver 내부에서만 쓰인다. 앱이 같은 RDS를 보려면 OS 포트 `15432`에 별도 SSH 터널을 열어야 한다.

### 3. EC2 운영 모드
EC2 서버에서 앱을 실행하고, 같은 VPC 안의 RDS에 직접 접속한다.

```bash
npm run ec2:api
```

- 실행 위치: EC2
- 접속 화면: `https://inpsyt-norm.com/admin`
- DB: RDS 직접 접속
- 환경 파일: EC2의 `env.ec2.prod`
- 확인값: `/health` 응답의 `"db":"postgresql"`

## 먼저 고를 것
서버를 띄우기 전에 목적부터 고른다.

서버를 띄우는 npm 스크립트는 항상 먼저 `npm run build:frontend`를 실행한다. `http://127.0.0.1:8120`은 FastAPI가 `frontend/dist`를 서빙하는 주소이므로, 서버 시작 시점의 최신 프런트 빌드가 반영되어야 한다.

| 목적 | 실행 모드 | 접속 주소 | DB | 사용할 때 |
| --- | --- | --- | --- | --- |
| 화면을 개발하면서 바로 확인 | 로컬 개발 모드 | `http://localhost:5120` | SQLite (`local.dev`) | 관리자/수검자 UI 작업 |
| API만 확인하거나 빌드된 화면 확인 | 로컬 통합 확인 모드 | `http://127.0.0.1:8120` | SQLite (`local.dev`) | API, 빌드 산출물, 라우팅 확인 |
| 로컬에서 운영 DB 테스트 | 로컬 RDS 연결 모드 | `http://127.0.0.1:8120` | RDS (`local.prod`, SSH 터널) | 운영 데이터 확인, 배포 전 검증 |
| 프런트 산출물만 만들기 | 프런트 빌드 | 접속 주소 없음 | — | 통합 확인 또는 운영 배포 전 |
| 실제 사용자가 접속 | 운영 도메인 모드 | 실제 운영 도메인 | RDS (`ec2.prod`) | 운영 서비스 |

## 프런트 수정 반영 기준
프런트 파일(`frontend/src/**`)을 고칠 때는 어느 주소로 보고 있는지가 중요하다.

| 보고 있는 주소 | 수정 반영 방식 | 추천 상황 |
| --- | --- | --- |
| `http://localhost:5120` | Vite가 React 변경을 즉시 반영한다. 보통 새로고침도 거의 필요 없다. | 화면 작업, CSS/컴포넌트 수정 |
| `http://127.0.0.1:8120` | `frontend/dist`를 보므로 `npm run build:frontend` 또는 서버 재시작이 필요하다. | 빌드 산출물, FastAPI 통합 라우팅 확인 |
| 운영 도메인 | 서버에 변경 반영 후 `npm run build:frontend`, FastAPI 프로세스 재시작 또는 배포 절차가 필요하다. | 운영 반영 |

로컬 UI 개발 중에는 `npm run dev`를 켜고 `localhost:5120`으로 보는 것이 기본이다. `5120`의 `/api`, `/static`, `/artifacts` 요청은 Vite proxy가 `8120` 백엔드로 넘긴다.

현재 서버가 어떤 DB를 보고 있는지 빠르게 확인하려면 다음을 실행한다.

```bash
curl http://127.0.0.1:8120/health
```

`npm run dev`와 `npm run dev:api`의 정상 기본값은 `"db":"sqlite"`다. RDS를 보는 모드는 `npm run prod:api` 또는 `npm run ec2:api`다.

`8120` 화면이 최신 프런트처럼 보이지 않을 때는 아래 중 하나를 실행한다.

```bash
npm run build:frontend
```

또는 서버를 다시 시작한다.

```bash
npm run dev:api
```

## 프런트 반영이 안 되거나 예전 UI가 보일 때
이 섹션은 같은 URL인데 작업자 캡처와 사용자 브라우저 화면이 다르거나, `npm run build:frontend`와 강력 새로고침 후에도 예전 UI가 보일 때의 source-of-truth 체크리스트다.

### 왜 이런 일이 생기는가
이 프로젝트는 로컬에서 React 화면을 볼 수 있는 경로가 두 개다.

- `localhost:5120`: Vite 개발 서버가 `frontend/src`를 직접 서빙한다.
- `127.0.0.1:8120`: FastAPI가 `frontend/dist` 빌드 산출물을 서빙한다.

따라서 아래 상황에서는 브라우저 강력 새로고침만으로 해결되지 않는다.

1. **다른 서버를 보고 있음**
   - Codex/WSL에서 확인한 `127.0.0.1:8120`과 Windows Chrome이 보는 `127.0.0.1:8120`이 실제로 다른 프로세스일 수 있다.
   - Windows 쪽에서 예전 uvicorn, Python, Node, 터미널 프로세스가 같은 포트를 잡고 있으면 같은 URL처럼 보여도 다른 런타임을 볼 수 있다.

2. **다른 번들을 보고 있음**
   - `8120`은 `frontend/dist/index.html`이 가리키는 `/assets/index-...js`를 로딩한다.
   - 소스는 바뀌었지만 빌드 산출물 또는 서버가 서빙 중인 `index.html`이 예전 JS 파일을 가리키면 예전 UI가 나온다.

3. **서버 시작 순서가 틀림**
   - `app/main.py`는 앱 import 시점에 `frontend/dist`가 있으면 `/assets`를 mount한다.
   - 일반적으로 `npm run dev:api` 또는 `npm run prod:api`를 쓰면 선행 빌드 후 서버가 뜨므로 안전하다.
   - 수동으로 uvicorn을 먼저 띄우고 나중에 빌드하면 현재 서버와 빌드 산출물의 상태를 다시 확인해야 한다.

4. **레거시 라우트 또는 다른 진입 버튼을 보고 있음**
   - 예를 들어 새 결과 UI는 `/admin/report/{submissionId}`에 있는데, 구버전 `/admin/clients/{clientId}/result` 같은 진입점이 남아 있으면 빌드 문제가 아니라 라우팅 문제다.
   - UI 변경 검증은 실제 사용자 클릭 경로와 직접 URL 진입을 모두 확인해야 한다.

### 먼저 확인할 것
예전 UI가 보이면 추측으로 캐시 삭제부터 하지 말고 아래 순서대로 확인한다.

1. 현재 브라우저 주소를 정확히 기록한다.
   - 예: `http://127.0.0.1:8120/admin/report/48`
   - 포트가 `5120`인지 `8120`인지 먼저 본다.

2. 서버가 서빙하는 JS 파일명을 확인한다.

   ```bash
   curl -s http://127.0.0.1:8120/admin/report/48 | sed -n '1,20p'
   ```

   정상이라면 `frontend/dist/index.html`의 현재 JS 파일명과 같아야 한다.

   ```bash
   sed -n '1,20p' frontend/dist/index.html
   ```

3. 현재 빌드 산출물에 새 UI 문자열이 들어갔는지 확인한다.

   ```bash
   rg -n "전체 비교|검사별 결과 한눈에|새로 추가한 화면 문구" frontend/dist/assets
   ```

   여기서 문자열이 없으면 빌드가 안 된 것이다. `npm run build:frontend`를 실행한다.

4. 서버 프로세스를 확인한다.

   WSL/Linux에서는 다음을 먼저 본다.

   ```bash
   ps -ef | rg "uvicorn|vite|8120|5120|npm run"
   ```

   Windows PowerShell에서는 다음으로 8120 점유 프로세스를 본다.

   ```powershell
   Get-NetTCPConnection -LocalPort 8120 -ErrorAction SilentlyContinue |
     Select-Object LocalAddress,LocalPort,State,OwningProcess

   Get-Process -Id ((Get-NetTCPConnection -LocalPort 8120 -ErrorAction SilentlyContinue).OwningProcess |
     Select-Object -Unique) -ErrorAction SilentlyContinue |
     Select-Object Id,ProcessName,Path
   ```

5. 같은 URL을 Playwright나 다른 브라우저 컨텍스트로 캡처한다.

   - Playwright에서 새 UI가 보이고 사용자 Chrome에서만 예전 UI가 보이면 브라우저/Windows localhost 런타임 불일치 가능성이 높다.
   - 둘 다 예전 UI면 코드 라우팅 또는 빌드 산출물 문제다.

### 확실히 분리하는 방법
`8120`이 의심되면 새 포트로 같은 앱을 띄워 런타임을 분리한다.

```bash
APP_ENV=local.prod .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8121
```

그 다음 브라우저에서 새 포트로 접속한다.

```text
http://127.0.0.1:8121/admin
http://127.0.0.1:8121/admin/report/{submissionId}
```

새 포트에서는 새 UI가 보이고 기존 `8120`에서만 예전 UI가 보이면, 문제는 코드가 아니라 기존 `8120` 프로세스 또는 브라우저가 보고 있는 런타임이다.

### 해결 절차
상황별로 아래처럼 처리한다.

| 증상 | 원인 가능성 | 처리 |
| --- | --- | --- |
| `frontend/dist/assets`에 새 문구가 없음 | 프런트 빌드 안 됨 | `npm run build:frontend` |
| `curl 8120/...`의 JS 파일명이 `frontend/dist/index.html`과 다름 | 다른 서버 또는 오래된 서버 응답 | `npm run dev:api` 또는 `npm run prod:api`로 preflight 포함 재시작 |
| Playwright는 새 UI, Chrome은 예전 UI | Chrome이 다른 런타임/캐시/기존 탭 상태를 봄 | 새 포트 `8121`로 확인, DevTools Network에서 JS 파일명 확인 |
| `/admin/clients/{id}/result`만 예전 UI | 레거시 React 라우트 | 해당 버튼/라우트를 `/admin/report/{submissionId}`로 연결하거나 리다이렉트 |
| `5120`에서는 새 UI, `8120`에서는 예전 UI | Vite 소스와 FastAPI 빌드본 차이 | `npm run build:frontend` 후 `npm run dev:api` 또는 `npm run prod:api` 재시작 |

### UI 작업 검증 기본값
프런트/UI 작업에서 "반영이 안 된다"는 보고가 나오면 최종 답변 전에 최소 아래를 확인한다.

1. 실제 사용자 클릭 경로의 URL
2. React 라우트 매핑
3. `frontend/dist/index.html`의 JS 파일명
4. 서버가 반환하는 `index.html`의 JS 파일명
5. 빌드 산출물 안의 새 UI 문자열
6. Playwright 스크린샷
7. 필요 시 새 포트로 띄운 비교 스크린샷

이 절차를 거치기 전에는 "캐시 문제"라고 단정하지 않는다.

## 고정 포트
이 저장소의 로컬 포트는 고정한다.

- FastAPI 통합 앱: `http://127.0.0.1:8120`
- Vite 개발 서버: `http://localhost:5120`
- Vite proxy 대상: `http://127.0.0.1:8120`

`8000` 포트는 이 저장소의 기본 실행 포트로 사용하지 않는다.

## 로컬 개발 모드
목적은 React 화면을 수정하면서 바로 확인하는 것이다.

- **APP_ENV**: `local.dev` (기본값, 자동 적용)
- **env 파일**: `env.local.dev`
- **DB**: 로컬 SQLite (`modular.db`)

```bash
npm run dev
```

이 명령은 먼저 stale dev server를 정리하고 `frontend/dist`를 다시 빌드한 뒤, 아래 두 서버를 함께 띄운다.

- FastAPI: `http://127.0.0.1:8120`
- Vite: `http://localhost:5120`

브라우저에서는 보통 `http://localhost:5120`로 접속한다. 이 주소에서 React 소스 변경이 바로 반영된다. `http://127.0.0.1:8120`은 서버 시작 전에 생성된 빌드 산출물을 본다.

자주 쓰는 개발 주소는 다음과 같다.

```text
http://localhost:5120/admin
http://localhost:5120/assessment/custom/{token}
http://localhost:5120/report/{submissionId}?token={accessToken}
```

프런트 서버만 따로 띄울 때는 다음 명령을 사용한다.

```bash
npm run dev:frontend
```

이 경우 API 요청은 `frontend/vite.config.ts`의 proxy 설정을 통해 `http://127.0.0.1:8120`으로 전달된다. 따라서 백엔드가 별도로 떠 있어야 한다.

## 로컬 통합 확인 모드
목적은 FastAPI가 빌드된 React SPA까지 직접 서빙하는 상태를 확인하는 것이다.

- **APP_ENV**: `local.dev` (기본값, 자동 적용)
- **env 파일**: `env.local.dev`
- **DB**: 로컬 SQLite (`modular.db`)

```bash
npm run dev:api
```

접속 주소는 `http://127.0.0.1:8120`이다.
이 명령도 서버를 띄우기 전에 stale dev server를 정리하고 `frontend/dist`를 다시 빌드한다.

이 모드에서 FastAPI는 `frontend/dist`가 있으면 다음 browser route를 직접 서빙한다.

- `/`
- `/admin/*`
- `/assessment/custom/{token}`
- `/report/{submissionId}`
- `/admin/report/{submissionId}`

주의할 점은 서버가 떠 있는 동안 React 소스 변경이 `8120`에 실시간 반영되지는 않는다는 것이다. `8120`에서 새 React 변경을 보려면 서버를 다시 시작해 선행 빌드가 실행되게 하거나 `npm run build:frontend`를 다시 실행한다.

자주 쓰는 통합 확인 주소는 다음과 같다.

```text
http://127.0.0.1:8120/admin
http://127.0.0.1:8120/assessment/custom/{token}
http://127.0.0.1:8120/report/{submissionId}?token={accessToken}
http://127.0.0.1:8120/health
```

## 로컬 RDS 연결 모드
목적은 로컬에서 운영 RDS에 직접 연결해 데이터를 확인하거나 배포 전 검증하는 것이다.

- **APP_ENV**: `local.prod`
- **env 파일**: `env.local.prod`
- **DB**: RDS PostgreSQL (SSH 터널 경유)
- **사전 조건**: SSH 터널이 열려 있어야 한다

```bash
# 1. SSH 터널 열기 (터널이 이미 열려 있으면 생략)
ssh -i <키페어.pem> -L 15432:<RDS_ENDPOINT>:5432 ubuntu@<EC2_IP> -N -f

# 2. 서버 실행
npm run prod:api
```

`npm run prod:api`도 서버 시작 전에 `frontend/dist`를 다시 빌드한다.

## 프런트 빌드
목적은 FastAPI 통합 확인이나 운영 배포에 사용할 React 산출물을 만드는 것이다.

```bash
npm run build:frontend
```

이 명령은 서버를 띄우지 않는다. `frontend/dist`만 갱신한다.

빌드 후에는 `npm run dev:api`로 `http://127.0.0.1:8120`에서 빌드된 화면을 확인할 수 있다.

## 운영 도메인 모드
목적은 실제 사용자가 구매/연결 완료된 도메인으로 서비스에 접속하게 하는 것이다.

- **APP_ENV**: `ec2.prod`
- **env 파일**: `env.ec2.prod` (EC2 서버에 직접 생성)
- **DB**: RDS PostgreSQL (VPC 내부 직접 접속, 터널 불필요)

- 운영 도메인: `https://<production-domain>`
- 기록 상태: 실제 도메인 값은 이 문서에 아직 확인 반영되지 않았다.

운영 도메인은 Vite 개발 서버가 아니다. 운영에서는 보통 아래 흐름으로 접근한다.

`사용자 브라우저 -> https://<production-domain> -> reverse proxy(80/443) -> FastAPI(127.0.0.1:8120) -> frontend/dist/API -> RDS PostgreSQL`

### 운영 도메인으로 띄우는 순서
아래 순서는 실제 도메인을 이미 구매했고 DNS 연결을 할 수 있다는 전제의 운영 절차다.

1. 도메인 DNS를 서버로 연결한다.
   - 도메인 루트 또는 서브도메인의 `A` 레코드를 운영 서버 public IP로 연결한다.
   - CDN/프록시 서비스를 쓰는 경우 해당 서비스의 안내에 맞춰 `CNAME` 또는 프록시 설정을 사용한다.

2. 운영 서버의 네트워크를 연다.
   - 외부에서 `80`과 `443` 포트로 접근 가능해야 한다.
   - FastAPI 내부 포트 `8120`은 reverse proxy가 접근하면 되므로 외부에 직접 열 필요는 없다.

3. 운영 서버에 환경 변수를 준비한다.
   - EC2 서버에 `env.ec2.prod` 파일을 직접 생성하고 RDS 접속 정보를 입력한다.
   - 앱 실행 시 `APP_ENV=ec2.prod`를 지정한다.
   - `env.*` 파일 자체와 DB 비밀번호는 GitHub에 올리지 않는다.

4. 프런트 산출물을 빌드한다.

   ```bash
   npm install
   npm --prefix frontend install
   npm run build:frontend
   ```

5. FastAPI 앱을 운영 서버에서 실행한다.
   - 운영 엔트리포인트는 `app.main:app`이다.
   - 개발 편의용 `--reload`는 운영 장기 실행 프로세스에는 쓰지 않는다.
   - EC2에서 `APP_ENV` 없이 직접 `uvicorn`을 실행하면 기본값 `local.dev`가 적용되어 `env.local.dev`의 SQLite 설정을 보게 된다. 운영 RDS로 띄울 때는 반드시 `APP_ENV=ec2.prod` 또는 `npm run ec2:api`를 사용한다.
   - 예시는 다음과 같다.

   ```bash
   npm run ec2:api
   ```

   내부적으로 실행되는 명령은 다음과 같다.

   ```bash
   APP_ENV=ec2.prod .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8120
   ```

   실제 운영에서는 `systemd`, process manager, 컨테이너, 배포 스크립트 중 하나로 위 프로세스가 재부팅 후에도 살아나게 관리한다.

6. reverse proxy를 설정한다.
   - `https://<production-domain>` 요청을 `http://127.0.0.1:8120`으로 전달한다.
   - `/`, `/admin/*`, `/assessment/custom/{token}`, `/report/*`, `/api/*`, `/static/*`, `/artifacts/*`가 FastAPI로 전달되어야 한다.
   - TLS 인증서를 적용해 `https`로 접속되게 한다.
   - Caddy 설정이나 unit 파일 변경 후에는 아래처럼 systemd 상태를 갱신하고 재시작한다.

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart caddy
   systemctl is-active caddy
   ```

7. 운영 도메인으로 확인한다.
   - 관리자 화면: `https://<production-domain>/admin`
   - 수검자 화면: `https://<production-domain>/assessment/custom/{token}`
   - 결과 보고서: `https://<production-domain>/report/{submissionId}?token={accessToken}`
   - API 헬스 체크: `https://<production-domain>/health`

### 운영 반영 방식
운영 도메인에서는 React 소스 변경이 자동 반영되지 않는다.

프런트 변경을 운영에 반영하려면 다음 순서가 필요하다.

1. 변경된 소스를 서버에 반영한다.
2. `npm run build:frontend`로 `frontend/dist`를 다시 만든다.
3. FastAPI 프로세스를 재시작하거나 배포 절차를 실행한다.
4. 운영 도메인에서 실제 화면을 확인한다.

## GitHub 문서 공개 기준
이 문서처럼 명령어, 고정 로컬 포트, 공개 운영 도메인, 라우팅 구조, 추상화된 운영 흐름을 정리한 문서는 GitHub에 올려도 된다.

다만 아래 값은 GitHub 문서에 쓰지 않는다.

- 실제 `env.*` 값
- RDS 호스트명
- DB 사용자명/비밀번호
- 운영 서버 IP
- 비공개 도메인
- 인증서 경로
- 관리자 계정 정보

필요하면 `<production-domain>`, `<DB_HOST>`, `<server-ip>`, `<secret>`처럼 placeholder로만 표기한다.
