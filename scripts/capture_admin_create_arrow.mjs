import path from 'node:path';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:8012';
const outDir = path.join('artifacts', 'screenshots');
const outPath = path.join(outDir, 'admin-create-arrow-check.png');

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1700, height: 1100 } });

try {
  await page.goto(`${base}/admin`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('#admin_id', 'admin');
  await page.fill('#admin_pw', 'admin1234');
  await page.click('#adminLoginBtn');
  await page.waitForURL(/\/admin\/(workspace|create)/, { timeout: 60000 });

  await page.goto(`${base}/admin/create`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.click('#toggleCreateFormBtn');
  await page.waitForSelector('#createTestModal:not(.hidden)', { timeout: 60000 });

  const goldenCheckbox = page.locator('#testCheckboxList input[name="selected_test_id"][value="GOLDEN"]');
  if (await goldenCheckbox.count()) {
    await goldenCheckbox.check();
    await page.waitForSelector('#scaleList [data-role="scale-test-group"][data-test-id="GOLDEN"]', { timeout: 60000 });
  }

  await page.screenshot({ path: outPath, fullPage: true });
  console.log(outPath);
} finally {
  await browser.close();
}
