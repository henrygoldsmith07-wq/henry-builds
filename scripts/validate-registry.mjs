#!/usr/bin/env node
/**
 * Validates registry/case-studies/*.json against the rules the site relies on.
 * Exit 1 on any violation so CI gates on it.
 *
 * The rules exist so that a label on the site always means the same thing:
 * a "shipped" badge implies a public deployment, a number implies a stated
 * method and a reproducible source, and a claim implies something a reader
 * can go and check.
 *
 * Modes:
 *   node scripts/validate-registry.mjs             # offline checks (CI on every push)
 *   node scripts/validate-registry.mjs --upstream  # also verify repo paths still exist
 *                                                  # upstream via the GitHub API (scheduled)
 *
 * No dependencies — this has to run in a bare CI container.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const caseStudyDir = path.join(root, "registry/case-studies");
const upstreamPath = path.join(root, "registry/upstream.json");
const ciFactsPath = path.join(root, "registry/ci-facts.json");

const checkUpstream = process.argv.includes("--upstream");
const SOURCE_REPO = "henrygoldsmith07-wq/Claude-Code";
const SOURCE_REF = "main";
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";

const STAGES = ["research", "prototype", "beta", "shipped", "archived"];
const EVIDENCE_KINDS = ["repo", "ci", "benchmark", "doc", "screenshot", "video", "live"];

/**
 * What kind of code the site is presenting. Distinct from stage: stage says how
 * far the work got, source state says whether you can still go and read it.
 */
const SOURCE_STATES = [
  "current-source",
  "archived-source",
  "concept",
  "historical-case-study",
];

/** Stage → the evidence kind that must be present to earn that label. */
const STAGE_EVIDENCE = {
  shipped: "live",
  beta: "ci",
  prototype: "repo",
  research: null,
  archived: null,
};

/**
 * Generated-evidence freshness. CI facts older than this are expired: the site
 * must not display a green date from months ago as if it were current.
 */
const MAX_CI_FACTS_AGE_DAYS = 14;
/** Time-sensitive claims must be re-verified at least this often. */
const MAX_CLAIM_AGE_DAYS_DEFAULT = 180;

const MAX_FEATURED = 6;
const MIN_FEATURED = 5;

let errors = 0;
let warnings = 0;

function fail(msg) {
  console.error(`✗ ${msg}`);
  errors++;
}

function warn(msg) {
  console.warn(`  ! ${msg}`);
  warnings++;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`${path.relative(root, file)}: cannot parse — ${error.message}`);
    return null;
  }
}

function daysAgo(iso) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return NaN;
  return (Date.now() - then) / 86_400_000;
}

if (!fs.existsSync(caseStudyDir)) {
  fail("registry/case-studies does not exist. Run `bun run registry:import` first.");
  process.exit(1);
}

const upstream = fs.existsSync(upstreamPath) ? readJson(upstreamPath) : null;
if (!upstream) {
  fail("registry/upstream.json missing. Run `bun run registry:import`.");
  process.exit(1);
}

// --- generated CI facts -----------------------------------------------------
// Expected-but-empty is a failure, not a shrug: every published project with a
 // workflow must have a fact row, and the facts file itself must be fresh.
const ciFactsFile = fs.existsSync(ciFactsPath) ? readJson(ciFactsPath) : null;
if (!ciFactsFile || typeof ciFactsFile.facts !== "object") {
  fail("registry/ci-facts.json is missing or malformed. Run `bun run registry:import:ci`.");
}
const ciFactsAge = ciFactsFile?.importedAt ? daysAgo(ciFactsFile.importedAt) : NaN;
if (!Number.isFinite(ciFactsAge)) {
  fail("registry/ci-facts.json has no importedAt timestamp");
} else if (ciFactsAge > MAX_CI_FACTS_AGE_DAYS) {
  fail(
    `CI facts are stale (${Math.round(ciFactsAge)} days old, expiry ${MAX_CI_FACTS_AGE_DAYS}) — ` +
      "run `bun run registry:import:ci`",
  );
}
const facts = ciFactsFile?.facts ?? {};

const upstreamById = new Map((upstream.entries ?? []).map((e) => [e.id, e]));
const upstreamImportAge = upstream.importedAt ? daysAgo(upstream.importedAt) : NaN;
if (!Number.isFinite(upstreamImportAge) || upstreamImportAge > MAX_CI_FACTS_AGE_DAYS) {
  warn("registry/upstream.json is stale (>14 days) — lifecycle sync may have stopped running");
}

