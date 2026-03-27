import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:8012';
const outDir = path.join('artifacts', 'screenshots');
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1680, height: 1050 } });

try {
  await page.goto(`${base}/admin`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('#admin_id', 'admin');
  await page.fill('#admin_pw', 'admin1234');
  await page.click('#adminLoginBtn');
  await page.waitForURL(/\/admin\//, { timeout: 60000 });

  const targets = [
    { name: 'admin-workspace', url: `${base}/admin/workspace` },
    { name: 'admin-create', url: `${base}/admin/create` },
    { name: 'admin-clients', url: `${base}/admin/clients` },
  ];

  for (const t of targets) {
    await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (t.name === 'admin-create') {
      await page.waitForSelector('#testManageFilterForm', { timeout: 60000 });
      await page.click('#toggleCreateFormBtn');
      await page.waitForSelector('#createTestModal:not(.hidden)', { timeout: 60000 });
      await page.screenshot({ path: path.join(outDir, `${t.name}-modal.png`), fullPage: true });
      await page.click('#closeCreateModalBtn');
      await page.waitForTimeout(100);
    }
    if (t.name === 'admin-clients') {
      await page.waitForSelector('#clientFilterForm', { timeout: 60000 });
      await page.click('#openClientCreateBtn');
      await page.waitForSelector('#clientFormModal:not(.hidden)', { timeout: 60000 });
      await page.screenshot({ path: path.join(outDir, `${t.name}-modal.png`), fullPage: true });
      await page.click('#clientCancelBtn');
      await page.waitForTimeout(100);
    }
    await page.screenshot({ path: path.join(outDir, `${t.name}.png`), fullPage: true });
  }

  const firstClientId = await page.evaluate(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const href = document.querySelector('#clientList a[href^="/admin/client-detail?id="]')?.getAttribute('href') || '';
    const url = new URL(href, window.location.origin);
    const id = Number(url.searchParams.get('id'));
    return Number.isFinite(id) ? id : null;
  });

  if (firstClientId) {
    await page.goto(`${base}/admin/client-detail?id=${firstClientId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#clientDetailForm', { timeout: 60000 });
    await page.screenshot({ path: path.join(outDir, 'admin-client-detail.png'), fullPage: true });

    await page.goto(`${base}/admin/client-result?id=${firstClientId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#clientResultScaleTree', { timeout: 60000 });
    await page.screenshot({ path: path.join(outDir, 'admin-client-result.png'), fullPage: true });
  }

  await page.goto(`${base}/admin/create`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  const testRows = await page.evaluate(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const rows = [...document.querySelectorAll('#managedTestsList [data-role="generate-link"]')];
    return rows.map((el) => Number(el.getAttribute('data-id'))).filter((x) => Number.isFinite(x));
  });

  if (testRows.length > 0) {
    const detailId = testRows[0];
    await page.goto(`${base}/admin/test-detail?id=${detailId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#testDetailForm', { timeout: 60000 });
    await page.screenshot({ path: path.join(outDir, 'admin-test-detail.png'), fullPage: true });
  }

  console.log(JSON.stringify({ ok: true, outDir }, null, 2));
} finally {
  await browser.close();
}
