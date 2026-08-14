#!/usr/bin/env node
/**
 * Imports the upstream monorepo registry and CI facts into registry/.
 *
 *   node scripts/import-registry.mjs            # upstream snapshot only (no token needed)
 *   node scripts/import-registry.mjs --ci       # also pull test/benchmark counts from CI
 *
 * Writes:
 *   registry/upstream.json   snapshot of henrygoldsmith07-wq/Claude-Code:apps/registry.json
 *   registry/ci-facts.json   latest workflow conclusion + test counts, keyed by app id
 *
 * Both files are generated. Never edit them by hand — this script overwrites them.
 * Narrative and evidence live in registry/case-studies/*.json, which this script
 * never touches.
 *
 * No dependencies, on purpose: this has to run in a bare CI container.
 */

import fs from "node:fs";
import path from "node:path";

const SOURCE_REPO = "henrygoldsmith07-wq/Claude-Code";
const SOURCE_PATH = "apps/registry.json";
const SOURCE_REF = "main";

const root = process.cwd();
const outDir = path.join(root, "registry");
const wantCi = process.argv.includes("--ci");
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";

function log(msg) {
  process.stdout.write(`import-registry: ${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`import-registry: ${msg}\n`);
  process.exitCode = 1;
}

/**
 * A placeholder or expired token gives 401, which would otherwise take down the
 * whole import. Retry once anonymously — public repo metadata is readable
 * without auth, just rate-limited.
 */
async function githubFetch(url, { raw = false, auth = true } = {}) {
  const headers = { "user-agent": "henry-builds-registry-import" };
  if (token && auth && !raw) headers.authorization = `Bearer ${token}`;
  if (!raw) headers.accept = "application/vnd.github+json";

  const res = await fetch(url, { headers });
  if (res.status === 401 && auth && token) {
    log("token rejected (401) — retrying anonymously");
    return githubFetch(url, { raw, auth: false });
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} for ${url}`);
  }
  return res;
}

async function fetchJson(url, options = {}) {
  const res = await githubFetch(url, options);
  return res.json();
}

async function fetchText(url) {
  const res = await githubFetch(url);
  return res.text();
}

/** Flatten the upstream registry's three sections into one list. */
function normalise(registry) {
  const sections = ["apps", "auxiliary", "external"];
  const entries = [];

  for (const section of sections) {
    for (const entry of registry[section] ?? []) {
      entries.push({
        id: entry.id,
        name: entry.name,
        path: entry.path,
        repo: entry.repo,
        lifecycle: entry.lifecycle,
        kind: entry.kind,
        stack: entry.stack,
        description: entry.description,
        workflow: entry.workflow,
        site: entry.site ?? null,
        section,
      });
    }
  }

  return entries;
}

/**
 * Pull the number of tests out of a job log.
 *
 * Deliberately conservative: if none of these shapes match, we record no count
 * rather than guessing. A wrong number on the site is worse than no number.
 */
const TEST_PATTERNS = [
  // vitest: "Tests  412 passed (412)"
  /^\s*Tests\s+(\d+)\s+passed\s+\((\d+)\)/im,
  // vitest with failures: "Tests  2 failed | 410 passed (412)"
  /^\s*Tests\s+.*?\((\d+)\)\s*$/im,
  // node:test TAP summary: "# pass 37"
  /^#\s*pass\s+(\d+)/im,
  // jest: "Tests:       412 passed, 412 total"
  /^\s*Tests:\s+.*?(\d+)\s+total/im,
];

const FILE_PATTERNS = [
  // vitest: "Test Files  29 passed (29)"
  /^\s*Test Files\s+\d+\s+passed\s+\((\d+)\)/im,
  /^\s*Test Files\s+.*?\((\d+)\)\s*$/im,
];

function extractCount(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = Number(match[match.length - 1]);
      if (Number.isFinite(value) && value > 0) return value;
    }
  }
  return undefined;
}

