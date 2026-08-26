#!/usr/bin/env node
/**
 * Fails when the evidence pipeline ran without the repository access it needs.
 *
 * registry-sync depends on REGISTRY_TOKEN to refresh CI facts, source status
 * and cross-repo path checks. When the token is missing, expired or scoped
 * too narrowly, the import keeps the committed data and verify:sources exits
 * 0 — every downstream gate degrades while the job stays green. This check
 * runs immediately after the import so degradation fails the sync job instead.
 *
 * No dependencies — runs in a bare CI container.
 */

import fs from "node:fs";

const factsPath = "registry/ci-facts.json";
const previous = process.env.PREVIOUS_FACTS_IMPORTED_AT ?? "";
const tokenPresent = Boolean(
  (process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "").trim(),
);

function fail(problems) {
  console.error("evidence pipeline ran degraded:");
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(
    "\nFix: point the REGISTRY_TOKEN secret at a PAT that can read the " +
      "sibling repos, then re-run this workflow. Until then the site is " +
      "displaying stale CI facts and skipping source verification.",
  );
  process.exit(1);
}

let facts;
try {
  facts = JSON.parse(fs.readFileSync(factsPath, "utf8"));
} catch (error) {
  fail([`${factsPath} unreadable after import: ${error.message}`]);
}

const problems = [];
if (!tokenPresent) {
  problems.push("GITHUB_TOKEN is empty in this step");
}
if ((facts.mode ?? "anonymous") !== "authenticated") {
  problems.push(
    `import ran with mode='${facts.mode ?? "anonymous"}', expected 'authenticated'`,
  );
}
const importedAt = facts.importedAt ?? "";
if (!importedAt) {
  problems.push("ci-facts.importedAt missing after import");
} else if (previous && importedAt === previous) {
  problems.push(
    `ci-facts.importedAt did not advance (${importedAt}) — the import kept the committed file`,
  );
}
if (problems.length > 0) fail(problems);

console.log(
  `evidence pipeline healthy: facts refreshed at ${importedAt} (mode=${facts.mode})`,
);
