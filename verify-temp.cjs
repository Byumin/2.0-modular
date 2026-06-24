const { chromium } = require('playwright');
const fs = require('fs');
const SCDIR = '/tmp/verify-screenshots';

const TOKEN = 'Gl2LASqVIs9NoOFZQKACPeAD8CHHFe5r';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,900']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(20000);
  try {
    // 설정 단계 (이전과 동일)
    await page.goto(`http://127.0.0.1:8120/assessment/custom/${TOKEN}`);
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="checkbox"]').first().check();
    await page.locator('button:has-text("검사 실시하기")').click();
    await page.waitForTimeout(800);
    for (const inp of await page.locator('input[placeholder*="이름"]').all()) await inp.fill('홍길동');
    for (const inp of await page.locator('input[type="date"]').all()) await inp.fill('1990-03-15');
    for (const lbl of await page.locator('label').filter({ hasText: '남' }).all()) await lbl.click();
    await page.locator('label').filter({ hasText: '어머니' }).first().click();
    await page.locator('button:has-text("시작하기")').click();
    await page.waitForTimeout(2000);
    await page.locator('button:has-text("검사 시작하기")').click();
    await page.waitForTimeout(2000);

    // --- 검증 3: 일부 응답 후 클릭 → 첫 미응답으로 이동 반복 ---
    // 1번 문항 응답 (그렇다 = 4번)
    await page.locator('label.assessment-option-card, label[class*="option"]').nth(3).click();
    await page.waitForTimeout(300);
    console.log('✅ 1번 문항 응답');

    // 제출 버튼 클릭
    const submitBtn = page.locator('button').filter({ hasText: /다음 세션 안내|제출하기/ }).last();
    await submitBtn.click({ force: true });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCDIR}/10-after-partial-answer.png` });

    const redMsgs = await page.locator('.text-destructive, [class*="destructive"]').allTextContents();
    const focusedEl = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? (el.closest('[data-item-id]')?.getAttribute('data-item-id') || el.tagName + ':' + el.className.slice(0,40)) : 'none';
    });
    console.log('🔍 [반복] 빨간 문구:', redMsgs.filter(t => t.trim()));
    console.log('🔍 [반복] 포커스 요소:', focusedEl);

    // --- 검증 4: 전체 응답 후 버튼 아래 문구 사라지는지 확인 ---
    // 모든 페이지의 모든 문항 응답 (자동화)
    for (let pg = 0; pg < 8; pg++) {
      const cards = await page.locator('label.assessment-option-card, label[class*="option-card"]').all();
      for (const card of cards) {
        await card.click().catch(() => {});
        await page.waitForTimeout(50);
      }
      // 다음 페이지로
      const nextPage = page.locator('button[aria-label*="다음"], button:has(svg)').last();
      if (await nextPage.isVisible()) await nextPage.click().catch(() => {});
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: `${SCDIR}/11-all-answered.png` });

    // 제출 버튼 상태 + 빨간 문구 확인
    const submitBtnFinal = page.locator('button').filter({ hasText: /다음 세션 안내|제출하기/ }).last();
    const finalTxt = await submitBtnFinal.textContent();
    const finalDisabled = await submitBtnFinal.getAttribute('disabled');
    const finalRed = await page.locator('.text-destructive').allTextContents();
    console.log(`\n[검증 4] 전체 응답 후 버튼: "${finalTxt?.trim()}" disabled:${finalDisabled}`);
    console.log('  남은 빨간 문구:', finalRed.filter(t => t.trim()));

  } catch(e) { console.error('ERROR:', e.message); await page.screenshot({ path: `${SCDIR}/err.png` }).catch(()=>{}); }
  finally { await browser.close(); }
})();
