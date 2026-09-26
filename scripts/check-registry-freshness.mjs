#!/usr/bin/env node
/**
 * Fails when generated truth has silently stopped refreshing.
 *
 * Normal CI allows a wider window so pull requests are not blocked by a brief
 * scheduled-workflow outage. The scheduled registry sync uses --strict after it
 * refreshes everything, so a missing token or broken collector becomes visible
 * immediately instead of leaving month-old "current" data on the site.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const strict = process.argv.includes("--strict");
const maxAgeDays = strict ? 2 : 45;
const bundleMaxAgeDays = strict ? 2 : 45;
const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;

const checks = [
  ["registry/upstream.json", "importedAt", maxAgeDays],
  ["registry/evidence-ledger.json", "importedAt", maxAgeDays],
  ["registry/source-status.json", "checkedAt", maxAgeDays],
  ["registry/ci-facts.json", "importedAt", maxAgeDays],
  ["registry/facts-history.json", "generatedAt", maxAgeDays],
  ["registry/bundle-history.json", "generatedAt", bundleMaxAgeDays],
];

let failures = 0;

for (const [relative, field, allowedDays] of checks) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    console.error(`freshness: missing ${relative}`);
    failures++;
    continue;
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`freshness: ${relative} is not valid JSON (${error.message})`);
    failures++;
    continue;
  }

  const raw = data[field];
  const timestamp = Date.parse(raw);
  if (!raw || !Number.isFinite(timestamp)) {
    console.error(`freshness: ${relative} has no valid ${field}`);
    failures++;
    continue;
  }

  const ageDays = (now - timestamp) / DAY;
  if (ageDays < -1) {
    console.error(
      `freshness: ${relative} ${field} is ${Math.abs(ageDays).toFixed(1)} days in the future`,
    );
    failures++;
    continue;
  }

  if (ageDays > allowedDays) {
    console.error(
      `freshness: ${relative} is ${ageDays.toFixed(1)} days old (limit ${allowedDays})`,
    );
    failures++;
  } else {
    console.log(
      `freshness: ${relative} ${ageDays.toFixed(1)} days old (limit ${allowedDays})`,
    );
  }
}

process.exit(failures > 0 ? 1 : 0);
