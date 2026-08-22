#!/usr/bin/env node
/**
 * Captures a real screenshot and a short demo video of a live deployment,
 * for evidence kinds the registry previously could not fill.
 *
 *   node scripts/capture-evidence.mjs <slug> <url> [--scroll]
 *
 * Writes:
 *   public/media/<slug>/screenshot.png   1280x800 viewport capture
 *   public/media/<slug>/demo.webm        ~8s scroll-through recording
 *
 * The caller stamps capturedAt in the case study; this script only produces
 * honest pixels of what the URL actually served today.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const [slug, url] = process.argv.slice(2);
if (!slug || !url) {
  console.error("usage: node scripts/capture-evidence.mjs <slug> <url> [--scroll]");
  process.exit(1);
}

const outDir = path.join(process.cwd(), "public/media", slug);
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: {
    dir: outDir,
    size: { width: 1280, height: 800 },
  },
});

const page = await context.newPage();
await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
await page.waitForTimeout(2500);

// An auth wall is the most likely false positive: a protected deployment
// serves a login page with a 200 status, and capturing it would produce
// evidence of somebody else's login form. Refuse instead.
const title = (await page.title()).toLowerCase();
const bodyText = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
const AUTH_WALLS = ["log in to vercel", "login to vercel", "sign in to continue", "vercel deployment protection"];
if (AUTH_WALLS.some((marker) => title.includes(marker) || bodyText.includes(marker))) {
  await context.close();
  await browser.close();
  console.error(
    `capture-evidence: ${url} is behind an auth wall ("${title}") — refusing to capture.\n` +
      `Make the deployment public or point at an unprotected origin.`,
  );
  process.exit(1);
}

// A little motion so the video shows interaction rather than a still frame.
for (let i = 0; i < 6; i++) {
  await page.mouse.wheel(0, 240);
  await page.waitForTimeout(700);
}
for (let i = 0; i < 3; i++) {
  await page.mouse.wheel(0, -480);
  await page.waitForTimeout(500);
}
await page.waitForTimeout(1200);

await page.screenshot({
  path: path.join(outDir, "screenshot.png"),
  fullPage: false,
});

const videoPath = await page.video()?.path();
await context.close();
await browser.close();

if (videoPath) {
  const target = path.join(outDir, "demo.webm");
  if (path.resolve(videoPath) !== path.resolve(target)) {
    fs.renameSync(videoPath, target);
  }
  const kb = Math.round(fs.statSync(target).size / 1024);
  console.log(`capture-evidence: wrote screenshot.png + demo.webm (${kb} KB) → ${outDir}`);
} else {
  console.log("capture-evidence: wrote screenshot.png (no video track)");
}

console.log(`captured ${url}`);
