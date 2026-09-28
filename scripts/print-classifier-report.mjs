#!/usr/bin/env node
/**
 * Prints the classifier report as `id | category | confidence | rule | status`.
 *
 *   node scripts/print-classifier-report.mjs [path]
 *
 * This replaces an inline `node -e "...require('./classifier-report.json')..."`
 * in ci.yml. That version ran under `if: always()` but assumed the report
 * existed, even though the file is only written by the audit:claims step. When
 * any earlier step failed the job — the freshness gate, the validator — the
 * step died with MODULE_NOT_FOUND and was rendered as a second red step,
 * burying the real cause under a confusing stack trace.
 *
 * A diagnostic must never be the thing that fails. This exits 0 with an
 * explanation when there is nothing to print, so the log shows why the report
 * is missing instead of pretending the classifier is broken.
 *
 * No dependencies — runs in a bare CI container.
 */

import fs from "node:fs";
import path from "node:path";

const reportPath = path.resolve(
  process.cwd(),
  process.argv[2] ?? "classifier-report.json",
);

if (!fs.existsSync(reportPath)) {
  console.log(
    `print-classifier-report: no report at ${path.relative(process.cwd(), reportPath)} — ` +
      "nothing to print. Expected only if the audit:claims step did not run " +
      "(an earlier step failed), so this is not itself an error.",
  );
  process.exit(0);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
} catch (error) {
  // Malformed is worth surfacing loudly: unlike a missing file, this means the
  // audit step ran and produced something unreadable.
  console.error(
    `print-classifier-report: ${path.relative(process.cwd(), reportPath)} is not valid JSON — ${error.message}`,
  );
  process.exit(1);
}

const items = Array.isArray(report.items) ? report.items : [];
if (items.length === 0) {
  console.log("print-classifier-report: report contains no classified claims");
  process.exit(0);
}

for (const item of items) {
  console.log(
    [item.id, item.category, item.confidence, item.rule, item.status].join(" | "),
  );
}
console.log(
  `print-classifier-report: ${items.length} claim(s), taxonomy v${report.taxonomyVersion ?? "?"}`,
);
