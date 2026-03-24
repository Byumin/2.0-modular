import path from 'node:path';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:8012';
const outDir = path.join('artifacts', 'screenshots');
const outExpanded = path.join(outDir, 'admin-create-arrow-expanded.png');
const outCollapsed = path.join(outDir, 'admin-create-arrow-collapsed.png');

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1700, height: 1100 } });

try {
  await page.goto(`${base}/admin`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('#admin_id', 'admin');
  await page.fill('#admin_pw', 'admin1234');
  await page.click('#adminLoginBtn');
  await page.waitForURL(/\/admin\//, { timeout: 60000 });

  await page.goto(`${base}/admin/create`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.click('#toggleCreateFormBtn');
  await page.waitForSelector('#createTestModal:not(.hidden)', { timeout: 60000 });

  const goldenCheckbox = page.locator('#testCheckboxList input[name="selected_test_id"][value="GOLDEN"]');
  await goldenCheckbox.check();
  const group = page.locator('#scaleList [data-role="scale-test-group"][data-test-id="GOLDEN"]');
  await group.waitFor({ timeout: 60000 });

  const parent = group.locator('input[data-role="select_test_scale_all"]');
  await parent.uncheck();
  await page.waitForTimeout(200);
  await page.screenshot({ path: outExpanded, fullPage: true });

  const icon = group.locator('[data-role="toggle_test_scale_children"]');
  await icon.click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: outCollapsed, fullPage: true });

  const hiddenAfterClick = await group.locator('[data-role="scale-test-children"]').evaluate((el) => el.classList.contains('hidden'));
  console.log(JSON.stringify({ outExpanded, outCollapsed, hiddenAfterClick }, null, 2));
} finally {
  await browser.close();
}
