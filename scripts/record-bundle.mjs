#!/usr/bin/env node
/**
 * Records the portfolio's own bundle weight into history after a build.
 *
 *   node scripts/record-bundle.mjs
 *
 * Reads dist/assets/*.{js,css}, appends { date, totalKb, jsKb } to
 * registry/bundle-history.json (capped), and warns when total size grew more
 * than 10% over the last recorded point. A content site should not creep.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const distAssets = path.join(root, "dist/assets");
const outPath = path.join(root, "registry/bundle-history.json");
const CAP = 90;
const GROWTH_WARN = 0.1;

if (!fs.existsSync(distAssets)) {
  console.error("record-bundle: dist/assets missing — run the build first");
  process.exit(1);
}

let totalBytes = 0;
let jsBytes = 0;
for (const file of fs.readdirSync(distAssets)) {
  if (!/\.(js|css)$/.test(file)) continue;
  const size = fs.statSync(path.join(distAssets, file)).size;
  totalBytes += size;
  if (file.endsWith(".js")) jsBytes += size;
}

const kb = Math.round(totalBytes / 1024);
const jsKb = Math.round(jsBytes / 1024);
const today = new Date().toISOString().slice(0, 10);

const history = fs.existsSync(outPath)
  ? JSON.parse(fs.readFileSync(outPath, "utf8"))
  : { _generated: true, entries: [] };
history.entries ??= [];

const last = history.entries[history.entries.length - 1];
if (last && last.date === today) {
  // Same-day rebuilds update in place rather than stacking points.
  last.totalKb = kb;
  last.jsKb = jsKb;
} else if (last) {
  const growth = (kb - last.totalKb) / last.totalKb;
  history.entries.push({ date: today, totalKb: kb, jsKb });
  if (growth > GROWTH_WARN) {
    console.warn(
      `record-bundle: bundle grew ${(growth * 100).toFixed(1)}% since ${last.date} ` +
        `(${last.totalKb} KB → ${kb} KB). Justify it or trim it.`,
    );
  }
} else {
  history.entries.push({ date: today, totalKb: kb, jsKb });
}
if (history.entries.length > CAP) history.entries = history.entries.slice(-CAP);
history.generatedAt = new Date().toISOString();

fs.writeFileSync(outPath, `${JSON.stringify(history, null, 2)}\n`);
console.log(`record-bundle: ${kb} KB total (${jsKb} KB js) → registry/bundle-history.json`);
