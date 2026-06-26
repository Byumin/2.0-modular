#!/usr/bin/env node
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto("http://localhost:5120/assessment/custom/<ASSESSMENT_TOKEN>");
await page.waitForTimeout(2000);

const consent = page.locator("input[type=checkbox]").first();
if (await consent.isVisible()) { await consent.check(); await page.waitForTimeout(200); }

await page.getByRole("button", { name: "검사 실시하기" }).click();
await page.waitForTimeout(1200);
await page.waitForSelector("input[placeholder*='이름 입력']", { timeout: 5000 }).catch(() => {});

const birthInputs = page.locator("input[type=date]");
await birthInputs.nth(1).fill("1985-06-15");
await page.waitForTimeout(400);
await birthInputs.nth(2).fill("2021-06-15");
await page.waitForTimeout(800);

// 부모 생년월일 라벨 영역 캡처
const parentBirthLabel = page.locator("label", { hasText: "부모 생년월일" });
await parentBirthLabel.scrollIntoViewIfNeeded();
await page.screenshot({ path: "/tmp/age_parent.png", clip: { x: 600, y: 0, width: 680, height: 900 } });

const ageTexts = await page.locator("text=/만 \\d+세/").allTextContents();
console.log("만나이 결과:", ageTexts);

await browser.close();
