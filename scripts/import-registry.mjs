#!/usr/bin/env node
/**
 * Imports everything the portfolio consumes, so the site is a view of the
 * ecosystem rather than a copy of it that drifts.
 *
 *   node scripts/import-registry.mjs            # upstream + evidence ledger + source status
 *   node scripts/import-registry.mjs --ci       # ...and CI facts (token strongly recommended)
 *
 * Writes (all generated — never edit by hand):
 *   registry/upstream.json        snapshot of Claude-Code:apps/registry.json
 *   registry/evidence-ledger.json snapshot of Claude-Code:evidence/registry.json
 *   registry/source-status.json   per project: current vs archived-source, why, and the
 *                                 commit SHA the source sits at right now
 *   registry/ci-facts.json        latest workflow conclusions, last green runs, test and
 *                                 benchmark counts pulled from Actions artifacts or logs
 *
 * Narrative stays in registry/case-studies/*.json, which this script never touches —
 * except that nothing here invents content either.
 *
 * No npm dependencies, on purpose: this has to run in a bare CI container.
 * The one external binary it may use is `unzip` (present on ubuntu-latest) to
 * read Actions artifacts, and only if the artifact route is available.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { crossRepoReadMode } from "./lib/github-paths.mjs";

const execFileAsync = promisify(execFile);

const SOURCE_REPO = "henrygoldsmith07-wq/Claude-Code";
const SOURCE_PATH = "apps/registry.json";
const EVIDENCE_PATH = "evidence/registry.json";
const SOURCE_REF = "main";

const root = process.cwd();
const outDir = path.join(root, "registry");
const wantCi = process.argv.includes("--ci");
const allowEmpty = process.argv.includes("--allow-empty");
const token = (process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "").trim();
const mode = token ? "authenticated" : "anonymous";

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

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
  // 401: bad/expired token. 404 with a token attached is subtler — a repo-
  // scoped GITHUB_TOKEN gets "not found" for every repository outside its
  // scope, even public ones. Both recover by retrying anonymously, which can
  // read anything public.
  const retriable =
    res.status === 401 || ((res.status === 404 || res.status === 403) && !raw);
  if (retriable && auth && token) {
    log(`token rejected (${res.status}) — retrying anonymously`);
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

async function fetchRawText(url) {
  const res = await githubFetch(url, { raw: true });
  return res.text();
}

/** Flatten the upstream registry's sections into one list. */
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

function readCaseStudies() {
  const dir = path.join(root, "registry/case-studies");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((file) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      } catch (error) {
        log(`case-studies/${file}: unreadable (${error.message})`);
        return null;
      }
    })
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Source status: current vs archived-source, derived from what actually exists.
// ---------------------------------------------------------------------------

const repoCache = new Map();

async function repoInfo(slug) {
  if (repoCache.has(slug)) return repoCache.get(slug);
  const info = fetchJson(`https://api.github.com/repos/${slug}`)
    .then((data) => ({ ok: true, defaultBranch: data.default_branch ?? "main" }))
    .catch(() => ({ ok: false }));
  repoCache.set(slug, info);
  return info;
}

async function commitSha(repo, branch) {
  try {
    const data = await fetchJson(
      `https://api.github.com/repos/${repo}/commits/${encodeURIComponent(branch)}`,
    );
    return data.sha;
  } catch {
    return undefined;
  }
}

async function monorepoPathExists(relPath) {
  const url =
    `https://api.github.com/repos/${SOURCE_REPO}/contents/` +
    `${relPath.split("/").map(encodeURIComponent).join("/")}?ref=${SOURCE_REF}`;
  try {
    await githubFetch(url, { auth: false });
    return true;
  } catch {
    return false;
  }
}

/**
 * A project's source has three honest states:
 *   current          the upstream entry exists and its source resolves
 *   archived-source  the entry was renamed/removed, or its source no longer exists
 * plus two human-only states the validator protects (set by hand in the case study):
 *   concept          never had a real implementation behind the narrative
 *   historical       kept deliberately as a written record; source state irrelevant
 */
