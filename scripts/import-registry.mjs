#!/usr/bin/env node
/**
 * Imports the upstream monorepo registry and CI facts into registry/.
 *
 *   node scripts/import-registry.mjs            # upstream snapshot only (no token needed)
 *   node scripts/import-registry.mjs --ci       # also pull test/benchmark facts from CI
 *   node scripts/import-registry.mjs --ci --allow-empty
 *                                               # write ci-facts.json even when nothing
 *                                               # could be collected (validation then fails
 *                                               # loudly instead of the import hiding it)
 *
 * Writes:
 *   registry/upstream.json   snapshot of henrygoldsmith07-wq/Claude-Code:apps/registry.json
 *   registry/ci-facts.json   latest workflow facts, keyed by app id
 *
 * Both files are generated. Never edit them by hand — this script overwrites them.
 * Narrative and evidence live in registry/case-studies/*.json, which this script
 * never touches.
 *
 * CI facts come from two sources, in order of trust:
 *   1. A `ci-facts` artifact uploaded by the app's own workflow (a small JSON file
 *      with exact test/benchmark counts). Read directly from Actions artifacts.
 *   2. The workflow's job logs, matched against conservative output patterns.
 * When neither yields a count we record the run metadata only — a missing number
 * is honest, a wrong number is not.
 *
 * Safety property: if collection fails outright (network down, rate limited) the
 * previous ci-facts.json is left untouched rather than replaced with an empty
 * file. An empty facts file must mean "CI really has no runs", never "the import
 * errored and nobody noticed".
 *
 * No dependencies, on purpose: this has to run in a bare CI container.
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const SOURCE_REPO = "henrygoldsmith07-wq/Claude-Code";
const SOURCE_PATH = "apps/registry.json";
const SOURCE_REF = "main";

const root = process.cwd();
const outDir = path.join(root, "registry");
const wantCi = process.argv.includes("--ci");
const allowEmpty = process.argv.includes("--allow-empty");
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";

function log(msg) {
  process.stdout.write(`import-registry: ${msg}\n`);
}

function warn(msg) {
  process.stderr.write(`import-registry: ! ${msg}\n`);
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
async function githubFetch(url, { raw = false, auth = true, accept } = {}) {
  const headers = { "user-agent": "henry-builds-registry-import" };
  if (token && auth && !raw) headers.authorization = `Bearer ${token}`;
  if (accept) headers.accept = accept;
  else if (!raw) headers.accept = "application/vnd.github+json";

  const res = await fetch(url, { headers });
  if (res.status === 401 && auth && token) {
    log("token rejected (401) — retrying anonymously");
    return githubFetch(url, { raw, auth: false, accept });
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

// ---------------------------------------------------------------------------
// Minimal ZIP reader for Actions artifacts (upload-artifact zips the files).
// Handles stored (0) and deflate (8) entries; that covers every archive the
// Actions artifact API produces.
// ---------------------------------------------------------------------------

function inflateRaw(data) {
  return zlib.inflateRawSync(data);
}

function readZipEntries(buffer) {
  const EOCD_SIG = 0x06054b50;
  const CD_SIG = 0x02014b50;
  let eocd = -1;
  const minEocd = Math.max(0, buffer.length - 22 - 65536);
  for (let i = buffer.length - 22; i >= minEocd; i--) {
    if (buffer.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip archive (no end-of-central-directory)");

  const count = buffer.readUInt16LE(eocd + 10);
  let ptr = buffer.readUInt32LE(eocd + 16);
  const entries = [];

  for (let n = 0; n < count; n++) {
    if (ptr + 46 > buffer.length || buffer.readUInt32LE(ptr) !== CD_SIG) {
      throw new Error("corrupt zip central directory");
    }
    const method = buffer.readUInt16LE(ptr + 10);
    const compSize = buffer.readUInt32LE(ptr + 20);
    const nameLen = buffer.readUInt16LE(ptr + 28);
    const extraLen = buffer.readUInt16LE(ptr + 30);
    const commentLen = buffer.readUInt16LE(ptr + 32);
    const localOffset = buffer.readUInt32LE(ptr + 42);
    const name = buffer.slice(ptr + 46, ptr + 46 + nameLen).toString("utf8");

    const lNameLen = buffer.readUInt16LE(localOffset + 26);
    const lExtraLen = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    const raw = buffer.slice(dataStart, dataStart + compSize);

    entries.push({
      name,
      data: method === 0 ? raw : inflateRaw(raw),
    });
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/**
 * Pull test/benchmark counts out of a `ci-facts` artifact uploaded by the app's
 * own workflow. This is the preferred source: it is produced by the same job
 * that ran the tests, so it cannot drift from what actually ran.
 *
 * Accepted shapes: {"tests":{"total":n,"files"? :n},"benchmarks"?:{...}}
 */
