#!/usr/bin/env node
/**
 * Records the portfolio's own bundle weight into history after a build.
 *
 *   node scripts/record-bundle.mjs
 *
 * Reads dist/assets/*.{js,css} and appends a point to registry/bundle-history.json
 * (capped), warning when weight grew more than 10% over the last recorded point.
 * A content site should not creep.
 *
 * Two sizes are recorded per entry, because they answer different questions:
 *
 *   totalKb / jsKb          raw bytes on disk. Tracks how much code exists and
 *                           is what the growth warning compares, so the series
 *                           stays consistent with the entries already recorded.
 *
 *   totalGzipKb / jsGzipKb  what a visitor actually downloads, and therefore the
 *                           only figure comparable to the Lighthouse budgets in
 *                           lighthouserc.json. lhci's FallbackServer serves
 *                           staticDistDir behind express `compression()`, and
 *                           Lighthouse's resource-summary reports transfer size.
 *                           Comparing raw bytes against a transfer-size budget is
 *                           a category error: ~780 KB of raw minified JS
 *                           transfers at roughly a third of that and clears a
 *                           700 KB budget comfortably.
 *
 * The gzip figure mirrors express `compression()` closely enough to be
 * meaningful: default gzip level, and no compression below its 1 KB threshold.
 *
 * Direction of the comparison matters. This script sums EVERY chunk in
 * dist/assets, including lazily-loaded route chunks that no single page fetches,
 * so its number is an upper bound on what one page transfers. The Lighthouse job
 * is the gate; this is a cheap, attributed early warning with the headroom
 * printed, not a second source of truth.
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = process.cwd();
const distAssets = path.join(root, "dist/assets");
const outPath = path.join(root, "registry/bundle-history.json");
const lighthousercPath = path.join(root, "lighthouserc.json");
const CAP = 90;
const GROWTH_WARN = 0.1;

/** express `compression()`'s default threshold; smaller bodies are sent as-is. */
const GZIP_MIN_BYTES = 1024;

if (!fs.existsSync(distAssets)) {
  console.error("record-bundle: dist/assets missing — run the build first");
  process.exit(1);
}

let totalBytes = 0;
let jsBytes = 0;
let totalGzipBytes = 0;
let jsGzipBytes = 0;
for (const file of fs.readdirSync(distAssets)) {
  if (!/\.(js|css)$/.test(file)) continue;
  const contents = fs.readFileSync(path.join(distAssets, file));
  totalBytes += contents.length;
  if (file.endsWith(".js")) jsBytes += contents.length;
  // Mirror the server: small bodies are not worth compressing.
  if (contents.length >= GZIP_MIN_BYTES) {
    const gz = zlib.gzipSync(contents).length;
    totalGzipBytes += gz;
    if (file.endsWith(".js")) jsGzipBytes += gz;
  } else {
    totalGzipBytes += contents.length;
    if (file.endsWith(".js")) jsGzipBytes += contents.length;
  }
}

const kb = Math.round(totalBytes / 1024);
const jsKb = Math.round(jsBytes / 1024);
const totalGzipKb = Math.round(totalGzipBytes / 1024);
const jsGzipKb = Math.round(jsGzipBytes / 1024);
const today = new Date().toISOString().slice(0, 10);

/**
 * Pull the resource-summary budgets out of lighthouserc.json so the numbers
 * compared against live in one place instead of being restated here.
 */
function budgetFor(key) {
  try {
    const lhr = JSON.parse(fs.readFileSync(lighthousercPath, "utf8"));
    return lhr?.ci?.assert?.assertions?.[key]?.[1]?.maxNumericValue ?? null;
  } catch {
    return null;
  }
}

const history = fs.existsSync(outPath)
  ? JSON.parse(fs.readFileSync(outPath, "utf8"))
  : { _generated: true, entries: [] };
history.entries ??= [];

const point = { date: today, totalKb: kb, jsKb, totalGzipKb, jsGzipKb };
const last = history.entries[history.entries.length - 1];

if (last && last.date === today) {
  // Same-day rebuilds update in place rather than stacking points.
  Object.assign(last, point);
} else {
  if (last) {
    const growth = (kb - last.totalKb) / last.totalKb;
    if (growth > GROWTH_WARN) {
      console.warn(
        `record-bundle: bundle grew ${(growth * 100).toFixed(1)}% since ${last.date} ` +
          `(${last.totalKb} KB → ${kb} KB). Justify it or trim it.`,
      );
    }
  }
  history.entries.push(point);
}
if (history.entries.length > CAP) history.entries = history.entries.slice(-CAP);
history.generatedAt = new Date().toISOString();

fs.writeFileSync(outPath, `${JSON.stringify(history, null, 2)}\n`);
console.log(
  `record-bundle: ${kb} KB raw (${jsKb} KB js) → ${totalGzipKb} KB gzipped ` +
    `(${jsGzipKb} KB js) → registry/bundle-history.json`,
);

// Compare on the transfer-size basis, since that is what the LH budget asserts.
const suffix = "sums every chunk incl. lazy routes, so per-page is lower";
for (const [label, value, budget] of [
  ["script", jsGzipBytes, budgetFor("resource-summary:script:size")],
  ["total", totalGzipBytes, budgetFor("resource-summary:total:size")],
]) {
  if (!budget) continue;
  const pct = (value / budget) * 100;
  const units = `${(value / 1024).toFixed(1)} KB / ${(budget / 1024).toFixed(0)} KB`;
  if (value > budget) {
    console.warn(
      `record-bundle: ${label} transfer size is over its Lighthouse budget — ${units} ` +
        `(${pct.toFixed(0)}% used). The lighthouse job will fail on this.`,
    );
  } else if (pct >= 80) {
    console.warn(
      `record-bundle: ${label} transfer size is close to its Lighthouse budget — ` +
        `${units} (${pct.toFixed(0)}% used; ${suffix}). Little headroom left.`,
    );
  } else {
    console.log(
      `record-bundle: ${label} transfer size within Lighthouse budget — ${units} ` +
        `(${pct.toFixed(0)}% used; ${suffix})`,
    );
  }
}
