# Git Security Rules

## Rule

Before every commit and push, run the security guard.

```bash
npm run security:check
```

If there are staged changes, this checks the staged file paths and staged content. If there are no staged changes, it checks `HEAD`.

To check a specific branch or commit:

```bash
npm run security:check -- --ref origin/main
npm run security:check -- --ref origin/ec2-production-snapshot
```

To check every local and remote branch tip:

```bash
npm run security:check -- --all-refs
```

## Never Commit

Never commit these categories:

- Local DBs and DB backups: `*.db`, `*.db.bak`, `*.sqlite`, `*.sqlite3`, `*.dump`, `*.backup`
- Runtime env files: `.env`, `.env.*`, `env.*`, `env.local.*`, `env.ec2.*`
- Deploy/server topology files: `deploy/`, `Caddyfile`, systemd units, server runbooks
- SSH/key material: `*.pem`, `*.key`, `*.p8`, `*.p12`, `*.pfx`
- Local assistant/tooling state: `.claude/`, `claude/`
- Generated artifacts: `artifacts/`
- Frontend generated artifacts: `frontend/artifacts/`
- Dependency/build output: `node_modules/`, `frontend/node_modules/`, `frontend/dist/`
- External reference dumps: `docs/design/reference/`

## Allowed

Code may reference environment variable names, such as `DATABASE_URL`, `DB_HOST`, or `DB_PASSWORD`, when the value is read from the environment.

Do not include actual values, hostnames, IPs, SSH tunnel commands with real targets, production domains, RDS endpoints, passwords, tokens, or local DB snapshots. Placeholder examples such as `<RDS_ENDPOINT>` and `<EC2_IP>` are allowed.

## Cleanup If Blocked

If the guard blocks a commit:

1. Remove the file from staging:

   ```bash
   git restore --staged <path>
   ```

2. If it was already tracked, stop tracking it while keeping the local file:

   ```bash
   git rm --cached <path>
   ```

3. Add or adjust `.gitignore` if the category is missing.
4. Run `npm run security:check` again.

## History Note

Removing a file from the branch tip does not remove it from Git history. If an actual secret or database was pushed, rotate the secret and plan a separate history rewrite.