async function artifactFacts(runId) {
  const list = await fetchJson(
    `https://api.github.com/repos/${SOURCE_REPO}/actions/runs/${runId}/artifacts?per_page=50`,
  );
  const candidates = (list.artifacts ?? []).filter((a) => /^ci-facts(-[\w.-]+)?$/.test(a.name));
  if (candidates.length === 0) return null;

  for (const artifact of candidates) {
    try {
      const res = await githubFetch(
        `https://api.github.com/repos/${SOURCE_REPO}/actions/artifacts/${artifact.id}/zip`,
        { accept: "application/vnd.github+json" },
      );
      const buffer = Buffer.from(await res.arrayBuffer());
      for (const entry of readZipEntries(buffer)) {
        if (!entry.name.endsWith(".json")) continue;
        const parsed = JSON.parse(entry.data.toString("utf8"));
        const tests =
          parsed?.tests?.total > 0
            ? {
                total: Number(parsed.tests.total),
                ...(parsed.tests.files > 0 ? { files: Number(parsed.tests.files) } : {}),
              }
            : undefined;
        const benchmarks =
          parsed?.benchmarks?.cases > 0
            ? {
                cases: Number(parsed.benchmarks.cases),
                label: typeof parsed.benchmarks.label === "string" ? parsed.benchmarks.label : undefined,
                sourceUrl:
                  typeof parsed.benchmarks.sourceUrl === "string" ? parsed.benchmarks.sourceUrl : undefined,
              }
            : undefined;
        if (tests || benchmarks) {
          return { tests, benchmarks, derivedFrom: `artifact ${artifact.name}` };
        }
      }
    } catch (error) {
      warn(`artifact ${artifact.name} unreadable (${error.message})`);
    }
  }
  return null;
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
  /^\s*Test Files\s+.*?\((\d+)\s*\)$/im,
];

// rtk's benchmark runner prints a strict final line: "benchmark cases: N".
const BENCHMARK_PATTERNS = [/^benchmark cases:\s*(\d+)\s*$/im];

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

/**
 * Recent completed runs, newest first. Used to find the last SUCCESS even when
 * the newest run failed — the date of the last green run is the date the code
 * was last verified, which is exactly what the site displays.
 */
