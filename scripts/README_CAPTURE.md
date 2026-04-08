# Screenshot Capture Script

This project keeps UI capture tooling separate from app logic.

## Script

- `scripts/capture_screenshot.mjs`

## Prerequisite

- Install Playwright:
  - `npm i -D playwright`

## Usage

- Basic:
  - `node scripts/capture_screenshot.mjs --url http://127.0.0.1:8000/assessment/custom/<token>`

- Custom output path:
  - `node scripts/capture_screenshot.mjs --url http://127.0.0.1:8000/admin/create --out artifacts/screenshots/admin-create.png`

- Wait for a selector before capture:
  - `node scripts/capture_screenshot.mjs --url http://127.0.0.1:8000/admin/create --selector #createTestForm`

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/design/design-system.md](/mnt/c/Users/user/workspace/2.0-modular/docs/design/design-system.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [docs/features/assessment-link-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/assessment-link-flow.md)