async function deriveSourceStatuses(entries) {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const studies = readCaseStudies();
  const projects = {};
  let monorepoSha;

  for (const study of studies) {
    const authored = study.sourceStatus;
    const entry = byId.get(study.upstreamId);

    // Human judgments are never overwritten by derivation.
    if (authored === "concept" || authored === "historical") {
      projects[study.slug] = {
        derived: authored,
        reason:
          authored === "concept"
            ? "Authored as a concept — declared by the case study, not derived."
            : "Authored as a historical record — declared by the case study, not derived.",
      };
      continue;
    }

    if (!entry) {
      projects[study.slug] = {
        derived: "archived-source",
        reason: `'${study.upstreamId}' is no longer in the monorepo registry — renamed, retired, or migrated away.`,
      };
      continue;
    }

    if (entry.repo) {
      const info = await repoInfo(entry.repo);
      if (!info.ok) {
        projects[study.slug] = {
          derived: "archived-source",
          reason: `Repository ${entry.repo} does not exist or is not visible.`,
        };
        continue;
      }
      const branch = info.defaultBranch;
      const sha = await commitSha(entry.repo, branch);
      projects[study.slug] = {
        derived: "current",
        reason: `Source lives at ${entry.repo}@${branch}.`,
        repo: entry.repo,
        ref: branch,
        ...(sha ? { sha, shaUrl: `https://github.com/${entry.repo}/commit/${sha}` } : {}),
      };
      continue;
    }

    if (entry.path) {
      const exists = await monorepoPathExists(entry.path);
      if (!exists) {
        projects[study.slug] = {
          derived: "archived-source",
          reason: `${SOURCE_REPO}:${entry.path} no longer exists on ${SOURCE_REF}.`,
        };
        continue;
      }
      monorepoSha ??= await commitSha(SOURCE_REPO, SOURCE_REF);
      projects[study.slug] = {
        derived: "current",
        reason: `Source lives at ${SOURCE_REPO}:${entry.path} on ${SOURCE_REF}.`,
        repo: SOURCE_REPO,
        ref: SOURCE_REF,
        ...(monorepoSha ? { sha: monorepoSha } : {}),
      };
      continue;
    }

    // An entry with neither repo nor path cannot be checked — say so rather
    // than silently calling it current.
    projects[study.slug] = {
      derived: "archived-source",
      reason: `Upstream entry '${entry.id}' declares neither a repo nor a path to verify.`,
    };
  }

  return { checkedAt: new Date().toISOString(), projects };
}

// ---------------------------------------------------------------------------
// CI facts v2: standalone repos, last green run, artifacts before log parsing.
// ---------------------------------------------------------------------------

const TEST_PATTERNS = [
  /^\s*Tests\s+(\d+)\s+passed\s+\((\d+)\)/im,
  /^\s*Tests\s+.*?\((\d+)\)\s*$/im,
  /^#\s*tests?\s+(\d+)/im,
  /^#\s*pass\s+(\d+)/im,
  /^\s*Tests:\s+.*?(\d+)\s+total/im,
];

const FILE_PATTERNS = [/^\s*Test Files\s+\d+\s+passed\s+\((\d+)\)/im, /^\s*Test Files\s+.*?\((\d+)\)\s*$/im];

/**
 * Every line in an Actions job log starts with an ISO timestamp
 * (`2026-08-21T17:34:15.0726649Z # pass 182`), and test summaries are wrapped
 * in ANSI colour codes — both break line-anchored patterns. Strip them.
 */
function normaliseLogText(text) {
  return text
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, "")
    .replace(/^\d{4}-\d{2}-\d{2}T[^\s]+Z?\s+/gm, "");
}

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

const FACT_ARTIFACT_RE = /^(ci-facts|test-facts|test-results|benchmark-facts)\.json$/i;

/** Read a downloaded artifact zip's first JSON member via system unzip. */
async function readArtifactJson(downloadUrl) {
  const tmpZip = path.join(os.tmpdir(), `hb-artifact-${Date.now()}.zip`);
  try {
    const res = await githubFetch(downloadUrl);
    fs.writeFileSync(tmpZip, Buffer.from(await res.arrayBuffer()));
    const { stdout } = await execFileAsync("unzip", ["-p", tmpZip], {
      maxBuffer: 32 * 1024 * 1024,
      timeout: 60_000,
    });
    return JSON.parse(stdout);
  } finally {
    fs.rmSync(tmpZip, { force: true });
  }
}

async function listWorkflows(repo) {
  const data = await fetchJson(`https://api.github.com/repos/${repo}/actions/workflows?per_page=50`);
  return (data.workflows ?? []).filter((w) => w.state === "active");
}

function pickWorkflow(workflows, entry) {
  const wanted = entry.workflow ? path.basename(entry.workflow) : null;
  return (
    workflows.find((w) => wanted && path.basename(w.path) === wanted) ??
    workflows.find((w) => path.basename(w.path) === `${entry.id}.yml`) ??
    workflows.find((w) => path.basename(w.path) === `${entry.id}.yaml`) ??
    workflows.find((w) => w.name.toLowerCase().includes(entry.name.toLowerCase())) ??
    (workflows.length === 1 ? workflows[0] : undefined)
  );
}

async function latestRun(repo, workflowPath, status) {
  const url =
    `https://api.github.com/repos/${repo}/actions/workflows/` +
    `${encodeURIComponent(path.basename(workflowPath))}/runs` +
    `?per_page=1&status=completed${status ? `&status=${status}` : ""}`;
  const data = await fetchJson(url);
  return data.workflow_runs?.[0];
}

