const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  // 로그인
  await page.goto('http://127.0.0.1:8120/admin', { waitUntil: 'networkidle' });
  await page.fill('input[placeholder*="아이디"]', 'admin');
  await page.fill('input[placeholder*="비밀번호"]', 'admin1234');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/workspace', { timeout: 8000 }).catch(() => {});

  // API 직접 확인
  const apiResp = await page.evaluate(async () => {
    const r = await fetch('/api/admin/report/48');
    const text = await r.text();
    return { status: r.status, body: text.substring(0, 500) };
  });
  console.log('API /api/admin/report/48:', JSON.stringify(apiResp));

  // 결과 페이지 직접 접근
  await page.goto('http://127.0.0.1:8120/admin/report/48', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/report48.png' });
  console.log('errors:', errors);
  
  // 페이지 root 내용
  const rootHTML = await page.$eval('#root', el => el.innerHTML.substring(0, 300));
  console.log('root HTML:', rootHTML);

  await browser.close();
})().catch(e => console.error('ERROR:', e.message));
