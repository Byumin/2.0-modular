# 서버 실행 모드

## 문서 역할
이 문서는 서버를 어떤 목적으로 어떤 방식으로 띄우는지 정리하는 운영 가이드다.

- 독자: 로컬 개발, UI 검증, 빌드 확인, 운영 도메인 배포를 구분해야 하는 작업자
- 역할: 서버 실행 모드의 source-of-truth
- 구조 기준: [ARCHITECTURE.md](../ARCHITECTURE.md)
- DB 런타임 기준: [docs/database/runtime-db.md](database/runtime-db.md)

## 먼저 고를 것
서버를 띄우기 전에 목적부터 고른다.

| 목적 | 실행 모드 | 접속 주소 | DB | 사용할 때 |
| --- | --- | --- | --- | --- |
| 화면을 개발하면서 바로 확인 | 로컬 개발 모드 | `http://localhost:5120` | SQLite (`local.dev`) | 관리자/수검자 UI 작업 |
| API만 확인하거나 빌드된 화면 확인 | 로컬 통합 확인 모드 | `http://127.0.0.1:8120` | SQLite (`local.dev`) | API, 빌드 산출물, 라우팅 확인 |
| 로컬에서 운영 DB 테스트 | 로컬 RDS 연결 모드 | `http://127.0.0.1:8120` | RDS (`local.prod`, SSH 터널) | 운영 데이터 확인, 배포 전 검증 |
| 프런트 산출물만 만들기 | 프런트 빌드 | 접속 주소 없음 | — | 통합 확인 또는 운영 배포 전 |
| 실제 사용자가 접속 | 운영 도메인 모드 | 실제 운영 도메인 | RDS (`ec2.prod`) | 운영 서비스 |

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

이 명령은 내부적으로 아래 두 서버를 함께 띄운다.

- FastAPI: `http://127.0.0.1:8120`
- Vite: `http://localhost:5120`

브라우저에서는 보통 `http://localhost:5120`로 접속한다. 이 주소에서 React 소스 변경이 바로 반영된다.

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

이 모드에서 FastAPI는 `frontend/dist`가 있으면 다음 browser route를 직접 서빙한다.

- `/`
- `/admin/*`
- `/assessment/custom/{token}`
- `/report/{submissionId}`
- `/admin/report/{submissionId}`

주의할 점은 React 소스가 바로 반영되지 않는다는 것이다. 이 모드는 현재 소스 파일이 아니라 마지막으로 생성된 `frontend/dist`를 본다. React 변경을 이 주소에서 확인하려면 먼저 프런트를 다시 빌드한다.

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
