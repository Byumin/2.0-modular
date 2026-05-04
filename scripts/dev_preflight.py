#!/usr/bin/env python3
"""Prepare fixed local dev ports before `npm run dev`.

The app uses fixed ports during development:
- FastAPI: 8120
- Vite: 5120

If an old dev server is still listening on those ports, a new `npm run dev`
fails with "address already in use" and the browser keeps talking to stale
code. This script finds local listeners on those ports and terminates only
processes that look like this repository's dev servers.
"""

from __future__ import annotations

import argparse
import os
import signal
import subprocess
import sys
import time
from pathlib import Path


PORTS = (8120, 5120)
REPO_ROOT = Path(__file__).resolve().parents[1]
DEV_MARKERS = (
    "uvicorn app.main:app",
    "npm run dev",
    "npm run dev:api",
    "npm run dev:frontend",
    "vite",
    "concurrently",
)


def _socket_inodes_for_ports(ports: set[int]) -> set[str]:
    inodes: set[str] = set()
    for table in ("/proc/net/tcp", "/proc/net/tcp6"):
        try:
            lines = Path(table).read_text(encoding="utf-8").splitlines()[1:]
        except OSError:
            continue
        for line in lines:
            parts = line.split()
            if len(parts) < 10:
                continue
            local_address = parts[1]
            state = parts[3]
            inode = parts[9]
            if state != "0A":
                continue
            try:
                port = int(local_address.rsplit(":", 1)[1], 16)
            except (IndexError, ValueError):
                continue
            if port in ports:
                inodes.add(inode)
    return inodes


def _process_socket_inodes(pid: str) -> set[str]:
    fd_dir = Path("/proc") / pid / "fd"
    inodes: set[str] = set()
    try:
        entries = list(fd_dir.iterdir())
    except OSError:
        return inodes
    for fd in entries:
        try:
            target = os.readlink(fd)
        except OSError:
            continue
        if target.startswith("socket:[") and target.endswith("]"):
            inodes.add(target.removeprefix("socket:[").removesuffix("]"))
    return inodes


def _cmdline(pid: str) -> str:
    try:
        raw = (Path("/proc") / pid / "cmdline").read_bytes()
    except OSError:
        return ""
    return raw.replace(b"\0", b" ").decode(errors="replace").strip()


def _cwd(pid: str) -> Path | None:
    try:
        return Path(os.readlink(Path("/proc") / pid / "cwd")).resolve()
    except OSError:
        return None


def _is_under_repo(path: Path | None) -> bool:
    if path is None:
        return False
    try:
        path.relative_to(REPO_ROOT)
        return True
    except ValueError:
        return False


def _is_dev_process(pid: str) -> bool:
    command = _cmdline(pid)
    if not command:
        return False
    if not any(marker in command for marker in DEV_MARKERS):
        return False
    return _is_under_repo(_cwd(pid)) or str(REPO_ROOT) in command


def _listener_pids(ports: set[int]) -> list[int]:
    socket_inodes = _socket_inodes_for_ports(ports)
    if not socket_inodes:
        return []

    pids: list[int] = []
    for pid in (item for item in os.listdir("/proc") if item.isdigit()):
        if not socket_inodes.intersection(_process_socket_inodes(pid)):
            continue
        if _is_dev_process(pid):
            pids.append(int(pid))
    return sorted(set(pids))


def _terminate(pids: list[int], *, dry_run: bool) -> None:
    for pid in pids:
        command = _cmdline(str(pid))
        if dry_run:
            print(f"[dev-preflight] would terminate pid={pid}: {command}")
            continue
        print(f"[dev-preflight] terminating stale dev server pid={pid}: {command}")
        try:
            os.kill(pid, signal.SIGTERM)
        except ProcessLookupError:
            pass

    if dry_run or not pids:
        return

    deadline = time.time() + 3
    remaining = set(pids)
    while remaining and time.time() < deadline:
        for pid in list(remaining):
            if not Path("/proc", str(pid)).exists():
                remaining.remove(pid)
        if remaining:
            time.sleep(0.1)

    for pid in sorted(remaining):
        print(f"[dev-preflight] force killing pid={pid}")
        try:
            os.kill(pid, signal.SIGKILL)
        except ProcessLookupError:
            pass


def _run(cmd: list[str]) -> None:
    subprocess.run(cmd, cwd=REPO_ROOT, check=False)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-clear-pycache", action="store_true")
    args = parser.parse_args()

    ports = set(PORTS)
    pids = _listener_pids(ports)
    if pids:
        _terminate(pids, dry_run=args.dry_run)
    else:
        print("[dev-preflight] no stale dev server found on ports 8120/5120")

    if not args.no_clear_pycache and not args.dry_run:
        _run([sys.executable, "-m", "compileall", "-q", "app"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
