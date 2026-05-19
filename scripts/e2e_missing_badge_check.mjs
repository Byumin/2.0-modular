import { chromium } from 'playwright';

const url = process.argv[2] || 'http://127.0.0.1:8012/assessment/custom/1Wubl4rkw8LYzdFNTSPm-bEXjwHYVeZB';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#required_name', { timeout: 60000 });

  await page.fill('#required_name', '부유민');
  const male = page.locator('input[name="required_gender"][value="male"]');
  if (await male.count()) {
    await male.first().check({ force: true });
  }
  const birth = page.locator('#required_birth_day');
  if (await birth.count()) {
    await birth.fill('1993-06-09');
  }
  const school = page.locator('#required_school_age');
  if (await school.count()) {
    const opts = school.locator('option');
    const cnt = await opts.count();
    for (let i = 0; i < cnt; i += 1) {
      const val = await opts.nth(i).getAttribute('value');
      if (val && String(val).trim()) {
        await school.selectOption(String(val));
        break;
      }
    }
  }

  await page.click('#goQuestionsBtn');
  await page.waitForSelector('#questionStep:not(.hidden)', { timeout: 60000 });

  const before = await page.locator('#assessmentPageLabel').innerText();
  await page.click('#questionNextBtn');
  await page.waitForTimeout(300);
  const afterNext = await page.locator('#assessmentPageLabel').innerText();

  await page.click('#assessmentMissingCount');
  await page.waitForTimeout(400);
  const afterMissingClick = await page.locator('#assessmentPageLabel').innerText();

  const missingCardId = await page.evaluate(() => {
    const el = document.querySelector('.assessment-question-card.is-missing, .assessment-matrix-row.is-missing');
    return el ? el.id : null;
  });

  console.log(JSON.stringify({
    url,
    before,
    afterNext,
    afterMissingClick,
    missingCardId,
    movedToFirstPage: before !== afterNext && before === afterMissingClick
  }, null, 2));
} finally {
  await browser.close();
}
