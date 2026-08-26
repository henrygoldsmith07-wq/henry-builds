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
 * No dependencies — this has to run in a bare CI container.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const caseStudyDir = path.join(root, "registry/case-studies");
const upstreamPath = path.join(root, "registry/upstream.json");
const ledgerPath = path.join(root, "registry/evidence-ledger.json");
const ciFactsPath = path.join(root, "registry/ci-facts.json");
const sourceStatusPath = path.join(root, "registry/source-status.json");

const STAGES = ["research", "prototype", "beta", "shipped", "archived"];
const EVIDENCE_KINDS = ["repo", "ci", "benchmark", "doc", "screenshot", "video", "live"];

/** Stage → the evidence kind that must be present to earn that label. */
const STAGE_EVIDENCE = {
  shipped: "live",
  beta: "ci",
  prototype: "repo",
  research: null,
  archived: null,
};

/**
 * Captures that rot have a shelf life. A screenshot from two years ago does
 * not evidence today's UI, and a benchmark from before a rewrite evidences
 * nothing at all.
 */
const FRESH_KINDS = new Set(["screenshot", "video", "benchmark"]);
const MAX_EVIDENCE_AGE_DAYS = 90;
const MAX_VERIFICATION_AGE_DAYS = 365;
/** Operational facts (CI/deploy snapshots) older than this stop being news. */
const MAX_FACTS_AGE_DAYS = 14;
/** A green run older than this behind a failed latest run stops being news. */
const RED_CI_STALE_DAYS = 30;

/** Kinds whose very point is that CI ran them — empty facts are suspicious. */
const CI_DEPENDENT_KINDS = new Set(["ci", "benchmark"]);

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

