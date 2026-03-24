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