async function artifactFacts(repo, runId) {
  const data = await fetchJson(`https://api.github.com/repos/${repo}/actions/runs/${runId}/artifacts?per_page=50`);
  for (const artifact of data.artifacts ?? []) {
    if (!FACT_ARTIFACT_RE.test(artifact.name) || artifact.expired) continue;
    try {
      const parsed = await readArtifactJson(
        `https://api.github.com/repos/${repo}/actions/artifacts/${artifact.id}/zip`,
      );
      // Artifact contract: { tests?: { total, files? }, benchmarks?: { cases?, ... } }
      return { tests: parsed.tests, benchmarks: parsed.benchmarks, artifact: artifact.name };
    } catch (error) {
      log(`artifact ${artifact.name} unreadable (${error.message})`);
    }
  }
  return undefined;
}

async function logFacts(repo, runId) {
  const jobs = await fetchJson(`https://api.github.com/repos/${repo}/actions/runs/${runId}/jobs?per_page=20`);
  let combined = "";
  for (const job of jobs.jobs ?? []) {
    try {
      combined += await (
        await githubFetch(`https://api.github.com/repos/${repo}/actions/jobs/${job.id}/logs`)
      ).text();
      combined += "\n";
    } catch {
      // A single unreadable job should not sink the whole import.
    }
  }
  const total = extractCount(normaliseLogText(combined), TEST_PATTERNS);
  if (!total) return undefined;
  const files = extractCount(normaliseLogText(combined), FILE_PATTERNS);
  return { tests: files ? { total, files } : { total }, derivedFrom: "workflow job log" };
}

