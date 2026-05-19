import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:8012';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });

try {
  await page.goto(`${base}/admin`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('#admin_id', 'admin');
  await page.fill('#admin_pw', 'admin1234');
  await page.click('#adminLoginBtn');
  await page.waitForURL(/\/admin\/(workspace|create)/, { timeout: 60000 });

  await page.goto(`${base}/admin/create`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#toggleCreateFormBtn', { timeout: 60000 });
  await page.click('#toggleCreateFormBtn');
  await page.waitForSelector('#createTestModal:not(.hidden)', { timeout: 60000 });

  const goldenTestCheckbox = page.locator('#testCheckboxList input[name="selected_test_id"][value="GOLDEN"]');
  const goldenExists = await goldenTestCheckbox.count();
  if (!goldenExists) {
    throw new Error('GOLDEN test checkbox not found');
  }

  await goldenTestCheckbox.check();
  await page.waitForSelector('#scaleList [data-role="scale-test-group"][data-test-id="GOLDEN"]', { timeout: 60000 });

  const group = page.locator('#scaleList [data-role="scale-test-group"][data-test-id="GOLDEN"]');
  const parent = group.locator('input[data-role="select_test_scale_all"]');
  const childrenWrap = group.locator('[data-role="scale-test-children"]');
  const childChecks = group.locator('input[name="selected_scale_key"]');
  const toggleIcon = group.locator('[data-role="toggle_test_scale_children"]');

  const parentCheckedBefore = await parent.isChecked();
  const childCount = await childChecks.count();
  let checkedChildCountBefore = 0;
  let disabledChildCountBefore = 0;
  for (let i = 0; i < childCount; i += 1) {
    if (await childChecks.nth(i).isChecked()) checkedChildCountBefore += 1;
    if (await childChecks.nth(i).isDisabled()) disabledChildCountBefore += 1;
  }
  const childrenHiddenBefore = await childrenWrap.evaluate((el) => el.classList.contains('hidden'));

  await parent.uncheck();
  await page.waitForTimeout(150);

  const parentCheckedAfter = await parent.isChecked();
  let enabledChildCountAfter = 0;
  for (let i = 0; i < childCount; i += 1) {
    if (!(await childChecks.nth(i).isDisabled())) enabledChildCountAfter += 1;
  }
  const childrenHiddenAfter = await childrenWrap.evaluate((el) => el.classList.contains('hidden'));
  const iconAfterUncheck = await toggleIcon.innerText();

  await toggleIcon.click();
  await page.waitForTimeout(120);
  const childrenHiddenAfterIconClick1 = await childrenWrap.evaluate((el) => el.classList.contains('hidden'));
  const iconAfterClick1 = await toggleIcon.innerText();

  await toggleIcon.click();
  await page.waitForTimeout(120);
  const childrenHiddenAfterIconClick2 = await childrenWrap.evaluate((el) => el.classList.contains('hidden'));
  const iconAfterClick2 = await toggleIcon.innerText();

  console.log(JSON.stringify({
    parentCheckedBefore,
    childCount,
    checkedChildCountBefore,
    disabledChildCountBefore,
    childrenHiddenBefore,
    parentCheckedAfter,
    enabledChildCountAfter,
    childrenHiddenAfter,
    iconAfterUncheck,
    childrenHiddenAfterIconClick1,
    iconAfterClick1,
    childrenHiddenAfterIconClick2,
    iconAfterClick2,
    behavesAsRequested: parentCheckedBefore
      && childCount > 0
      && checkedChildCountBefore === childCount
      && disabledChildCountBefore === childCount
      && childrenHiddenBefore
      && !parentCheckedAfter
      && enabledChildCountAfter === childCount
      && !childrenHiddenAfter
      && iconAfterUncheck === '▼'
      && childrenHiddenAfterIconClick1
      && iconAfterClick1 === '▲'
      && !childrenHiddenAfterIconClick2
      && iconAfterClick2 === '▼'
  }, null, 2));
} finally {
  await browser.close();
}
