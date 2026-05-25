# Execution Plan

## Task Title
- EC2 FastAPI를 systemd 서비스로 등록 (I-1)

## Request Summary
- 운영 준비 To-Do의 High 항목 I-1을 해결한다.
- 현재 EC2에서 FastAPI가 수동 실행 상태라 재부팅 시 자동 복구되지 않는다.
- 이 작업의 코드 산출물은 레포에 unit 파일 템플릿과 적용 runbook을 추가하는 것까지다.
- 실제 EC2 적용은 사용자가 SSH로 접속해 runbook을 따라 수동 수행한다 (자격증명 보안).

## Goal
- 레포에 `deploy/systemd/insight-backend.service` unit 파일 템플릿이 존재한다.
- 레포에 `docs/operations/systemd-setup.md`(또는 기존 운영 문서에 섹션 추가) 적용 절차가 정리된다.
- 사용자가 runbook 한 번 따라 하면 `systemctl enable --now insight-backend` 까지 완료된다.
- 적용 후 `sudo reboot` → 약 30초 내 `https://<도메인>/health` 200 응답을 검증할 수 있다.
- `docs/todo-production-readiness.md`의 I-1을 resolved로 갱신 (사용자 적용 확인 후).

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: 해당 없음 (인프라 설정만)
  - DB: 영향 없음
  - UI/디자인: 해당 없음
  - 문서 체계: `docs/runtime-run-modes.md` (운영 도메인 모드 섹션), `docs/todo-production-readiness.md`
- [x] 운영 DB 영향: 없음
- [x] 검증 방법: EC2 적용 후 사용자가 재부팅 테스트 + `systemctl status` 확인

## Initial Hypothesis
- FastAPI를 `APP_ENV=ec2.prod` + `uvicorn app.main:app --host 127.0.0.1 --port 8120`으로 실행하는 unit 파일이면 충분하다.
- Caddy는 이미 systemd로 떠 있으므로(`runtime-run-modes.md` 언급), insight-backend만 추가하면 된다.
- `.env.ec2.prod`는 `EnvironmentFile=` 디렉티브로 로드한다.

## Initial Plan
1. `deploy/systemd/insight-backend.service` 작성:
   - `[Unit] After=network.target`
   - `[Service] WorkingDirectory=<repo path>` `EnvironmentFile=<repo>/.env.ec2.prod` `ExecStart=<repo>/.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8120` `Restart=always` `RestartSec=5` `User=ubuntu`
   - `[Install] WantedBy=multi-user.target`
   - 경로/유저 placeholder는 주석으로 명시
2. `docs/operations/systemd-setup.md` 작성 (또는 `docs/runtime-run-modes.md` 운영 섹션에 추가):
   - EC2 SSH 접속 → 파일 복사 위치 (`/etc/systemd/system/insight-backend.service`)
   - `systemctl daemon-reload`
   - `systemctl enable --now insight-backend`
   - 상태 확인: `systemctl status insight-backend`, `journalctl -u insight-backend -f`
   - 재부팅 검증: `sudo reboot` 후 `curl https://<도메인>/health`
   - 배포 시 재시작: `sudo systemctl restart insight-backend`
3. 사용자에게 적용 완료 보고 요청 → 보고 받으면 todo 문서 갱신.

## Progress Updates
### Update 1
- Time: 2026-05-25
- Change: `deploy/systemd/insight-backend.service` 작성. `EnvironmentFile=env.ec2.prod`, `ExecStart=.venv/bin/python -m uvicorn ...`, `Restart=always`, `StartLimitBurst=10`.
- Reason: 재부팅 후 자동 복구 + 비정상 종료 시 자동 재시작 + 무한 재시작 폭주 방지.

### Update 2
- Time: 2026-05-25
- Change: `docs/operations/systemd-setup.md` 작성. 사전 조건·service 배치·등록·상태 확인·재부팅 검증·배포 시 재시작·트러블슈팅 6단계.
- Reason: 운영자가 SSH로 따라할 수 있는 한 번의 절차로 압축.

### Update 3
- Time: 2026-05-25
- Change: `docs/todo-production-readiness.md`의 I-1 상태를 "수동 uvicorn" → "systemd unit/runbook 작성 완료, EC2 적용은 운영자 수동 수행"으로 갱신. I-2(HTTPS)는 stale였던 표기를 done으로 정정.
- Reason: 문서와 실제 상태 일치.

### Update 4
- Time: 2026-05-25
- Change: 검증 중 unit 파일의 `EnvironmentFile=` 경로 오타 발견 — `env.ec2.prod` → `.env.ec2.prod`(선행 점 포함)으로 수정. runbook도 파일명에 점이 있다고 명시.
- Reason: 실제 운영 환경 파일명은 `.env.ec2.prod`(dotfile)이라 점이 없으면 systemd가 EnvironmentFile을 못 찾아 서비스가 부팅 실패한다. 이전 env-file-selection 작업 때와 동일 함정.

## Result
- 레포에 systemd unit 템플릿(`deploy/systemd/insight-backend.service`)과 적용 runbook(`docs/operations/systemd-setup.md`) 추가 완료.
- 운영자가 runbook 1~5단계를 따라 적용 → 재부팅 후 자동 복구 환경 완성.
- 적용 검증(재부팅 + curl /health 200)은 운영자가 EC2에서 직접 수행해야 한다.

## Verification
- Checked:
  - unit 파일 문법 (key=value 구조, [Unit]/[Service]/[Install] 섹션 완비)
  - runbook 절차의 명령어 일관성 (경로/유저/포트가 unit과 동일)
- Not checked:
  - 실제 EC2 적용·재부팅 테스트 (사용자 수행, 적용 후 결과 보고 받으면 todo 문서를 ✅ done으로 최종 갱신 예정)
  - `bcrypt` 의존성을 EC2에 반영 (runbook 1단계 `pip install -r requirements.txt`에 포함)

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 해당 없음

### Why
- 해당 없음

### Next Time
- 운영자가 적용 후 결과(재부팅 자동 복구 동작 여부)를 회신하면 todo 문서를 done으로 최종 마감

## Related Documents
- [Documentation Hub](../README.md)
- [docs/exec-plans/README.md](README.md)
- [docs/runtime-run-modes.md](../runtime-run-modes.md)
- [docs/todo-production-readiness.md](../todo-production-readiness.md)
- [AGENTS.md](../../AGENTS.md)
