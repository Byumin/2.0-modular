import path from 'node:path';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = 'http://localhost:5120';
const OUT_DIR = path.join('artifacts', 'screenshots');
await fs.mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// 로그인
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);
await page.locator('#username').fill('admin');
await page.locator('#password').fill(process.env.ADMIN_TEST_PASSWORD || 'CHANGE_ME');
await page.locator('button[type="submit"]').click();
await page.waitForURL('**/admin/workspace', { timeout: 15000 });
await page.waitForTimeout(1000);

// 검사 관리 페이지
await page.goto(`${BASE}/admin/create`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// "검사 생성" 버튼 클릭
await page.locator('button', { hasText: '검사 생성' }).click();
await page.waitForTimeout(800);

// Step 1
await page.screenshot({ path: path.join(OUT_DIR, 'wizard-step1.png') });
console.log('Step 1 저장');

// Step 2
await page.locator('button', { hasText: '다음' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT_DIR, 'wizard-step2.png') });
console.log('Step 2 저장');

// Step 3
await page.locator('button', { hasText: '다음' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT_DIR, 'wizard-step3.png') });
console.log('Step 3 저장');

// Step 4
await page.locator('button', { hasText: '다음' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT_DIR, 'wizard-step4.png') });
console.log('Step 4 저장');

// Step 5
await page.locator('button', { hasText: '다음' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT_DIR, 'wizard-step5.png') });
console.log('Step 5 저장');

await browser.close();
console.log('완료');
