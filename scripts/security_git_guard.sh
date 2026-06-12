#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/security_git_guard.sh
  scripts/security_git_guard.sh --ref <ref>
  scripts/security_git_guard.sh --all-refs

Default mode checks staged changes when any staged files exist; otherwise it checks HEAD.
USAGE
}

mode="auto"
ref="HEAD"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --ref)
      if [ "$#" -lt 2 ]; then
        echo "error: --ref requires a value" >&2
        exit 2
      fi
      mode="ref"
      ref="$2"
      shift 2
      ;;
    --all-refs)
      mode="all_refs"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

blocked_path_regex='(^|/)(\.env($|\.)|env\.|env$|deploy/|Caddyfile$|\.claude/|claude/|artifacts/|frontend/artifacts/|node_modules/|frontend/node_modules/|frontend/dist/|docs/design/reference/|docs/operations/|docs/exec-plans/|docs/server_operations\.md$)|(^|/).*\.(db|db\.bak|sqlite|sqlite3|dump|backup|pem|key|p8|p12|pfx)$|(^|/)(app\.db|modular\.db|modular\.db\.bak)$'
blocked_content_regex='(AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|aws_secret_access_key|AWS_SECRET_ACCESS_KEY[[:space:]]*=|BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY|SESSION_SECRET[[:space:]]*=|DB_PASSWORD[[:space:]]*=|DATABASE_URL[[:space:]]*=.*://.*:.*@|DEFAULT_ADMIN_PW[[:space:]]*=|[A-Za-z0-9.-]+\.rds\.amazonaws\.com)'

fail=0

check_paths_from_stdin() {
  local label="$1"
  local matches
  matches=$(grep -E "$blocked_path_regex" || true)
  if [ -n "$matches" ]; then
    echo "Blocked sensitive paths in $label:" >&2
    echo "$matches" >&2
    fail=1
  fi
}

check_ref() {
  local target="$1"
  local path_matches
  local content_matches

  path_matches=$(git ls-tree -r --name-only "$target" | grep -E "$blocked_path_regex" || true)
  if [ -n "$path_matches" ]; then
    echo "Blocked sensitive paths in $target:" >&2
    echo "$path_matches" >&2
    fail=1
  fi

  content_matches=$(git grep -Il -E "$blocked_content_regex" "$target" -- . \
    ':(exclude)node_modules/**' \
    ':(exclude)frontend/node_modules/**' \
    ':(exclude)static/vendor/**' \
    ':(exclude)docs/diagrams/*.svg' || true)
  if [ -n "$content_matches" ]; then
    echo "Blocked sensitive content patterns in $target:" >&2
    echo "$content_matches" >&2
    fail=1
  fi
}

check_staged() {
  local staged_files
  staged_files=$(git diff --cached --name-only --diff-filter=ACMRT)

  if [ -z "$staged_files" ]; then
    check_ref "HEAD"
    return
  fi

  printf '%s\n' "$staged_files" | check_paths_from_stdin "staged changes"

  local content_matches=""
  while IFS= read -r path; do
    if [ -z "$path" ]; then
      continue
    fi
    if git show ":$path" >/dev/null 2>&1; then
      if git show ":$path" | grep -Iq . 2>/dev/null && git show ":$path" | grep -E "$blocked_content_regex" >/dev/null 2>&1; then
        content_matches="${content_matches}${path}"$'\n'
      fi
    fi
  done <<EOF
$staged_files
EOF

  if [ -n "$content_matches" ]; then
    echo "Blocked sensitive content patterns in staged files:" >&2
    printf '%s' "$content_matches" >&2
    fail=1
  fi
}

case "$mode" in
  auto)
    check_staged
    ;;
  ref)
    check_ref "$ref"
    ;;
  all_refs)
    while IFS= read -r target; do
      check_ref "$target"
    done < <(git for-each-ref --format='%(refname:short)' refs/heads refs/remotes/origin | sort)
    ;;
esac

if [ "$fail" -ne 0 ]; then
  echo "security git guard failed" >&2
  exit 1
fi

echo "security git guard passed"