async function collectCiFacts(entries, statuses) {
  const facts = {};
  const workflowCache = new Map();
  let populated = 0;
  // Anything with its own repo can run CI, whatever its lifecycle label says —
  // after the migration every product is `external` with a repo field.
  const candidates = entries.filter(
    (entry) =>
      entry.repo ||
      entry.workflow ||
      ["active", "incubating", "maintenance"].includes(entry.lifecycle),
  );

  for (const entry of candidates) {
    const repo = entry.repo ?? SOURCE_REPO;
    try {
      if (!workflowCache.has(repo)) {
        workflowCache.set(repo, listWorkflows(repo).catch(() => []));
      }
      const workflows = await workflowCache.get(repo);
      const workflow = pickWorkflow(workflows, entry);
      if (!workflow) {
        log(`${entry.id}: no matching workflow in ${repo}`);
        continue;
      }

      const run = await latestRun(repo, workflow.path);
      const green = await latestRun(repo, workflow.path, "success").catch(() => undefined);
      if (!run && !green) {
        log(`${entry.id}: no completed runs for ${workflow.path}`);
        continue;
      }

      const record = {
        workflow: workflow.path,
        workflowUrl: `https://github.com/${repo}/blob/${green?.head_branch ?? "main"}/${workflow.path.replace(/^\.?\//, "")}`,
        repo,
        ...(run
          ? {
              runUrl: run.html_url,
              conclusion: run.conclusion,
              completedAt: run.updated_at,
              headSha: run.head_sha,
            }
          : {}),
        ...(green
          ? { lastSuccessAt: green.updated_at, greenRunUrl: green.html_url, greenSha: green.head_sha }
          : {}),
      };

      if (green && token) {
        const facts_ =
          (await artifactFacts(repo, green.id).catch(() => undefined)) ??
          (await logFacts(repo, green.id).catch(() => undefined));
        if (facts_) {
          if (facts_.tests) record.tests = facts_.tests;
          if (facts_.benchmarks) record.benchmarks = facts_.benchmarks;
          record.derivedFrom = facts_.artifact
            ? `Actions artifact ${facts_.artifact}`
            : facts_.derivedFrom;
        }
      } else if (green && !token) {
        record.derivedFrom = "run metadata only (no GITHUB_TOKEN — artifacts and logs not readable)";
      }

      facts[entry.id] = record;
      populated++;
      log(
        `${entry.id}: ${record.conclusion ?? "?"}` +
          `${record.tests ? ` · ${record.tests.total} tests` : ""}` +
          `${record.lastSuccessAt ? ` · last green ${record.lastSuccessAt.slice(0, 10)}` : ""}`,
      );
    } catch (error) {
      log(`${entry.id}: skipped (${error.message})`);
    }
  }

  return { facts, populated };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  // --- upstream registry ----------------------------------------------------
  const rawUrl = `https://raw.githubusercontent.com/${SOURCE_REPO}/${SOURCE_REF}/${SOURCE_PATH}`;
  log(`fetching ${rawUrl}`);

  let registry;
  try {
    registry = JSON.parse(await fetchRawText(rawUrl));
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

  fs.writeFileSync(path.join(outDir, "upstream.json"), `${JSON.stringify(snapshot, null, 2)}\n`);
  log(`wrote registry/upstream.json (${entries.length} entries)`);

  // --- evidence ledger ------------------------------------------------------
  const evidenceUrl = `https://raw.githubusercontent.com/${SOURCE_REPO}/${SOURCE_REF}/${EVIDENCE_PATH}`;
  try {
    const ledger = JSON.parse(await fetchRawText(evidenceUrl));
    const evidenceSnapshot = {
      _generated: "Written by scripts/import-registry.mjs. Do not edit by hand.",
      source: { repo: SOURCE_REPO, path: EVIDENCE_PATH, ref: SOURCE_REF },
      importedAt: new Date().toISOString(),
      statusValues: ledger.statusValues ?? {},
      claims: (ledger.claims ?? []).map((claim) => ({
        id: claim.id,
        product: claim.product,
        claim: claim.claim,
        status: claim.status,
        evidenceSource: claim.evidenceSource,
        sampleSize: claim.sampleSize,
        benchmark: claim.benchmark,
        lastUpdated: claim.lastUpdated,
        limitations: claim.limitations,
      })),
    };
    fs.writeFileSync(
      path.join(outDir, "evidence-ledger.json"),
      `${JSON.stringify(evidenceSnapshot, null, 2)}\n`,
    );
    log(`wrote registry/evidence-ledger.json (${evidenceSnapshot.claims.length} graded claims)`);
  } catch (error) {
    fail(`could not fetch evidence ledger: ${error.message}`);
    if (!fs.existsSync(path.join(outDir, "evidence-ledger.json"))) return;
    log("keeping the existing evidence-ledger.json");
  }

  // --- source status --------------------------------------------------------
  // Deriving status needs RELIABLE cross-repo reads. Anonymous access is too
  // rate-limited to distinguish "repo deleted" from "request dropped", and a
  // wrong archive is data corruption — so derivation runs only with an
  // authenticated token; otherwise the existing snapshot is kept, loudly.
  const statusPath = path.join(outDir, "source-status.json");
  let statuses;
  const readMode = await crossRepoReadMode();
  if (readMode === "authenticated") {
    statuses = await deriveSourceStatuses(entries);
    fs.writeFileSync(statusPath, `${JSON.stringify({
      _generated: "Written by scripts/import-registry.mjs. Do not edit by hand.",
      ...statuses,
    }, null, 2)}\n`);

    const archived = Object.entries(statuses.projects).filter(([, s]) => s.derived !== "current");
    log(
      `wrote registry/source-status.json (${Object.keys(statuses.projects).length} projects, ` +
        `${archived.length} not-current)`,
    );
    for (const [slug, status] of archived) {
      log(`  ${slug}: ${status.derived} — ${status.reason}`);
    }
  } else {
    if (fs.existsSync(statusPath)) {
    log(`cross-repo reads not authenticated (${readMode}) — keeping the existing source-status.json`);
    if (process.env.CI) {
      console.log("::warning::source-status not refreshed — set REGISTRY_TOKEN to a PAT with repo read access");
    }
    } else {
      fail("cannot derive source status and none exists yet — set GITHUB_TOKEN to a PAT with repo read access");
      return;
    }
  }

  // --- CI facts -------------------------------------------------------------
  if (!wantCi) {
    log("skipping CI facts (pass --ci to include them)");
    return;
  }

  if (!token) {
    // Reading Actions runs/logs for sibling repos needs a real token; the
    // repo-scoped default cannot, and anonymous runner calls are rate-limited
    // into uselessness. Keep the existing facts rather than degrading them.
    const msg =
      "registry:import:ci ran without a usable GITHUB_TOKEN — keeping the existing " +
      "ci-facts.json. Set the REGISTRY_TOKEN secret (PAT with public-repo read) to refresh them.";
    log(`WARNING: ${msg}`);
    if (process.env.CI) console.log(`::warning::${msg}`);
    return;
  }

  log("collecting CI facts (authenticated)");
  const { facts, populated } = await collectCiFacts(entries, statuses?.projects ?? {});

  if (populated === 0 && !allowEmpty) {
    fail(
      "--ci ran but produced zero workflow facts. That is unexpected: every active app " +
        "should have a workflow. Refusing to overwrite good data with an empty set — " +
        "check GITHUB_TOKEN and the upstream repos, or pass --allow-empty to accept it.",
    );
    return;
  }

  fs.writeFileSync(
    path.join(outDir, "ci-facts.json"),
    `${JSON.stringify(
      {
        _generated: "Written by scripts/import-registry.mjs --ci. Do not edit by hand.",
        importedAt: new Date().toISOString(),
        mode,
        facts,
      },
      null,
      2,
    )}\n`,
  );
  log(`wrote registry/ci-facts.json (${populated} workflows, mode=${mode})`);
}

main().catch((error) => {
  fail(error.stack ?? String(error));
});
