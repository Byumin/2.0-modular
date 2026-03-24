#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    console.error("Playwright is not installed.");
    console.error("Install with: npm i -D playwright");
    process.exit(1);
  }
}

function parseArgs(argv) {
  const args = {
    url: "",
    out: path.join("artifacts", "screenshots", `capture-${Date.now()}.png`),
    waitMs: 1500,
    fullPage: true,
    width: 1440,
    height: 2200,
    selector: "",
  };

  for (let i = 2; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--url") args.url = argv[++i] || "";
    else if (value === "--out") args.out = argv[++i] || args.out;
    else if (value === "--wait-ms") args.waitMs = Number(argv[++i] || args.waitMs);
    else if (value === "--selector") args.selector = argv[++i] || "";
    else if (value === "--width") args.width = Number(argv[++i] || args.width);
    else if (value === "--height") args.height = Number(argv[++i] || args.height);
    else if (value === "--no-full-page") args.fullPage = false;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.url) {
    console.error("Usage:");
    console.error(
      "node scripts/capture_screenshot.mjs --url <TARGET_URL> [--out artifacts/screenshots/out.png] [--selector .app] [--wait-ms 1500]"
    );
    process.exit(1);
  }

  const outPath = path.resolve(process.cwd(), args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: { width: args.width, height: args.height },
    });
    await page.goto(args.url, { waitUntil: "networkidle", timeout: 60000 });
    if (args.selector) {
      await page.locator(args.selector).first().waitFor({ state: "visible", timeout: 15000 });
    }
    if (args.waitMs > 0) {
      await page.waitForTimeout(args.waitMs);
    }
    await page.screenshot({ path: outPath, fullPage: args.fullPage });
    console.log(`Saved screenshot: ${outPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
