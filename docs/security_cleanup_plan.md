# Security Cleanup Plan

## Goal

GitHub branches must not expose files or text that can reveal production server topology, connection routes, local databases, credentials, generated artifacts, or local tool state.

## Scope

Apply cleanup to every local and remote branch currently present in this repository.

Target categories:

- Local database files: `*.db`, `*.db.bak`, `*.sqlite`, `*.sqlite3`, dumps, and backups
- Environment files: `.env`, `.env.*`, `env.*`, local/prod env variants
- Server/deploy files: `deploy/`, Caddy files, systemd unit files, server runbooks, operational execution plans
- SSH/key material: `*.pem`, `*.key`, `*.p8`, `*.p12`, `*.pfx`
- Local assistant/tooling state: `.claude/`, `claude/`
- Generated artifacts and captures: `artifacts/`
- Dependency/build output: `node_modules/`, `frontend/node_modules/`, `frontend/dist/`
- Large external reference dumps: `docs/design/reference/`

## Execution

1. Harden `.gitignore` so new local copies of the target categories remain ignored.
2. For each branch, remove target files from Git tracking with `git rm --cached` semantics while leaving local files alone where possible.
3. Commit cleanup changes on each branch that has tracked target files.
4. Push the cleanup commits to their matching remote branches.
5. Re-scan all branch tips to verify no target files remain tracked.

## Important Limit

Cleanup commits remove files from branch tips, but old commits can still contain the removed content. Full history removal requires a separate history rewrite and force-push process, followed by credential rotation.
