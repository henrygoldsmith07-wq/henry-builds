#!/usr/bin/env node
/**
 * Canonical generated-data refresh.
 *
 * This intentionally composes the small source-specific scripts rather than
 * duplicating their logic. If the pipeline changes, workflows and developers
 * keep calling this one command.
 */

import { spawnSync } from "node:child_process";

const withCi = process.argv.includes("--ci");

function run(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("scripts/import-registry.mjs", withCi ? ["--ci"] : []);
run("scripts/archive-removed.mjs");
run("scripts/collect-facts.mjs");

console.log(
  `refresh-registry: refreshed upstream, evidence, source status${withCi ? ", CI facts" : ""}, archive state and operational history`,
);
