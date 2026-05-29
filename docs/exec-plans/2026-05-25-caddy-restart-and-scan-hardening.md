# Caddy Restart and Scan Hardening

## Request Summary
사용자가 EC2 자동 기동 검증 후 보완점으로 제시한 1번(Caddy 자동 재시작)과 2번(외부 스캔/잡요청 대응)을 적용해 달라고 요청했다.

## Goal
- Caddy가 부팅 시뿐 아니라 런타임 장애 후에도 자동 복구되도록 systemd override를 적용한다.
- 운영 도메인 Caddy 설정에 기본 보안 헤더와 흔한 스캔 경로 차단을 추가한다.
- 변경 내용을 저장소에 추적 가능한 배포 설정 파일로 남기고 실제 EC2 `/etc` 설정에 반영한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] `docs/exec-plans/README.md` 확인
- [x] `docs/doc-governance.md` 확인
- [x] 현재 Git 상태 확인

## Initial Hypothesis
- Caddy 패키지 기본 unit은 현재 `Restart=no`이므로 drop-in override로 `Restart=always`, `RestartSec=5s`를 추가하면 충분하다.
- Caddy 표준 모듈만 사용해야 하므로 별도 rate limit 플러그인 없이 `header`, `handle`, `path` matcher, `respond`로 우선 방어한다.
- WordPress/PHP/env/git 관련 탐색 요청은 이 앱의 정상 라우트가 아니므로 404로 즉시 응답해도 운영 기능에 영향이 없다.

## Plan
1. 현재 Caddy 설정과 systemd 상태를 다시 확인한다.
2. 저장소에 `deploy/caddy/Caddyfile`과 `deploy/systemd/caddy.service.d/override.conf`를 추가한다.
3. 실제 EC2 설정 경로(`/etc/caddy/Caddyfile`, `/etc/systemd/system/caddy.service.d/override.conf`)에 배치한다.
4. `caddy validate`, `systemctl daemon-reload`, `systemctl restart caddy`를 실행한다.
5. Caddy `Restart` 정책, 서비스 상태, 운영 `/health`, 차단 경로 응답을 검증한다.

## Changes During Work
- Added `deploy/caddy/Caddyfile` as the repository-tracked Caddy config for `inpsyt-norm.com` and `www.inpsyt-norm.com`.
- Added security headers in Caddy: HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- Added Caddy-level 404 handling for common scan paths such as WordPress/PHP/env/git probes.
- Added `deploy/systemd/caddy.service.d/override.conf` with `Restart=always` and `RestartSec=5s`.
- Found `insight-backend.service` had `StartLimitIntervalSec` and `StartLimitBurst` in `[Service]`, which systemd ignored. Moved them to `[Unit]` while applying the operational service updates.

## Result
- Caddy now has a systemd drop-in at `/etc/systemd/system/caddy.service.d/override.conf`.
- `systemctl show caddy` reports `Restart=always`, `RestartUSec=5s`, `UnitFileState=enabled`, and `ActiveState=active`.
- Caddy now returns security headers for production responses.
- Common scan paths such as `/wp-login.php`, `/wp-admin/install.php`, `/.env`, and `/.git/config` are handled at Caddy with 404.
- `insight-backend.service` start-limit settings now live in `[Unit]`, and `systemctl show insight-backend` reports `StartLimitIntervalUSec=1min` and `StartLimitBurst=10`.

## Verification
- `caddy validate --config deploy/caddy/Caddyfile`: passed.
- `sudo caddy validate --config /etc/caddy/Caddyfile`: passed.
- `sudo systemctl daemon-reload`: passed.
- `sudo systemctl restart caddy`: passed.
- `sudo systemctl reload caddy` after formatting cleanup: passed.
- `systemctl show caddy -p UnitFileState -p ActiveState -p SubState -p Restart -p RestartUSec -p DropInPaths`: `enabled`, `active`, `running`, `Restart=always`, `RestartUSec=5s`, drop-in path present.
- `systemd-analyze verify /etc/systemd/system/insight-backend.service`: no warning for this unit. Existing unrelated `xfs_scrub` warnings were printed by systemd.
- `systemd-analyze verify caddy.service`: no warning for Caddy. Existing unrelated `xfs_scrub` warnings were printed by systemd.
- `systemctl show insight-backend -p UnitFileState -p ActiveState -p SubState -p Restart -p RestartUSec -p StartLimitBurst -p StartLimitIntervalUSec`: `enabled`, `active`, `running`, `Restart=always`, `RestartUSec=5s`, `StartLimitIntervalUSec=1min`, `StartLimitBurst=10`.
- `curl -fsS -i https://inpsyt-norm.com/health`: 200 OK with security headers and PostgreSQL health payload.
- `curl -sS -i https://inpsyt-norm.com/wp-admin/install.php?step=1`: 404 at Caddy with security headers.
- `curl -sS -i https://inpsyt-norm.com/wp-login.php`: 404 at Caddy with security headers.
- `curl -sS -i https://inpsyt-norm.com/.env`: 404 at Caddy with security headers.
- `curl -sS -i https://inpsyt-norm.com/.git/config`: 404 at Caddy with security headers.
- `systemctl --failed --no-pager`: 0 failed units.

## Retrospective
- Plan Problem: 없음.
- Execution Judgment Problem: 없음.
- Residual Risk: 별도 Caddy rate-limit 플러그인은 설치하지 않았다. 현재 보완은 stock Caddy 기능으로 가능한 보안 헤더와 스캔 경로 차단이다.
