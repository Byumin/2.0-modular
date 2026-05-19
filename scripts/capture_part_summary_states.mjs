import path from 'node:path';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:8012';
const token = process.argv[3] || 'n2TDWsV4qZmHZUuDLpX0YHH86D2XDnpV';
const outDir = path.join('artifacts', 'screenshots');
const beforePath = path.join(outDir, 'custom-part-summary-before-profile.png');
const afterPath = path.join(outDir, 'custom-part-summary-after-profile.png');

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

try {
  await page.goto(`${base}/assessment/custom/${token}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#required_name', { timeout: 60000 });

  await page.screenshot({ path: beforePath, fullPage: true });

  await page.fill('#required_name', '부유민');
  const male = page.locator('input[name="required_gender"][value="male"]');
  if (await male.count()) await male.first().check({ force: true });
  const birth = page.locator('#required_birth_day');
  if (await birth.count()) await birth.fill('1993-06-09');
  const school = page.locator('#required_school_age');
  if (await school.count()) {
    const options = school.locator('option');
    const optionCount = await options.count();
    for (let i = 0; i < optionCount; i += 1) {
      const val = await options.nth(i).getAttribute('value');
      if (val && String(val).trim()) {
        await school.selectOption(String(val));
        break;
      }
    }
  }

  const requiredExtras = page.locator('#extraProfileFieldsWrap [required]');
  const requiredExtraCount = await requiredExtras.count();
  for (let i = 0; i < requiredExtraCount; i += 1) {
    const el = requiredExtras.nth(i);
    const tag = await el.evaluate((node) => node.tagName.toLowerCase());
    const type = await el.getAttribute('type');
    if (tag === 'input' && type === 'date') await el.fill('2000-01-01');
    else if (tag === 'input') await el.fill('테스트');
    else if (tag === 'select') {
      const opts = el.locator('option');
      const cnt = await opts.count();
      for (let j = 0; j < cnt; j += 1) {
        const val = await opts.nth(j).getAttribute('value');
        if (val && String(val).trim()) { await el.selectOption(String(val)); break; }
      }
    }
  }

  await page.click('#goQuestionsBtn');
  await page.waitForSelector('#questionStep:not(.hidden)', { timeout: 60000 });
  await page.waitForTimeout(300);

  const subText = await page.locator('#assessmentSub').innerText();
  await page.screenshot({ path: afterPath, fullPage: true });
  console.log(JSON.stringify({ beforePath, afterPath, subText }, null, 2));
} finally {
  await browser.close();
}
