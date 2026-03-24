import { chromium } from 'playwright';

const url = process.argv[2] || 'http://127.0.0.1:8000/assessment/custom/1Wubl4rkw8LYzdFNTSPm-bEXjwHYVeZB';
const keyPressCount = Number(process.argv[3] || '8');

function parseAnswered(text) {
  const m = String(text || '').match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) return { answered: NaN, total: NaN };
  return { answered: Number(m[1]), total: Number(m[2]) };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#required_name', { timeout: 60000 });

  await page.fill('#required_name', '부유민');

  const male = page.locator('input[name="required_gender"][value="male"]');
  if (await male.count()) await male.first().check({ force: true });

  const birth = page.locator('#required_birth_day');
  if (await birth.count()) await birth.fill('1993-06-09');

  const school = page.locator('#required_school_age');
  if (await school.count()) {
    const options = school.locator('option');
    const optionCount = await options.count();
    let picked = false;
    for (let i = 0; i < optionCount; i += 1) {
      const val = await options.nth(i).getAttribute('value');
      if (val && String(val).trim()) {
        await school.selectOption(String(val));
        picked = true;
        break;
      }
    }
    if (!picked && optionCount > 1) {
      const val = await options.nth(1).getAttribute('value');
      if (val) await school.selectOption(String(val));
    }
  }

  // Additional required fields if present
  const requiredExtras = page.locator('#extraProfileFieldsWrap [required]');
  const requiredExtraCount = await requiredExtras.count();
  for (let i = 0; i < requiredExtraCount; i += 1) {
    const el = requiredExtras.nth(i);
    const tag = await el.evaluate((node) => node.tagName.toLowerCase());
    const type = await el.getAttribute('type');
    if (tag === 'input' && type === 'date') {
      await el.fill('2000-01-01');
    } else if (tag === 'input') {
      await el.fill('테스트');
    } else if (tag === 'select') {
      const opts = el.locator('option');
      const cnt = await opts.count();
      for (let j = 0; j < cnt; j += 1) {
        const val = await opts.nth(j).getAttribute('value');
        if (val && String(val).trim()) {
          await el.selectOption(String(val));
          break;
        }
      }
    }
  }

  await page.click('#goQuestionsBtn');
  await page.waitForSelector('#questionStep:not(.hidden)', { timeout: 60000 });
  await page.waitForSelector('.assessment-option-card', { timeout: 60000 });

  // Focus first option card in question area.
  await page.locator('.assessment-option-card').first().click();

  const progressText0 = await page.locator('#assessmentProgressText').innerText();
  let prev = parseAnswered(progressText0).answered;
  const deltas = [];

  for (let i = 0; i < keyPressCount; i += 1) {
    await page.keyboard.press('1');
    await page.waitForTimeout(180);
    const p = await page.locator('#assessmentProgressText').innerText();
    const { answered } = parseAnswered(p);
    deltas.push({ step: i + 1, answered, delta: answered - prev, progress: p });
    prev = answered;
  }

  const missingText = await page.locator('#assessmentMissingCount').innerText();
  console.log(JSON.stringify({ url, startProgress: progressText0, missingText, deltas }, null, 2));
} finally {
  await browser.close();
}