function daysSince(isoDate) {
  const then = new Date(isoDate);
  if (Number.isNaN(then.getTime())) return NaN;
  return Math.floor((Date.now() - then.getTime()) / 86_400_000);
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

// --- generated layers this validator enforces against ----------------------
const ledger = fs.existsSync(ledgerPath) ? readJson(ledgerPath) : null;
if (!ledger?.claims?.length) {
  fail("registry/evidence-ledger.json missing or empty. Run `bun run registry:import`.");
}
const ciFactsFile = fs.existsSync(ciFactsPath) ? readJson(ciFactsPath) : null;
if (!ciFactsFile?.facts) {
  fail("registry/ci-facts.json missing or malformed. Run `bun run registry:import --ci`.");
}
const sourceStatuses = fs.existsSync(sourceStatusPath) ? readJson(sourceStatusPath) : null;
if (!sourceStatuses?.projects) {
  fail("registry/source-status.json missing or malformed. Run `bun run registry:import`.");
}

const ciMode = ciFactsFile?.mode ?? "anonymous";
const ciFactsById = ciFactsFile?.facts ?? {};
const statusBySlug = sourceStatuses?.projects ?? {};
const ledgerClaims = ledger?.claims ?? [];
const ledgerByProduct = new Map();
for (const claim of ledgerClaims) {
  const list = ledgerByProduct.get(claim.product) ?? [];
  list.push(claim);
  ledgerByProduct.set(claim.product, list);
}
const ledgerById = new Map(ledgerClaims.map((c) => [c.id, c]));

/**
 * Conservative capability-overlap test: does a case-study statement appear to
 * assert the same thing an `insufficient-evidence` ledger claim describes?
 * Content-word overlap only, so reworded-but-honest copy passes while a
 * genuine repetition of the unevidenced capability fails.
 */
const STOPWORDS = new Set(
  "the a an and or of to in for with on at by from as is are was were be been being that this these those it its their there than then more most less least not no any all can could may might will would should shall do does did done has have had having".split(
    " ",
  ),
);

function contentWords(text) {
  return new Set(
    (text.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? []).filter((w) => !STOPWORDS.has(w)),
  );
}

function overlapsInsufficientClaim(statement, insufficientClaims) {
  const words = contentWords(statement);
  for (const claim of insufficientClaims) {
    const claimWords = [...contentWords(`${claim.claim} ${claim.benchmark ?? ""}`)];
    if (claimWords.length === 0) continue;
    const hit = claimWords.filter((w) => words.has(w)).length;
    if (hit / claimWords.length >= 0.5) return claim;
  }
  return undefined;
}

const upstreamById = new Map((upstream.entries ?? []).map((e) => [e.id, e]));

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
const gated = [];
const contentGaps = [];

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
  if (project.slug && !/^[a-z0-9][a-z0-9-]*$/.test(project.slug)) {
    fail(`${id}: slug '${project.slug}' must be lowercase letters, digits and dashes`);
  }
  if (seenSlugs.has(project.slug)) fail(`${id}: duplicate slug`);
  seenSlugs.add(project.slug);

  // --- source status: derived reality beats authored narrative -------------
  const derivedStatus = statusBySlug[project.slug]?.derived;
  if (!derivedStatus) {
    fail(
      `${id}: no entry in registry/source-status.json — run \`bun run registry:import\` ` +
        `so the source can be verified before publishing`,
    );
  } else if (derivedStatus === "archived-source") {
    // Honest archive is fine, but it must not pretend to be live work.
    if (project.stage !== "archived") {
      fail(
        `${id}: source is archived upstream (${statusBySlug[project.slug].reason}) ` +
          `but stage is '${project.stage}'. Set "stage": "archived".`,
      );
    }
    if (project.featured) {
      fail(`${id}: cannot be featured while its source is archived`);
    }
  }
  for (const declared of ["current", "archived-source"]) {
    if (project.sourceStatus === declared) {
      fail(
        `${id}: sourceStatus '${declared}' is derived by the importer and cannot be ` +
          `claimed by hand — only 'concept' or 'historical' are author declarations`,
      );
    }
  }

  if (!project.upstreamId) {
    fail(`${id}: missing upstreamId`);
  } else {
    if (seenUpstreamIds.has(project.upstreamId)) {
      fail(`${id}: duplicate upstreamId '${project.upstreamId}'`);
    }
    seenUpstreamIds.add(project.upstreamId);
    if (!upstreamById.has(project.upstreamId)) {
      const message =
        `${id}: upstreamId '${project.upstreamId}' is not in the monorepo registry — ` +
        `it was renamed or removed upstream`;
      // A deliberate archive is the correct response to upstream removal;
      // anything still claiming live work is not.
      if (project.stage === "archived") {
        warn(`${message} — kept deliberately as an archive record`);
      } else {
        fail(message);
      }
    }
  }

  for (const field of ["name", "tagline", "summary", "category", "accent"]) {
    if (!project[field]) fail(`${id}: missing ${field}`);
  }

  // --- stage --------------------------------------------------------------
  if (!STAGES.includes(project.stage)) {
    fail(`${id}: stage must be one of ${STAGES.join(", ")} (got ${project.stage})`);
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

  // --- stage must be earned ----------------------------------------------
  const allEvidence = [
    // A top-level repo pointer is evidence in its own right.
    ...(project.repo?.href ? [{ kind: "repo", ...project.repo }] : []),
    ...(project.liveUrl ? [{ kind: "live", href: project.liveUrl }] : []),
    ...(cs.architecture?.evidence ?? []),
    ...(cs.metrics ?? []).flatMap((m) => m.evidence ?? []),
    ...(cs.outcomes ?? []).flatMap((o) => o.evidence ?? []),
    ...(cs.insightLifecycle?.evidence ?? []),
  ];
  const requiredKind = STAGE_EVIDENCE[project.stage];
  if (requiredKind && !allEvidence.some((e) => e?.kind === requiredKind)) {
    fail(
      `${id}: stage '${project.stage}' requires at least one '${requiredKind}' evidence item, ` +
        `and none was found`,
    );
  }
  if (project.liveUrl && !/^https?:\/\//.test(project.liveUrl)) {
    fail(`${id}: liveUrl must be absolute`);
  }
  if (project.stage === "shipped" && !project.liveUrl) {
    fail(`${id}: stage 'shipped' requires a liveUrl`);
  }
  if (project.stage === "research" && allEvidence.length === 0) {
    fail(`${id}: stage 'research' requires at least one evidence item of any kind`);
  }
  if (project.stage === "archived") {
    const lifecycle = upstreamById.get(project.upstreamId)?.lifecycle;
    const sourceGone = derivedStatus === "archived-source";
    if (lifecycle !== "archived" && lifecycle !== "superseded" && !sourceGone) {
      fail(
        `${id}: stage 'archived' requires the upstream lifecycle to be archived/superseded ` +
          `or the source to be gone (got '${lifecycle}', source ${derivedStatus ?? "unknown"})`,
      );
    }
  }

  // --- claims must carry evidence ----------------------------------------
  const insufficientClaims = (ledgerByProduct.get(project.upstreamId) ?? []).filter(
    (c) => c.status === "insufficient-evidence",
  );
  const productClaims = ledgerByProduct.get(project.upstreamId) ?? [];

  (cs.outcomes ?? []).forEach((outcome, i) => {
    if (!outcome.statement) fail(`${id}: caseStudy.outcomes[${i}] missing statement`);
    checkEvidenceList(outcome.evidence, `${id}.outcomes[${i}]`);

    // --- the ledger is the arbiter of capability claims -------------------
    if (outcome.ledgerClaimId) {
      const claim = ledgerById.get(outcome.ledgerClaimId);
      if (!claim) {
        fail(
          `${id}.outcomes[${i}]: ledgerClaimId '${outcome.ledgerClaimId}' does not exist ` +
            `in the evidence ledger`,
        );
      } else if (claim.product !== project.upstreamId) {
        fail(
          `${id}.outcomes[${i}]: ledgerClaimId '${outcome.ledgerClaimId}' belongs to ` +
            `'${claim.product}', not '${project.upstreamId}'`,
        );
      } else if (claim.status === "insufficient-evidence") {
        fail(
          `${id}.outcomes[${i}]: the evidence registry grades this capability as ` +
            `'insufficient-evidence'. Rewrite the statement so it does not claim it, ` +
            `or improve the grade upstream first.`,
        );
      }
    } else {
      const clash = overlapsInsufficientClaim(outcome.statement ?? "", insufficientClaims);
      if (clash) {
        fail(
          `${id}.outcomes[${i}]: statement appears to claim a capability the evidence ` +
            `registry grades 'insufficient-evidence' ('${clash.id}'). Link a passing ` +
            `ledgerClaimId, or rewrite the claim.`,
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
      if (!visual.capturedAt) {
        warn(`${at}: screenshot has no capturedAt — stale captures cannot be detected`);
      }
    } else if (visual.kind === "illustration") {
      if (!visual.preview) fail(`${at}: illustration needs a preview kind`);
      if (!visual.caption) {
        fail(
          `${at}: an illustration must carry a caption saying it is not a screenshot — ` +
            `omitting one is how mockups get mistaken for the product`,
        );
      } else if (!/not a screenshot|illustration/i.test(visual.caption)) {
        fail(`${at}: an illustration's caption must say it is not a screenshot`);
      }
    } else {
      fail(`${at}: kind must be 'screenshot' or 'illustration'`);
    }
    if (!visual.alt) fail(`${at}: missing alt text`);
  });

  // --- freshness: evidence that rots has a shelf life ----------------------
  const everyEvidenceItem = [
    ...(cs.metrics ?? []).flatMap((m, i) =>
      (m.evidence ?? []).map((e) => [`metrics[${i}]`, e]),
    ),
    ...(cs.outcomes ?? []).flatMap((o, i) =>
      (o.evidence ?? []).map((e) => [`outcomes[${i}]`, e]),
    ),
    ...(cs.architecture?.evidence ?? []).map((e) => ["architecture", e]),
    ...(cs.insightLifecycle?.evidence ?? []).map((e) => ["insightLifecycle", e]),
    ...(cs.failedApproaches ?? []).flatMap((f, i) =>
      (f.evidence ?? []).map((e) => [`failedApproaches[${i}]`, e]),
    ),
  ];
  for (const [section, item] of everyEvidenceItem) {
    const at = `${id}.${section}.evidence[${item.label}]`;
    if (item.expiresAt && daysSince(item.expiresAt) > 0) {
      fail(`${at}: expired on ${item.expiresAt} — refresh or remove the evidence`);
    }
    if (FRESH_KINDS.has(item.kind)) {
      if (!item.capturedAt) {
        warn(`${at}: ${item.kind} evidence has no capturedAt date`);
      } else {
        const age = daysSince(item.capturedAt);
        if (Number.isNaN(age)) {
          fail(`${at}: capturedAt '${item.capturedAt}' is not a valid ISO date`);
        } else if (age > MAX_EVIDENCE_AGE_DAYS) {
          fail(
            `${at}: ${item.kind} evidence is ${age} days old (captured ${item.capturedAt}) ` +
              `— recapture it or lower the claim`,
          );
        }
      }
    }
  }

  // --- CI-dependent evidence must actually have facts behind it ------------
  const ciCited = everyEvidenceItem.some(([, e]) => CI_DEPENDENT_KINDS.has(e.kind));
  if (ciCited && derivedStatus === "current" && project.stage !== "research") {
    const fact = ciFactsById[project.upstreamId];
    if (!fact && ciMode === "authenticated") {
      fail(
        `${id}: cites CI evidence but the importer found no workflow for '${project.upstreamId}' ` +
          `(mode=${ciMode}). Fix the upstream workflow or drop the claim.`,
      );
    } else if (!fact) {
      warn(
        `${id}: cites CI evidence but CI facts could not be collected anonymously this run`,
      );
    }
  }

  // --- limitations and verification dates are part of the contract --------
  if (!Array.isArray(cs.limitations) || cs.limitations.length === 0) {
    fail(`${id}: caseStudy.limitations must state at least one known limit`);
  }
  if (!cs.lastVerifiedAt) {
    warn(`${id}: caseStudy.lastVerifiedAt missing — claims have no stated check date`);
  } else {
    const age = daysSince(cs.lastVerifiedAt);
    if (Number.isNaN(age)) {
      fail(`${id}: lastVerifiedAt is not a valid ISO date`);
    } else if (age > MAX_VERIFICATION_AGE_DAYS) {
      fail(
        `${id}: claims were last verified against code ${age} days ago — re-verify before publishing`,
      );
    }
  }

  // --- facts freshness: operational data must keep flowing -----------------
  const fact = ciFactsById[project.upstreamId];
  if (
    derivedStatus === "current" &&
    project.stage !== "research" &&
    ciFactsFile?.importedAt &&
    daysSince(ciFactsFile.importedAt) > MAX_FACTS_AGE_DAYS
  ) {
    warn(
      `${id}: CI facts are older than ${MAX_FACTS_AGE_DAYS} days — run registry:import --ci`,
    );
  }

  // --- red upstream CI behind CI-cited claims ------------------------------
  if (fact && derivedStatus === "current") {
    everyEvidenceItem.forEach(([section, item]) => {
      if (item.kind !== "ci" || fact.conclusion !== "failure") return;
      const lastGreenDays = fact.lastSuccessAt ? daysSince(fact.lastSuccessAt) : NaN;
      if (!Number.isNaN(lastGreenDays) && lastGreenDays <= RED_CI_STALE_DAYS) return;
      warn(
        `${id}: cites CI evidence (${section} '${item.label}') but the latest upstream ` +
          `run failed` +
          (fact.lastSuccessAt
            ? ` and the last green run was ${fact.lastSuccessAt.slice(0, 10)} (${lastGreenDays} days ago)`
            : " with no recorded green run") +
          ` — recapture or lower the stage`,
      );
    });
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
    if (f.evidence) checkEvidenceList(f.evidence, at, { required: false });
  });

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

// --- report ---------------------------------------------------------------
console.log(
  `validate-registry: ${files.length} case studies, ${featuredCount} featured, ` +
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

// --- evidence-layer report: what the site will display --------------------
const insufficientProducts = new Map();
for (const claim of ledgerClaims) {
  if (claim.status === "insufficient-evidence") {
    const list = insufficientProducts.get(claim.product) ?? [];
    list.push(claim.id);
    insufficientProducts.set(claim.product, list);
  }
}
if (insufficientProducts.size > 0) {
  console.log("\nCapabilities the evidence registry grades 'insufficient-evidence' (claims blocked):");
  for (const [product, ids] of insufficientProducts) {
    console.log(`  · ${product}: ${ids.join(", ")}`);
  }
}

console.log("\nPer-project verification state (shown on the site):");
for (const file of files) {
  const project = JSON.parse(fs.readFileSync(path.join(caseStudyDir, file), "utf8"));
  if (project.publish === false) continue;
  const fact = ciFactsById[project.upstreamId];
  const status = statusBySlug[project.slug];
  const sha = status?.sha ? ` @ ${status.sha.slice(0, 7)}` : "";
  const verified = project.caseStudy?.lastVerifiedAt ?? "never";
  const green = fact?.lastSuccessAt ? fact.lastSuccessAt.slice(0, 10) : fact ? "no green run" : "no CI";
  console.log(
    `  · ${project.slug}: source=${status?.derived ?? "?"}${sha}, last green CI=${green}, claims verified=${verified}`,
  );
}

process.exit(errors > 0 ? 1 : 0);
