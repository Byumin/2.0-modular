#!/usr/bin/env node
// Capture ClientResult page with a fixed API fixture so before/after diffs
// only reflect the component change, not data variance.
//
// Usage:
//   node scripts/capture_client_result.mjs --out artifacts/screenshots/client-result-before.png

import fs from "node:fs";
import path from "node:path";

const FIXTURE = {
  item: {
    id: 1,
    name: "김민수",
    gender: "male",
    birth_day: "1992-08-14",
    age: 33,
    assessment_logs: [
      {
        custom_test_name: "STS 종합검사",
        assessed_on: "2026-05-20T10:32:00Z",
        scale_scores: [
          { scale_key: "STS_DEP", scale_name: "우울", raw_score: 18, t_score: 68, percentile: 92, level: "높음" },
          { scale_key: "STS_ANX", scale_name: "불안", raw_score: 14, t_score: 62, percentile: 84, level: "높음" },
          { scale_key: "STS_HOS", scale_name: "적대감", raw_score: 9, t_score: 54, percentile: 66, level: "보통" },
          { scale_key: "STS_SOM", scale_name: "신체화", raw_score: 7, t_score: 49, percentile: 47, level: "보통" },
          { scale_key: "STS_SLP", scale_name: "수면문제", raw_score: 4, t_score: 41, percentile: 22, level: "낮음" },
        ],
      },
      {
        custom_test_name: "GOLDEN 성격검사",
        assessed_on: "2026-05-18T14:05:00Z",
        scale_scores: [
          { scale_key: "G_E", scale_name: "외향성", raw_score: 22, t_score: 58, percentile: 76, level: "보통" },
          { scale_key: "G_A", scale_name: "친화성", raw_score: 26, t_score: 64, percentile: 88, level: "높음" },
          { scale_key: "G_C", scale_name: "성실성", raw_score: 19, t_score: 52, percentile: 60, level: "보통" },
          { scale_key: "G_N", scale_name: "신경증", raw_score: 11, t_score: 44, percentile: 30, level: "낮음" },
          { scale_key: "G_O", scale_name: "개방성", raw_score: 24, t_score: 61, percentile: 81, level: "높음" },
        ],
      },
      {
        custom_test_name: "PAT2 적성검사",
        assessed_on: "2026-05-22T09:10:00Z",
        scale_scores: [],
      },
    ],
  },
};

function parseArgs(argv) {
  const args = {
    out: path.join("artifacts", "screenshots", `client-result-${Date.now()}.png`),
    waitMs: 1200,
    width: 1440,
    height: 2400,
    base: "http://localhost:5120",
    clientId: "1",
  };
  for (let i = 2; i < argv.length; i += 1) {
    const v = argv[i];
    if (v === "--out") args.out = argv[++i] || args.out;
    else if (v === "--wait-ms") args.waitMs = Number(argv[++i] || args.waitMs);
    else if (v === "--width") args.width = Number(argv[++i] || args.width);
    else if (v === "--height") args.height = Number(argv[++i] || args.height);
    else if (v === "--base") args.base = argv[++i] || args.base;
    else if (v === "--id") args.clientId = argv[++i] || args.clientId;
  }
  return args;
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    console.error("Playwright is not installed. Install with: npm i -D playwright");
    process.exit(1);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const outPath = path.resolve(process.cwd(), args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: args.width, height: args.height },
    });
    const page = await context.newPage();

    await page.route("**/api/admin/clients/**", async (route) => {
      const url = route.request().url();
      if (/\/api\/admin\/clients\/\d+(\?|$)/.test(url)) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(FIXTURE),
        });
      }
      return route.continue();
    });

    const target = `${args.base}/admin/clients/${args.clientId}/result`;
    await page.goto(target, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(args.waitMs);
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`Saved screenshot: ${outPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
