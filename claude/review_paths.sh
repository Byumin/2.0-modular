#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI_PYTHON="${CLAUDE_CLI_PYTHON:-python3}"

exec "$CLI_PYTHON" "$ROOT/claude/review_paths.py" "$@"
