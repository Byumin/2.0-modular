import path from 'node:path';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = 'http://localhost:5120';
const OUT_DIR = path.join('artifacts', 'screenshots');
await fs.mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);
await page.locator('#username').fill('admin');
await page.locator('#password').fill('admin1234');
await page.locator('button[type="submit"]').click();
await page.waitForURL('**/admin/workspace', { timeout: 15000 });
await page.waitForTimeout(1000);

await page.goto(`${BASE}/admin/create`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// 모달 열기
await page.locator('button', { hasText: '검사 생성' }).click();
await page.waitForTimeout(600);

// Step 2: PAT-2 체크
await page.locator('button', { hasText: '다음' }).click();
await page.waitForTimeout(400);
await page.locator('label', { hasText: 'PAT-2' }).click();
await page.waitForTimeout(400);

// Step 3, 4 이동
await page.locator('button', { hasText: '다음' }).click();
await page.waitForTimeout(400);
await page.locator('button', { hasText: '다음' }).click();
await page.waitForTimeout(800);

// 상태 1: 검사 접혀있음 (기본)
await page.screenshot({ path: path.join(OUT_DIR, 'scale-1-collapsed.png') });
console.log('1. 검사 접힌 상태 저장');

// PAT-2 펼치기 버튼 클릭
await page.locator('button', { hasText: '펼치기' }).first().click();
await page.waitForTimeout(600);

// 상태 2: 검사 펼쳐짐, 실시구간 접혀있음
await page.screenshot({ path: path.join(OUT_DIR, 'scale-2-cond-collapsed.png') });
console.log('2. 검사 펼침 (실시구간 접힘) 저장');

// 첫 번째 실시구간 펼치기 (조건 행의 button 클릭)
// ChevronRight + "만 0~2세 (관찰자: 기타)" 텍스트를 포함하는 버튼
const condBtn = page.locator('div.rounded.border.bg-muted\\/10').first().locator('button').first();
await condBtn.click();
await page.waitForTimeout(500);

// 상태 3: 첫 실시구간 펼침, 척도 트리 보임
await page.screenshot({ path: path.join(OUT_DIR, 'scale-3-cond-expanded.png') });
console.log('3. 실시구간 펼침 (척도 트리) 저장');

await browser.close();