// --- upstream path verification (scheduled, networked) ----------------------
const upstreamPathCache = new Map();
async function upstreamPathExists(repoPath) {
  if (upstreamPathCache.has(repoPath)) return upstreamPathCache.get(repoPath);
  let ok = false;
  try {
    const headers = { "user-agent": "henry-builds-registry-validate" };
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetch(
      `https://api.github.com/repos/${SOURCE_REPO}/contents/${encodeURI(repoPath)}?ref=${SOURCE_REF}`,
      { headers },
    );
    ok = res.ok;
    if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") {
      throw new Error("GitHub API rate limit exhausted");
    }
  } catch (error) {
    warn(`could not verify ${repoPath} upstream — ${error.message}`);
    return null; // unknown ≠ missing; do not fail on our own outage
  }
  upstreamPathCache.set(repoPath, ok);
  return ok;
}

const files = fs
  .readdirSync(caseStudyDir)
  .filter((f) => f.endsWith(".json"))
  .sort();

if (files.length === 0) {
  fail("no case studies found in registry/case-studies");
  process.exit(1);
}

const seenSlugs = new Set();
const seenUpstreamIds = new Set();
let featuredCount = 0;
let expectedCiCount = 0;
let presentCiCount = 0;
const gated = [];
const contentGaps = [];
const pendingUpstreamChecks = [];

function collectEvidencePaths(project, cs) {
  const paths = [];
  const push = (p) => {
    if (typeof p === "string" && p.startsWith("apps/")) paths.push(p);
  };
  if (project.repo?.path) push(project.repo.path);
  for (const layer of cs.architecture?.layers ?? []) push(layer.path);
  const fromEvidence = (list) => (list ?? []).forEach((e) => push(e.path));
  fromEvidence(cs.architecture?.evidence);
  (cs.metrics ?? []).forEach((m) => fromEvidence(m.evidence));
  (cs.outcomes ?? []).forEach((o) => fromEvidence(o.evidence));
  return [...new Set(paths)];
}

