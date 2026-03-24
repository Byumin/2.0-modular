import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:8012';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

try {
  await page.goto(`${base}/admin`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('#admin_id', 'admin');
  await page.fill('#admin_pw', 'admin1234');
  await page.click('#adminLoginBtn');
  await page.waitForURL(/\/admin\//, { timeout: 60000 });

  await page.goto(`${base}/admin/create`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#managedTestsList .row-item .target-col', { timeout: 60000 });

  const texts = await page.$$eval('#managedTestsList .row-item .target-col', (els) => els.map((el) => el.textContent?.trim() || ''));
  console.log(JSON.stringify({ texts }, null, 2));
} finally {
  await browser.close();
}
