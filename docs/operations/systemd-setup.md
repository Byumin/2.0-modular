# EC2 systemd 등록 가이드 (insight-backend)

## 문서 역할
EC2에서 FastAPI 백엔드를 systemd로 등록해 재부팅 후 자동 복구되게 만드는 절차를 정리한다. 운영 준비 To-Do의 **I-1** 항목 해결 가이드다.

- 독자: EC2 SSH 접속 가능한 운영 담당자
- 적용 대상: 운영 도메인 모드 (`APP_ENV=ec2.prod`)
- 관련 source-of-truth: [docs/runtime-run-modes.md](../runtime-run-modes.md)

## 사전 조건
- EC2에 레포가 `/home/ubuntu/workspace/2.0-modular` 경로로 클론되어 있다 (다른 경로면 service 파일을 함께 수정).
- `.venv/`가 생성되어 있고 `requirements.txt`가 설치되어 있다.
- `env.ec2.prod`이 레포 루트에 작성되어 있다 (RDS 접속 정보 포함). 본 저장소 컨벤션은 선행 점 **없음** (`app/db/session.py`의 `_ENV_FILE_MAP`과 일치).
- 의존성에 `bcrypt`가 포함되어야 한다 (`pip install -r requirements.txt` 갱신 필요).

## 1. 의존성 갱신 (S-1 bcrypt 적용을 위해)
```bash
cd /home/ubuntu/workspace/2.0-modular
git pull
.venv/bin/pip install -r requirements.txt
```

## 2. service 파일 배치
레포의 `deploy/systemd/insight-backend.service`를 systemd 디렉터리로 복사한다.

```bash
sudo cp /home/ubuntu/workspace/2.0-modular/deploy/systemd/insight-backend.service \
        /etc/systemd/system/insight-backend.service
```

레포 경로 또는 실행 유저가 다르면 복사 후 직접 수정한다.

```bash
sudo vi /etc/systemd/system/insight-backend.service
# WorkingDirectory, EnvironmentFile, ExecStart, User/Group를 환경에 맞게 변경
```

## 3. systemd 등록·시작
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now insight-backend
```

`enable`은 부팅 시 자동 시작 등록, `--now`는 즉시 시작이다.

## 4. 상태 확인
```bash
sudo systemctl status insight-backend
```
- `Active: active (running)`이 나와야 한다.

로그 실시간 확인:
```bash
sudo journalctl -u insight-backend -f
```

`Application startup complete.` 메시지가 보이면 정상이다.

엔드포인트 확인:
```bash
curl -fsS https://<운영-도메인>/health
```
`200 OK` 응답이 나와야 한다.

## 5. 재부팅 후 자동 복구 검증
실제 운영 적용 직후 한 번 확인한다.

```bash
sudo reboot
# 약 30~60초 대기 후 SSH 재접속
ssh ubuntu@<server-ip>
sudo systemctl status insight-backend     # active (running) 이어야 함
curl -fsS https://<운영-도메인>/health    # 200 OK
```

## 6. 배포 시 재시작 절차
프런트 빌드/소스 갱신 후:
```bash
cd /home/ubuntu/workspace/2.0-modular
git pull
.venv/bin/pip install -r requirements.txt
npm --prefix frontend ci --omit=dev    # 환경에 따라 ci/install 선택
npm run build:frontend
sudo systemctl restart insight-backend
sudo systemctl status insight-backend
```

## 트러블슈팅
- `Active: failed (Result: exit-code)`: `journalctl -u insight-backend -n 100`으로 로그 확인. 대부분 `env.ec2.prod` 누락·경로 오타·`.venv` 없음.
- 짧은 시간에 반복 실패하면 `StartLimitBurst=10` 초과로 systemd가 더 이상 재시작하지 않는다. 원인 수정 후 `sudo systemctl reset-failed insight-backend && sudo systemctl start insight-backend`.
- Caddy(reverse proxy)는 별도 서비스로 떠 있어야 한다 (`systemctl status caddy`). insight-backend는 `127.0.0.1:8120`만 바인딩한다.

## 관련 문서
- [docs/runtime-run-modes.md](../runtime-run-modes.md) — 서버 실행 모드 source-of-truth
- [docs/todo-production-readiness.md](../todo-production-readiness.md) — 운영 준비 To-Do (I-1 추적)