async function recentRuns(workflowFile, perPage = 100) {
  const url =
    `https://api.github.com/repos/${SOURCE_REPO}/actions/workflows/` +
    `${encodeURIComponent(workflowFile)}/runs?branch=${SOURCE_REF}&per_page=${perPage}&status=completed`;
  const data = await fetchJson(url);
  return data.workflow_runs ?? [];
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
  const previous = readPreviousFacts();
  let failures = 0;

  for (const entry of entries) {
    if (!entry.workflow) continue;
    const workflowFile = path.basename(entry.workflow);

    try {
      const runs = await recentRuns(workflowFile);
      if (runs.length === 0) {
        log(`${entry.id}: no completed runs for ${workflowFile}`);
        continue;
      }
      const run = runs[0];

      const lastSuccess = runs.find((r) => r.conclusion === "success");
      const record = {
        workflow: entry.workflow,
        workflowUrl: `https://github.com/${SOURCE_REPO}/blob/${SOURCE_REF}/${entry.workflow}`,
        runUrl: run.html_url,
        conclusion: run.conclusion,
        lastRunAt: run.updated_at,
        lastSuccessfulRunAt: lastSuccess?.updated_at,
        lastSuccessRunUrl: lastSuccess?.html_url,
      };

      // Facts content comes artifact-first, log-parsing second.
      let measured = null;
      if (token) {
        try {
          measured = await artifactFacts(run.id);
        } catch (error) {
          warn(`${entry.id}: artifact lookup failed (${error.message})`);
        }
      }
      if (!measured && run.conclusion === "success" && token) {
        const logs = await runLogText(run.id);
        const total = extractCount(logs, TEST_PATTERNS);
        const files = extractCount(logs, FILE_PATTERNS);
        const benchCases = extractCount(logs, BENCHMARK_PATTERNS);
        if (total || benchCases) {
          measured = {
            tests: total ? (files ? { total, files } : { total }) : undefined,
            benchmarks: benchCases ? { cases: benchCases } : undefined,
            derivedFrom: "workflow job log",
          };
        }
      }

      if (measured) {
        if (measured.tests) record.tests = measured.tests;
        if (measured.benchmarks) record.benchmarks = measured.benchmarks;
        record.derivedFrom = measured.derivedFrom;
      } else if (!token) {
        record.derivedFrom = "run metadata only (no GITHUB_TOKEN, artifacts/logs not readable)";
      } else if (previous[entry.id]?.tests && run.conclusion !== "success") {
        // Keep the older verified count visible but marked stale rather than
        // dropping it silently when the newest run failed before measuring.
        record.tests = previous[entry.id].tests;
        record.derivedFrom = `carried from earlier successful run (${previous[entry.id].completedAt ?? "unknown date"}); newest run did not produce a fresh count`;
        warn(`${entry.id}: carrying stale test count forward — newest run ${run.conclusion}`);
      }

      facts[entry.id] = record;
      log(
        `${entry.id}: ${run.conclusion}` +
          `${record.lastSuccessfulRunAt ? ` · last green ${record.lastSuccessfulRunAt.slice(0, 10)}` : ""}` +
          `${record.tests ? ` · ${record.tests.total} tests` : ""}` +
          `${record.benchmarks ? ` · ${record.benchmarks.cases} bench cases` : ""}`,
      );
    } catch (error) {
      failures++;
      warn(`${entry.id}: ${workflowFile} lookup failed — ${error.message}`);
      // Preserve whatever we knew before so a transient outage cannot erase
      // evidence from the site.
      if (previous[entry.id]) {
        facts[entry.id] = {
          ...previous[entry.id],
          carriedForward: true,
          carriedReason: error.message,
        };
        log(`${entry.id}: kept previous fact (carried forward)`);
      }
    }
  }

  if (failures > 0 && Object.keys(facts).length === 0) {
    fail("every workflow lookup failed — refusing to overwrite ci-facts.json with an empty import");
    process.exit(1);
  }
  if (failures > 0) {
    warn(`${failures} workflow lookup(s) failed; surviving facts were preserved/carried forward`);
  }

  return facts;
}

function readPreviousFacts() {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(outDir, "ci-facts.json"), "utf8"));
    return parsed.facts ?? {};
  } catch {
    return {};
  }
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const rawUrl = `https://raw.githubusercontent.com/${SOURCE_REPO}/${SOURCE_REF}/${SOURCE_PATH}`;
  log(`fetching ${rawUrl}`);

  let registry;
  try {
    registry = JSON.parse(await fetchText(rawUrl));
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
  if (Object.keys(facts).length === 0 && !allowEmpty) {
    fail(
      "no CI facts could be collected. Refusing to write an empty facts file — " +
        "pass --allow-empty to force it (registry validation will then fail loudly).",
    );
    process.exit(1);
  }

  fs.writeFileSync(
    path.join(outDir, "ci-facts.json"),
    `${JSON.stringify(
      {
        _generated: "Written by scripts/import-registry.mjs --ci. Do not edit by hand.",
        importedAt: new Date().toISOString(),
        sourceRepo: SOURCE_REPO,
        sourceRef: SOURCE_REF,
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