async function latestRun(workflowFile) {
  const url =
    `https://api.github.com/repos/${SOURCE_REPO}/actions/workflows/` +
    `${encodeURIComponent(workflowFile)}/runs?branch=${SOURCE_REF}&per_page=1&status=completed`;
  const data = await fetchJson(url);
  return data.workflow_runs?.[0];
}

async function runLogText(runId) {
  // The logs endpoint 302s to a zip. We only want plain text, so we read the
  // per-job logs instead, which the API serves directly.
  const jobs = await fetchJson(
    `https://api.github.com/repos/${SOURCE_REPO}/actions/runs/${runId}/jobs?per_page=20`,
  );
  let combined = "";
  for (const job of jobs.jobs ?? []) {
    try {
      combined += await fetchText(
        `https://api.github.com/repos/${SOURCE_REPO}/actions/jobs/${job.id}/logs`,
      );
      combined += "\n";
    } catch {
      // A single unreadable job should not sink the whole import.
    }
  }
  return combined;
}

async function collectCiFacts(entries) {
  const facts = {};

  for (const entry of entries) {
    if (!entry.workflow) continue;
    const workflowFile = path.basename(entry.workflow);

    try {
      const run = await latestRun(workflowFile);
      if (!run) {
        log(`${entry.id}: no completed run for ${workflowFile}`);
        continue;
      }

      const record = {
        workflow: entry.workflow,
        workflowUrl: `https://github.com/${SOURCE_REPO}/blob/${SOURCE_REF}/${entry.workflow}`,
        runUrl: run.html_url,
        conclusion: run.conclusion,
        completedAt: run.updated_at,
      };

      if (run.conclusion === "success" && token) {
        const logs = await runLogText(run.id);
        const total = extractCount(logs, TEST_PATTERNS);
        const files = extractCount(logs, FILE_PATTERNS);
        if (total) {
          record.tests = files ? { total, files } : { total };
          record.derivedFrom = "workflow job log";
        }
      } else if (!token) {
        record.derivedFrom = "run metadata only (no GITHUB_TOKEN, logs not readable)";
      }

      facts[entry.id] = record;
      log(`${entry.id}: ${run.conclusion}${record.tests ? ` · ${record.tests.total} tests` : ""}`);
    } catch (error) {
      log(`${entry.id}: skipped (${error.message})`);
    }
  }

  return facts;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const rawUrl = `https://raw.githubusercontent.com/${SOURCE_REPO}/${SOURCE_REF}/${SOURCE_PATH}`;
  log(`fetching ${rawUrl}`);

  let registry;
  try {
    registry = await fetchJson(rawUrl, { raw: true });
  } catch (error) {
    fail(`could not fetch upstream registry: ${error.message}`);
    return;
  }

  const entries = normalise(registry);
  const snapshot = {
    _generated: "Written by scripts/import-registry.mjs. Do not edit by hand.",
    source: { repo: SOURCE_REPO, path: SOURCE_PATH, ref: SOURCE_REF },
    importedAt: new Date().toISOString(),
    lifecycleStates: registry.lifecycleStates ?? {},
    entries,
  };

  fs.writeFileSync(
    path.join(outDir, "upstream.json"),
    `${JSON.stringify(snapshot, null, 2)}\n`,
  );
  log(`wrote registry/upstream.json (${entries.length} entries)`);

  if (!wantCi) {
    log("skipping CI facts (pass --ci to include them)");
    return;
  }

  const facts = await collectCiFacts(entries);
  fs.writeFileSync(
    path.join(outDir, "ci-facts.json"),
    `${JSON.stringify(
      {
        _generated: "Written by scripts/import-registry.mjs --ci. Do not edit by hand.",
        importedAt: new Date().toISOString(),
        facts,
      },
      null,
      2,
    )}\n`,
  );
  log(`wrote registry/ci-facts.json (${Object.keys(facts).length} workflows)`);
}

main().catch((error) => {
  fail(error.stack ?? String(error));
});