function checkEvidenceList(list, where, { required = true } = {}) {
  if (!Array.isArray(list) || list.length === 0) {
    if (required) fail(`${where}: needs at least one evidence item`);
    return;
  }
  list.forEach((item, i) => {
    const at = `${where}.evidence[${i}]`;
    if (!item.kind || !EVIDENCE_KINDS.includes(item.kind)) {
      fail(`${at}: kind must be one of ${EVIDENCE_KINDS.join(", ")} (got ${item.kind})`);
    }
    if (!item.label) fail(`${at}: missing label`);
    if (!item.href && !item.path && !item.src) {
      fail(`${at}: must point somewhere — set href, path or src`);
    }
    if (item.kind === "live" && !item.href) {
      fail(`${at}: 'live' evidence must carry an href to the deployment`);
    }
    if (item.href && !/^https?:\/\//.test(item.href)) {
      fail(`${at}: href must be absolute (got ${item.href})`);
    }
    if (
      item.kind === "video" &&
      item.src &&
      !fs.existsSync(path.join(root, "public", item.src.replace(/^\//, "")))
    ) {
      fail(`${at}: video src '${item.src}' does not exist in public/`);
    }
  });
}

for (const file of files) {
  const full = path.join(caseStudyDir, file);
  const project = readJson(full);
  if (!project) continue;
  const id = path.basename(file, ".json");

  // --- identity -----------------------------------------------------------
  if (!project.slug) fail(`${id}: missing slug`);
  if (project.slug !== id) fail(`${id}: slug '${project.slug}' must match the filename`);
  if (seenSlugs.has(project.slug)) fail(`${id}: duplicate slug`);
  seenSlugs.add(project.slug);

  if (!project.upstreamId) {
    fail(`${id}: missing upstreamId`);
  } else {
    if (seenUpstreamIds.has(project.upstreamId)) {
      fail(`${id}: duplicate upstreamId '${project.upstreamId}'`);
    }
    seenUpstreamIds.add(project.upstreamId);

    const historical = project.sourceState === "historical-case-study";
    if (!upstreamById.has(project.upstreamId) && !historical) {
      fail(
        `${id}: upstreamId '${project.upstreamId}' is not in the monorepo registry — ` +
          `its source was removed or renamed. Run \`bun run archive:removed\` to move it to ` +
          `"historical-case-study", or delete this file.`,
      );
    }
  }

  // --- source state ---------------------------------------------------------
  if (!project.sourceState) {
    fail(`${id}: missing sourceState (one of ${SOURCE_STATES.join(", ")})`);
  } else if (!SOURCE_STATES.includes(project.sourceState)) {
    fail(`${id}: sourceState must be one of ${SOURCE_STATES.join(", ")} (got ${project.sourceState})`);
  }

  for (const field of ["name", "tagline", "summary", "category", "accent"]) {
    if (!project[field]) fail(`${id}: missing ${field}`);
  }

  // --- stage --------------------------------------------------------------
  if (!STAGES.includes(project.stage)) {
    fail(`${id}: stage must be one of ${STAGES.join(", ")} (got ${project.stage})`);
  }

  // --- limitations are mandatory, not optional ------------------------------
  if (!Array.isArray(project.caseStudy?.limitations) || project.caseStudy.limitations.length === 0) {
    fail(`${id}: caseStudy.limitations must list at least one honest limitation`);
  }

  // --- authorship ---------------------------------------------------------
  const authorship = project.authorship;
  if (!authorship?.role) {
    fail(`${id}: authorship.role is required — state plainly what you built`);
  }
  if (!Array.isArray(authorship?.built) || authorship.built.length === 0) {
    fail(`${id}: authorship.built must list at least one thing`);
  }
  if (!Array.isArray(authorship?.notBuilt)) {
    fail(`${id}: authorship.notBuilt is required (use [] only if nothing was borrowed)`);
  }

  // --- publish gate -------------------------------------------------------
  if (project.publish === false) {
    if (!project.publishGate) {
      fail(`${id}: publish is false, so publishGate must explain why and what opens it`);
    }
    const lifecycle = upstreamById.get(project.upstreamId)?.lifecycle;
    if (lifecycle === "active" || lifecycle === "maintenance") {
      gated.push(
        `${project.name}: upstream lifecycle is now '${lifecycle}' — the gate has opened ` +
          `and it will publish on the next build. Set "publish": true to make that explicit.`,
      );
    }
  }

  if (project.featured) {
    featuredCount++;
    if (project.publish === false) {
      fail(`${id}: cannot be featured while publish is false`);
    }
  }

  const cs = project.caseStudy;
  if (!cs) {
    fail(`${id}: missing caseStudy`);
    continue;
  }
  if (!cs.problem) fail(`${id}: caseStudy.problem is required`);
  if (!cs.approach) fail(`${id}: caseStudy.approach is required`);

  // --- CI facts coverage: expected vs present ------------------------------
  const entry = upstreamById.get(project.upstreamId);
  const publishedHere = project.publish !== false;
  if (publishedHere && project.sourceState === "current-source" && entry?.workflow) {
    expectedCiCount++;
    const fact = facts[project.upstreamId];
    if (!fact) {
      fail(
        `${id}: no CI fact for '${project.upstreamId}' even though its workflow ` +
          `(${entry.workflow}) should have been imported — CI evidence unexpectedly empty`,
      );
    } else if (fact.carriedForward) {
      warn(`${id}: CI fact carried forward from an earlier import (${fact.carriedReason ?? "unknown reason"})`);
    } else {
      presentCiCount++;
    }
  }

  // --- stage must be earned ----------------------------------------------
  const allEvidence = [
    // A top-level repo pointer is evidence in its own right.
    ...(project.repo?.href ? [{ kind: "repo", ...project.repo }] : []),
    ...(project.liveUrl ? [{ kind: "live", href: project.liveUrl }] : []),
    ...(cs.architecture?.evidence ?? []),
    ...(cs.metrics ?? []).flatMap((m) => m.evidence ?? []),
    ...(cs.outcomes ?? []).flatMap((o) => o.evidence ?? []),
  ];
  const requiredKind = STAGE_EVIDENCE[project.stage];
  if (requiredKind && !allEvidence.some((e) => e?.kind === requiredKind)) {
    fail(
      `${id}: stage '${project.stage}' requires at least one '${requiredKind}' evidence item, ` +
        `and none was found`,
    );
  }
  if (project.stage === "shipped" && !project.liveUrl) {
    fail(`${id}: stage 'shipped' requires a liveUrl`);
  }
  if (project.liveUrl && !/^https?:\/\//.test(project.liveUrl)) {
    fail(`${id}: liveUrl must be absolute`);
  }
  if (project.stage === "archived" && project.sourceState === "current-source") {
    fail(`${id}: stage 'archived' requires sourceState 'archived-source' or 'historical-case-study'`);
  }

  // --- claims must carry evidence ----------------------------------------
  (cs.outcomes ?? []).forEach((outcome, i) => {
    if (!outcome.statement) fail(`${id}: caseStudy.outcomes[${i}] missing statement`);
    checkEvidenceList(outcome.evidence, `${id}.outcomes[${i}]`);

    // Freshness: time-sensitive claims expire unless re-verified.
    const maxAge = outcome.freshnessDays ?? MAX_CLAIM_AGE_DAYS_DEFAULT;
    const verifiedAt =
      outcome.lastVerified ??
      outcome.evidence?.find((e) => e.verifiedAt)?.verifiedAt ??
      null;
    if (outcome.timeSensitive && !verifiedAt) {
      fail(
        `${id}: outcomes[${i}] declares timeSensitive but carries no lastVerified date — ` +
          "time-sensitive claims must say when they were last checked",
      );
    }
    if (verifiedAt) {
      const age = daysAgo(verifiedAt);
      if (Number.isFinite(age) && age > maxAge) {
        fail(
          `${id}: outcomes[${i}] verification is ${Math.round(age)} days old ` +
            `(freshness window ${maxAge}) — re-verify or update the claim`,
        );
      }
    }
  });

  // --- numbers must state a method ---------------------------------------
  (cs.metrics ?? []).forEach((metric, i) => {
    const at = `${id}.metrics[${i}]`;
    if (!metric.label) fail(`${at}: missing label`);
    if (!metric.value) fail(`${at}: missing value`);
    if (!metric.method || metric.method.length < 20) {
      fail(`${at}: every number needs a specific 'method' saying how it was measured`);
    }
    checkEvidenceList(metric.evidence, at);
  });

  if (cs.architecture) {
    if (!cs.architecture.summary) fail(`${id}: architecture.summary is required`);
    if (!Array.isArray(cs.architecture.layers) || cs.architecture.layers.length < 2) {
      fail(`${id}: architecture.layers needs at least two layers to be worth drawing`);
    }
    checkEvidenceList(cs.architecture.evidence, `${id}.architecture`);
  }

  // --- visuals must not overclaim ----------------------------------------
  (cs.visuals ?? []).forEach((visual, i) => {
    const at = `${id}.visuals[${i}]`;
    if (visual.kind === "screenshot") {
      if (!visual.src) fail(`${at}: screenshot needs a src`);
      else if (!fs.existsSync(path.join(root, "public", visual.src.replace(/^\//, "")))) {
        fail(`${at}: screenshot src '${visual.src}' does not exist in public/`);
      }
    } else if (visual.kind === "illustration") {
      if (!visual.preview) fail(`${at}: illustration needs a preview kind`);
      if (visual.caption && !/not a screenshot|illustration/i.test(visual.caption)) {
        fail(`${at}: an illustration's caption must say it is not a screenshot`);
      }
    } else {
      fail(`${at}: kind must be 'screenshot' or 'illustration'`);
    }
    if (!visual.alt) fail(`${at}: missing alt text`);
  });

  // --- benchmark charts must rest on genuine data --------------------------
  if ((cs.benchmarkChart ?? null) !== null && typeof cs.benchmarkChart === "object") {
    const bc = cs.benchmarkChart;
    const at = `${id}.benchmarkChart`;
    if (!bc.title) fail(`${at}: missing title`);
    if (!Array.isArray(bc.series) || bc.series.length === 0) {
      fail(`${at}: series must contain at least one point`);
    } else {
      bc.series.forEach((point, i) => {
        if (typeof point.label !== "string" || typeof point.value !== "number") {
          fail(`${at}.series[${i}]: needs a label and a numeric value`);
        }
      });
    }
    checkEvidenceList(bc.evidence, at);
    if (!bc.unit) fail(`${at}: missing unit (what the numbers measure)`);
  }

  // --- insight lifecycle states must be checkable ------------------------
  if (cs.insightLifecycle) {
    const il = cs.insightLifecycle;
    const at = `${id}.insightLifecycle`;
    if (!il.summary) fail(`${at}: missing summary`);
    if (!Array.isArray(il.states) || il.states.length < 2) {
      fail(`${at}: states needs at least two states to be worth drawing`);
    } else {
      const names = new Set(il.states.map((s) => s.state));
      il.states.forEach((s, i) => {
        const sat = `${at}.states[${i}]`;
        if (!s.state) fail(`${sat}: missing state name`);
        if (!s.meaning) fail(`${sat}: missing meaning`);
        if (!s.entry) fail(`${sat}: missing entry`);
        if (!Array.isArray(s.next)) {
          fail(`${sat}: next must be an array`);
        } else {
          s.next.forEach((to) => {
            if (!names.has(to)) {
              fail(`${sat}: next '${to}' does not name a state in states`);
            }
          });
        }
      });
    }
    if (!Array.isArray(il.rules) || il.rules.length === 0) {
      fail(`${at}: rules must list at least one rule`);
    }
    checkEvidenceList(il.evidence, at);
  }

  // --- trade-offs must name a cost ---------------------------------------
  (cs.tradeoffs ?? []).forEach((t, i) => {
    const at = `${id}.tradeoffs[${i}]`;
    if (!t.choice) fail(`${at}: missing choice`);
    if (!t.gained) fail(`${at}: missing gained`);
    if (!t.gaveUp) fail(`${at}: a trade-off with nothing given up is not a trade-off`);
  });

  (cs.failedApproaches ?? []).forEach((f, i) => {
    const at = `${id}.failedApproaches[${i}]`;
    if (!f.approach) fail(`${at}: missing approach`);
    if (!f.whyItFailed) fail(`${at}: missing whyItFailed`);
    if (!f.whatItChanged) fail(`${at}: missing whatItChanged`);
  });

  // --- queue repo-path checks for --upstream mode --------------------------
  for (const repoPath of collectEvidencePaths(project, cs)) {
    pendingUpstreamChecks.push({ id, repoPath });
  }

  // --- content gaps on featured work (reported, not fatal) ---------------
  if (project.featured) {
    if (!cs.visuals?.some((v) => v.kind === "screenshot")) {
      contentGaps.push(`${project.name}: no real screenshot`);
    }
    if (!cs.video) contentGaps.push(`${project.name}: no demo video`);
    if (!cs.failedApproaches?.length) {
      contentGaps.push(`${project.name}: no failed approaches recorded`);
    }
    if (!cs.lessons?.length) contentGaps.push(`${project.name}: no lessons recorded`);
    if (!project.liveUrl) contentGaps.push(`${project.name}: no liveUrl`);
  }
}

// --- site-wide rules ------------------------------------------------------
if (featuredCount > MAX_FEATURED) {
  fail(`${featuredCount} projects are featured; the landing page allows at most ${MAX_FEATURED}`);
}
if (featuredCount < MIN_FEATURED) {
  fail(`${featuredCount} projects are featured; feature at least ${MIN_FEATURED}`);
}

// The import must never silently come back empty: if workflows exist upstream
// but zero facts arrived, the evidence pipeline itself is broken.
if (expectedCiCount > 0 && presentCiCount === 0) {
  fail(
    `expected CI evidence for ${expectedCiCount} project(s) but collected none — ` +
      "the CI-facts pipeline is broken (token expired? rate-limited? workflows renamed?)",
  );
}

// --- scheduled upstream path verification ---------------------------------
if (checkUpstream) {
  console.log(`\nvalidate-registry: verifying ${pendingUpstreamChecks.length} repo path(s) upstream…`);
  for (const { id, repoPath } of pendingUpstreamChecks) {
    const exists = await upstreamPathExists(repoPath);
    if (exists === false) {
      fail(`${id}: repo path '${repoPath}' does not exist on ${SOURCE_REPO}@${SOURCE_REF}`);
    } else if (exists === true) {
      console.log(`  ✓ ${repoPath}`);
    }
  }
}

// --- report ---------------------------------------------------------------
console.log(
  `validate-registry: ${files.length} case studies, ${featuredCount} featured, ` +
    `CI facts ${presentCiCount}/${expectedCiCount} expected, ` +
    `${errors} error(s), ${warnings} warning(s)`,
);

if (gated.length) {
  console.log("\nPublish gates that have opened:");
  gated.forEach((g) => console.log(`  → ${g}`));
}

if (contentGaps.length) {
  console.log("\nContent gaps on featured work (not failures — these need source material):");
  contentGaps.forEach((g) => console.log(`  · ${g}`));
}

process.exit(errors > 0 ? 1 : 0);
