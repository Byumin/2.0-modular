#!/usr/bin/env node
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto("http://localhost:5120/assessment/custom/0ayiGgFcfQjuvjZECmvzBA0VmMilYIJ6");
await page.waitForTimeout(2000);

// 동의 체크박스가 있으면 체크
const consent = page.locator("input[type=checkbox]").first();
if (await consent.isVisible()) {
  await consent.check();
  await page.waitForTimeout(300);
}

// 검사 실시하기 버튼 클릭
await page.getByRole("button", { name: "검사 실시하기" }).click();
await page.waitForTimeout(1000);

// 인적사항 폼이 열릴 때까지 대기
await page.waitForSelector("input[placeholder*='이름 입력']", { timeout: 5000 }).catch(() => console.log("form did not open"));

// 스크롤 후 스크린샷
await page.evaluate(() => window.scrollTo(0, 300));
await page.waitForTimeout(300);
await page.screenshot({ path: "/tmp/profile_form_open.png" });

// 실제 보이는 요소 확인
const visible = await page.locator("label:visible, span.text-sm.font-medium:visible").allTextContents();
console.log("=== 실제 화면에 보이는 라벨 ===");
visible.filter(t => t.trim()).forEach(t => console.log(" -", t.trim()));

await browser.close();
