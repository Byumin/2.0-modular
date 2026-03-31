#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.argv[2] || "http://127.0.0.1:8000";
const clientId = process.argv[3] || "1";
const outArg = process.argv[4] || "artifacts/screenshots/client-detail-after-login.png";
const outPath = path.resolve(process.cwd(), outArg);

fs.mkdirSync(path.dirname(outPath), { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle", timeout: 60000 });
  await page.fill("#admin_id", "admin");
  await page.fill("#admin_pw", "admin1234");
  await page.click("#adminLoginBtn");
  await page.waitForURL("**/admin/workspace", { timeout: 30000 });
  await page.goto(`${baseUrl}/admin/client-detail?id=${encodeURIComponent(clientId)}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`Saved screenshot: ${outPath}`);
} finally {
  await browser.close();
}
