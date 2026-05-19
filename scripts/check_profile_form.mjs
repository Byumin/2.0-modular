#!/usr/bin/env node
import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:5120/assessment/custom/0ayiGgFcfQjuvjZECmvzBA0VmMilYIJ6";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(url);
await page.waitForTimeout(2000);

// 검사 실시하기 버튼 클릭
await page.click('text=검사 실시하기');
await page.waitForTimeout(1000);

await page.screenshot({ path: "/tmp/profile_form.png", fullPage: true });

// 렌더된 label 텍스트 수집
const labels = await page.locator("label, .text-sm.font-medium").allTextContents();
console.log("=== 렌더된 라벨 목록 ===");
labels.forEach(l => { if (l.trim()) console.log(" -", l.trim()) });

// input 타입 수집
const inputs = await page.locator("input").evaluateAll(els =>
  els.map(e => ({ type: e.type, name: e.name, id: e.id, placeholder: e.placeholder }))
);
console.log("=== input 목록 ===");
console.log(JSON.stringify(inputs, null, 2));

await browser.close();
