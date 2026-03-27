import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:8012';
const pages = [
  { name: 'admin-workspace', url: `${base}/admin/workspace` },
  { name: 'admin-create', url: `${base}/admin/create` },
  { name: 'admin-clients', url: `${base}/admin/clients` },
];
const runs = [
  { tag: 'desktop', viewport: { width: 1680, height: 1050 } },
  { tag: 'mobile', viewport: { width: 390, height: 844 } },
];

const issues = [];

for (const run of runs) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: run.viewport });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (err) => pageErrors.push(String(err.message || err)));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') {
      return;
    }
    const text = msg.text();
    if (text.includes('401 (Unauthorized)')) {
      return;
    }
    consoleErrors.push(text);
  });

  await page.goto(`${base}/admin`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('#admin_id', 'admin');
  await page.fill('#admin_pw', 'admin1234');
  await page.click('#adminLoginBtn');
  await page.waitForURL(/\/admin\//, { timeout: 60000 });

  for (const item of pages) {
    await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    if (item.name === 'admin-create') {
      await page.click('#toggleCreateFormBtn');
      await page.waitForSelector('#createTestModal:not(.hidden)', { timeout: 60000 });
    }
    if (item.name === 'admin-clients') {
      await page.click('#openClientCreateBtn');
      await page.waitForSelector('#clientFormModal:not(.hidden)', { timeout: 60000 });
    }

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        hasHorizontalOverflow: doc.scrollWidth - doc.clientWidth > 1,
      };
    });
    if (metrics.hasHorizontalOverflow) {
      issues.push(`${run.tag}:${item.name}: horizontal overflow (${metrics.scrollWidth} > ${metrics.clientWidth})`);
    }
  }

  await page.goto(`${base}/admin/clients`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const clientDetailLink = page.locator('#clientList a[href^="/admin/client-detail?id="]').first();
  if (await clientDetailLink.count()) {
    const href = await clientDetailLink.getAttribute('href');
    const clientDetailUrl = new URL(href || '', base);
    const clientId = Number(clientDetailUrl.searchParams.get('id'));

    await clientDetailLink.click();
    await page.waitForSelector('#clientDetailForm', { timeout: 60000 });

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        hasHorizontalOverflow: doc.scrollWidth - doc.clientWidth > 1,
      };
    });
    if (metrics.hasHorizontalOverflow) {
      issues.push(`${run.tag}:admin-client-detail: horizontal overflow (${metrics.scrollWidth} > ${metrics.clientWidth})`);
    }

    if (Number.isFinite(clientId) && clientId > 0) {
      await page.goto(`${base}/admin/client-result?id=${clientId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('#clientResultScaleTree', { timeout: 60000 });
      const resultMetrics = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          hasHorizontalOverflow: doc.scrollWidth - doc.clientWidth > 1,
        };
      });
      if (resultMetrics.hasHorizontalOverflow) {
        issues.push(`${run.tag}:admin-client-result: horizontal overflow (${resultMetrics.scrollWidth} > ${resultMetrics.clientWidth})`);
      }
    }
  }

  await page.goto(`${base}/admin/create`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const testDetailLink = page.locator('#managedTestsList a[href^="/admin/test-detail?id="]').first();
  if (await testDetailLink.count()) {
    await testDetailLink.click();
    await page.waitForSelector('#testDetailForm', { timeout: 60000 });

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        hasHorizontalOverflow: doc.scrollWidth - doc.clientWidth > 1,
      };
    });
    if (metrics.hasHorizontalOverflow) {
      issues.push(`${run.tag}:admin-test-detail: horizontal overflow (${metrics.scrollWidth} > ${metrics.clientWidth})`);
    }
  }

  for (const err of pageErrors) {
    issues.push(`${run.tag}:pageerror:${err}`);
  }
  for (const err of consoleErrors) {
    issues.push(`${run.tag}:consoleerror:${err}`);
  }

  await browser.close();
}

if (issues.length) {
  console.log(JSON.stringify({ ok: false, issues }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, issues: [] }, null, 2));
