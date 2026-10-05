#!/usr/bin/env node
/**
 * Integration tests for the evidence machinery.
 *
 * These scripts are the site's honesty engine: validate-registry decides what
 * may be claimed, audit-claims bans self-promotion, check-pipeline-health
 * fails the sync when repository access dies. None of that may regress
 * silently, so each script is executed as a real subprocess against a
 * purpose-built fixture registry and its exit code and output are asserted.
 *
 * Zero dependencies — runs under node or bun:
 *
 *   node scripts/run-evidence-tests.mjs
 */

import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
let passed = 0;
let failed = 0;

function script(...segments) {
  return path.join(repoRoot, ...segments);
}

async function runNode(cwd, scriptPath, env = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath], {
      cwd,
      env: { ...process.env, ...env },
      timeout: 30_000,
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    return {
      code: error.code ?? 1,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? String(error.message),
    };
  }
}

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function daysAgoIso(days) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/**
 * Put a placeholder PNG where a case study says a screenshot lives, so the
 * validator's "does this file exist in public/" rule is exercised rather than
 * short-circuited by the missing-file failure.
 *
 * Takes the part after `/media/`; the case studies reference `/media/<slug>/<file>`.
 */
function writeCapture(dir, relative) {
  const file = path.join(dir, "public", "media", relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from("89504e470d0a1a0a", "hex"));
}

/** A case study that passes every validator rule on its own. */
function validStudy(slug, overrides = {}) {
  const study = {
    slug,
    upstreamId: slug,
    name: slug,
    tagline: `${slug} tagline`,
    summary: `${slug} summary`,
    stage: "prototype",
    category: "Testing",
    accent: "#ffffff",
    featured: false,
    sourceState: "current-source",
    authorship: {
      role: "Sole author",
      built: ["the thing"],
      notBuilt: [],
    },
    caseStudy: {
      problem: "problem",
      approach: "approach",
      metrics: [],
      outcomes: [
        {
          statement: "an evidenced outcome",
          evidence: [{ kind: "repo", label: "source", href: "https://github.com/x/y" }],
        },
      ],
      visuals: [],
      limitations: ["known limit"],
      // Date-only, like every real case study. The validator requires a
      // YYYY-MM-DD string, not a full timestamp.
      lastVerifiedAt: daysAgoIso(1).slice(0, 10),
    },
  };
  return { ...study, ...overrides };
}

function minimalRegistry(count = 5) {
  const studies = [];
  for (let i = 0; i < count; i++) {
    const slug = `proj-${i}`;
    const study = validStudy(slug);
    // The validator refuses an unearned stage and requires 5-6 featured; the
    // cheapest honest way to satisfy both is research-stage featured rows.
    study.stage = "research";
    study.featured = true;
    study.caseStudy.metrics.push({
      label: "Automated checks",
      value: "1",
      method: "counted by hand against this very fixture file",
      evidence: [{ kind: "doc", label: "self", href: "https://example.com/self" }],
    });
    studies.push(study);
  }
  return studies;
}

function writeRegistry(dir, studies) {
  for (const study of studies) {
    writeJson(path.join(dir, "registry", "case-studies", `${study.slug}.json`), study);
  }
  writeJson(path.join(dir, "registry", "upstream.json"), {
    _generated: true,
    importedAt: new Date().toISOString(),
    lifecycleStates: {},
    entries: studies.map((s) => ({ id: s.upstreamId, name: s.name })),
  });
  writeJson(path.join(dir, "registry", "evidence-ledger.json"), {
    _generated: true,
    importedAt: new Date().toISOString(),
    statusValues: {},
    claims: [],
  });
  writeJson(path.join(dir, "registry", "ci-facts.json"), {
    _generated: true,
    importedAt: new Date().toISOString(),
    mode: "authenticated",
    facts: {},
  });
  writeJson(path.join(dir, "registry", "source-status.json"), {
    _generated: true,
    checkedAt: new Date().toISOString(),
    projects: Object.fromEntries(
      studies.map((s) => [s.slug, { derived: "current", reason: "fixture" }]),
    ),
  });
}

const tests = [];
function test(name, fn) {
  tests.push([name, fn]);
}

// --- validate-registry ------------------------------------------------------

test("validate-registry accepts a minimal compliant registry", async () => {
  const dir = tempDir("evm-ok");
  writeRegistry(dir, minimalRegistry());
  const result = await runNode(dir, script("scripts", "validate-registry.mjs"));
  if (result.code !== 0) {
    throw new Error(`expected exit 0, got ${result.code}\n${result.stderr}`);
  }
});

test("validate-registry rejects shipped without liveUrl or live evidence", async () => {
  const dir = tempDir("evm-shipped");
  const studies = minimalRegistry();
  studies[0] = validStudy("proj-0", { stage: "shipped" });
  writeRegistry(dir, studies);
  const result = await runNode(dir, script("scripts", "validate-registry.mjs"));
  if (result.code !== 1) throw new Error(`expected exit 1, got ${result.code}`);
  if (!/shipped' requires a liveUrl/.test(result.stderr)) {
    throw new Error(`missing liveUrl failure message:\n${result.stderr}`);
  }
});

test("validate-registry rejects metrics whose method is too vague", async () => {
  const dir = tempDir("evm-method");
  const studies = minimalRegistry();
  studies[0].caseStudy.metrics.push({
    label: "Vague",
    value: "10",
    method: "trust me",
    evidence: [{ kind: "doc", label: "x", href: "https://example.com/x" }],
  });
  writeRegistry(dir, studies);
  const result = await runNode(dir, script("scripts", "validate-registry.mjs"));
  if (result.code !== 1) throw new Error(`expected exit 1, got ${result.code}`);
  if (!/specific 'method'/.test(result.stderr)) {
    throw new Error(`missing method failure message:\n${result.stderr}`);
  }
});

test("validate-registry rejects illustrations captioned as screenshots", async () => {
  const dir = tempDir("evm-caption");
  const studies = minimalRegistry();
  studies[0].caseStudy.visuals.push({
    kind: "illustration",
    preview: "generic",
    alt: "an illustration",
    caption: "The product running in production",
  });
  writeRegistry(dir, studies);
  const result = await runNode(dir, script("scripts", "validate-registry.mjs"));
  if (result.code !== 1) throw new Error(`expected exit 1, got ${result.code}`);
  if (!/not a screenshot/.test(result.stderr)) {
    throw new Error(`missing illustration caption failure:\n${result.stderr}`);
  }
});

test("validate-registry rejects a case study with no claim-verification date", async () => {
  const dir = tempDir("evm-unverified");
  const studies = minimalRegistry();
  delete studies[0].caseStudy.lastVerifiedAt;
  writeRegistry(dir, studies);
  const result = await runNode(dir, script("scripts", "validate-registry.mjs"));
  if (result.code !== 1) throw new Error(`expected exit 1, got ${result.code}`);
  if (!/lastVerifiedAt is required/.test(result.stderr)) {
    throw new Error(`missing lastVerifiedAt failure message:\n${result.stderr}`);
  }
});

test("validate-registry rejects a malformed claim-verification date", async () => {
  const dir = tempDir("evm-baddate");
  const studies = minimalRegistry();
  studies[0].caseStudy.lastVerifiedAt = "last Tuesday";
  writeRegistry(dir, studies);
  const result = await runNode(dir, script("scripts", "validate-registry.mjs"));
  if (result.code !== 1) throw new Error(`expected exit 1, got ${result.code}`);
  if (!/must be an ISO date/.test(result.stderr)) {
    throw new Error(`missing ISO-date failure message:\n${result.stderr}`);
  }
});

test("validate-registry rejects a historical study verified after its source was removed", async () => {
  const dir = tempDir("evm-historical");
  const studies = minimalRegistry();
  studies[0].sourceState = "historical-case-study";
  studies[0].sourceRemoved = {
    detectedAt: "2026-01-01",
    note: "removed upstream",
  };
  // Verified a year after the code was deleted: a claim that cannot have been
  // checked against source must not be allowed to claim it was.
  studies[0].caseStudy.lastVerifiedAt = "2027-01-01";
  writeRegistry(dir, studies);
  const result = await runNode(dir, script("scripts", "validate-registry.mjs"));
  if (result.code !== 1) throw new Error(`expected exit 1, got ${result.code}`);
  if (!/after the source was removed/.test(result.stderr)) {
    throw new Error(`missing post-removal verification failure:\n${result.stderr}`);
  }
});

test("validate-registry accepts a historical study verified before its source was removed", async () => {
  const dir = tempDir("evm-historical-ok");
  const studies = minimalRegistry();
  studies[0].sourceState = "historical-case-study";
  studies[0].sourceRemoved = {
    detectedAt: "2026-01-01",
    note: "removed upstream",
  };
  studies[0].caseStudy.lastVerifiedAt = "2025-12-01";
  writeRegistry(dir, studies);
  const result = await runNode(dir, script("scripts", "validate-registry.mjs"));
  if (result.code !== 0) {
    throw new Error(`expected exit 0, got ${result.code}\n${result.stderr}`);
  }
});

test("validate-registry rejects a vacuous demonstrates entry", async () => {
  const dir = tempDir("evm-demonstrates");
  const studies = minimalRegistry();
  studies[0].caseStudy.demonstrates = {
    technical: ["React", "TypeScript"],
    product: ["A better life"],
  };
  writeRegistry(dir, studies);
  const result = await runNode(dir, script("scripts", "validate-registry.mjs"));
  if (result.code !== 1) throw new Error(`expected exit 1, got ${result.code}`);
  if (!/demonstrates\.technical entry is too short/.test(result.stderr)) {
    throw new Error(`missing demonstrates specificity failure:\n${result.stderr}`);
  }
});

test("validate-registry rejects a demonstrates block missing a whole axis", async () => {
  const dir = tempDir("evm-demonstrates-empty");
  const studies = minimalRegistry();
  studies[0].caseStudy.demonstrates = {
    technical: [
      "A hedged-language contract enforced in code, rejected rather than prompted",
    ],
    product: [],
  };
  writeRegistry(dir, studies);
  const result = await runNode(dir, script("scripts", "validate-registry.mjs"));
  if (result.code !== 1) throw new Error(`expected exit 1, got ${result.code}`);
  if (!/demonstrates\.product needs at least 1 entry/.test(result.stderr)) {
    throw new Error(`missing demonstrates.product failure:\n${result.stderr}`);
  }
});

test("validate-registry rejects a screenshot with no capture date", async () => {
  const dir = tempDir("evm-uncaptured");
  const studies = minimalRegistry();
  studies[0].caseStudy.visuals = [
    { kind: "screenshot", src: "/media/proj-0/a.png", alt: "the app running" },
  ];
  writeRegistry(dir, studies);
  writeCapture(dir, "proj-0/a.png");
  const result = await runNode(dir, script("scripts", "validate-registry.mjs"));
  if (result.code !== 1) throw new Error(`expected exit 1, got ${result.code}`);
  if (!/has no capturedAt/.test(result.stderr)) {
    throw new Error(`missing capturedAt failure:\n${result.stderr}`);
  }
});

test("validate-registry rejects a screenshot past the freshness window", async () => {
  const dir = tempDir("evm-oldshot");
  const studies = minimalRegistry();
  studies[0].caseStudy.visuals = [
    {
      kind: "screenshot",
      src: "/media/proj-0/old.png",
      alt: "the app, a long time ago",
      capturedAt: daysAgoIso(400).slice(0, 10),
    },
  ];
  writeRegistry(dir, studies);
  writeCapture(dir, "proj-0/old.png");
  const result = await runNode(dir, script("scripts", "validate-registry.mjs"));
  if (result.code !== 1) throw new Error(`expected exit 1, got ${result.code}`);
  if (!/past the 90-day window/.test(result.stderr)) {
    throw new Error(`missing stale-capture failure:\n${result.stderr}`);
  }
});

test("validate-registry accepts a freshly captured screenshot", async () => {
  const dir = tempDir("evm-freshshot");
  const studies = minimalRegistry();
  studies[0].caseStudy.visuals = [
    {
      kind: "screenshot",
      src: "/media/proj-0/fresh.png",
      alt: "the app running today",
      capturedAt: daysAgoIso(3).slice(0, 10),
    },
  ];
  writeRegistry(dir, studies);
  writeCapture(dir, "proj-0/fresh.png");
  const result = await runNode(dir, script("scripts", "validate-registry.mjs"));
  if (result.code !== 0) {
    throw new Error(`expected exit 0, got ${result.code}\n${result.stderr}`);
  }
});

test("validate-registry rejects the same screenshot listed twice", async () => {
  const dir = tempDir("evm-dupe");
  const studies = minimalRegistry();
  const shot = {
    kind: "screenshot",
    src: "/media/proj-0/same.png",
    alt: "the app running",
    capturedAt: daysAgoIso(2).slice(0, 10),
  };
  studies[0].caseStudy.visuals = [shot, { ...shot }];
  writeRegistry(dir, studies);
  writeCapture(dir, "proj-0/same.png");
  const result = await runNode(dir, script("scripts", "validate-registry.mjs"));
  if (result.code !== 1) throw new Error(`expected exit 1, got ${result.code}`);
  if (!/is already in this case study's visuals/.test(result.stderr)) {
    throw new Error(`missing duplicate-capture failure:\n${result.stderr}`);
  }
});

test("validate-registry warns when CI-cited evidence sits behind failed runs", async () => {
  const dir = tempDir("evm-redci");
  const studies = minimalRegistry();
  studies[0].stage = "beta";
  studies[0].caseStudy.metrics[0].evidence.push({
    kind: "ci",
    label: "workflow",
    href: "https://github.com/x/y/blob/main/.github/workflows/ci.yml",
  });
  writeRegistry(dir, studies);
  writeJson(path.join(dir, "registry", "ci-facts.json"), {
    _generated: true,
    importedAt: new Date().toISOString(),
    mode: "authenticated",
    facts: {
      "proj-0": { conclusion: "failure" },
    },
  });
  const result = await runNode(dir, script("scripts", "validate-registry.mjs"));
  if (result.code !== 0) {
    throw new Error(`red-CI rule must warn, not fail - got exit ${result.code}\n${result.stderr}`);
  }
  const combined = `${result.stdout}\n${result.stderr}`;
  if (!/latest upstream\s*run failed/.test(combined)) {
    throw new Error(`missing red-CI warning:\n${combined}`);
  }
});

/**
 * Rewrite the fixture's upstream snapshot so entries carry a `repo`, the shape
 * the real registry uses for standalone apps. The importer resolves CI facts
 * from `repo` as well as `workflow`, and the coverage gate must count both.
 */
function writeRepoShapedUpstream(dir, studies) {
  writeJson(path.join(dir, "registry", "upstream.json"), {
    _generated: true,
    importedAt: new Date().toISOString(),
    lifecycleStates: {},
    entries: studies.map((s) => ({
      id: s.upstreamId,
      name: s.name,
      repo: `henrygoldsmith07-wq/${s.upstreamId}`,
    })),
  });
}

test("validate-registry counts repo-shaped upstream entries as CI coverage", async () => {
  // Regression: the gate used to require entry.workflow, which no upstream
  // entry carries any more, so expectedCiCount stayed 0 and the site-wide
  // "expected CI evidence but collected none" rule could never fire. This
  // asserts the expected/present tally is no longer structurally zero.
  const dir = tempDir("evm-reposhape");
  const studies = minimalRegistry();
  writeRegistry(dir, studies);
  writeRepoShapedUpstream(dir, studies);
  writeJson(path.join(dir, "registry", "ci-facts.json"), {
    _generated: true,
    importedAt: new Date().toISOString(),
    mode: "authenticated",
    facts: Object.fromEntries(
      studies.map((s) => [
        s.upstreamId,
        { workflow: `${s.upstreamId}.yml`, conclusion: "success" },
      ]),
    ),
  });
  const result = await runNode(dir, script("scripts", "validate-registry.mjs"));
  if (result.code !== 0) {
    throw new Error(`expected exit 0, got ${result.code}\n${result.stderr}`);
  }
  if (!/CI facts 5\/5 expected/.test(`${result.stdout}\n${result.stderr}`)) {
    throw new Error(
      `expected all 5 repo-shaped entries to be counted:\n${result.stdout}\n${result.stderr}`,
    );
  }
});

test("validate-registry fails the site-wide rule when repo-shaped facts are all missing", async () => {
  // The same coverage tally, empty on the facts side. This is the rule that was
  // dead while the registry used `workflow`: a token that cannot read Actions
  // now fails loudly instead of looking like a registry with no CI.
  const dir = tempDir("evm-reposhape-empty");
  const studies = minimalRegistry();
  writeRegistry(dir, studies);
  writeRepoShapedUpstream(dir, studies);
  const result = await runNode(dir, script("scripts", "validate-registry.mjs"));
  if (result.code !== 1) throw new Error(`expected exit 1, got ${result.code}`);
  if (!/expected CI evidence for 5 project\(s\) but collected none/.test(result.stderr)) {
    throw new Error(`missing site-wide coverage failure:\n${result.stderr}`);
  }
});

test("validate-registry fails when CI-cited evidence has no imported fact", async () => {
  const dir = tempDir("evm-nofact");
  const studies = minimalRegistry();
  studies[0].caseStudy.metrics[0].evidence.push({
    kind: "ci",
    label: "workflow run",
    href: "https://github.com/x/y/actions/runs/1",
  });
  writeRegistry(dir, studies);
  writeRepoShapedUpstream(dir, studies);
  const result = await runNode(dir, script("scripts", "validate-registry.mjs"));
  if (result.code !== 1) throw new Error(`expected exit 1, got ${result.code}`);
  if (!/cites CI evidence but no CI fact/.test(result.stderr)) {
    throw new Error(`missing missing-fact failure:\n${result.stderr}`);
  }
});

test("validate-registry only warns when no CI evidence is cited", async () => {
  // A repo with no workflows legitimately yields no fact, so absence must not
  // hard-fail a study that never promised CI evidence. The other four projects
  // keep their facts so the site-wide "collected none" rule stays out of it.
  const dir = tempDir("evm-nofact-nocite");
  const studies = minimalRegistry();
  writeRegistry(dir, studies);
  writeRepoShapedUpstream(dir, studies);
  writeJson(path.join(dir, "registry", "ci-facts.json"), {
    _generated: true,
    importedAt: new Date().toISOString(),
    mode: "authenticated",
    facts: Object.fromEntries(
      studies
        .filter((s) => s.upstreamId !== "proj-0")
        .map((s) => [
          s.upstreamId,
          { workflow: `${s.upstreamId}.yml`, conclusion: "success" },
        ]),
    ),
  });
  const result = await runNode(dir, script("scripts", "validate-registry.mjs"));
  if (result.code !== 0) {
    throw new Error(`expected exit 0, got ${result.code}\n${result.stderr}`);
  }
  if (!/no CI fact for 'proj-0'/.test(`${result.stdout}\n${result.stderr}`)) {
    throw new Error(`missing advisory warning:\n${result.stdout}\n${result.stderr}`);
  }
});

// --- audit-claims -----------------------------------------------------------

test("audit-claims fails banned superlatives in user-facing copy", async () => {
  const dir = tempDir("evm-super");
  writeRegistry(dir, minimalRegistry());
  fs.mkdirSync(path.join(dir, "src", "pages"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "src", "pages", "Landing.tsx"),
    'export default function Landing() {\n  return <p>World-class engineering, obviously.</p>;\n}\n',
  );
  const result = await runNode(dir, script("scripts", "audit-claims.mjs"));
  if (result.code !== 1) throw new Error(`expected exit 1, got ${result.code}`);
  if (!/unfalsifiable superlative/.test(result.stderr)) {
    throw new Error(`missing superlative violation:\n${result.stderr}`);
  }
});

test("audit-claims passes copy that quotes a banned phrase to reject it", async () => {
  const dir = tempDir("evm-quote");
  writeRegistry(dir, minimalRegistry());
  fs.mkdirSync(path.join(dir, "src", "pages"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "src", "pages", "Landing.tsx"),
    '// never a "world-class" claim appears here\nexport default function Landing() {\n  return null;\n}\n',
  );
  const result = await runNode(dir, script("scripts", "audit-claims.mjs"));
  if (result.code !== 0) {
    throw new Error(`quoting exemption failed - exit ${result.code}\n${result.stderr}`);
  }
});

// --- check-pipeline-health ---------------------------------------------------

async function pipelineHealthCase({ previous, token, importedAt, mode }) {
  const dir = tempDir("evm-health");
  writeJson(path.join(dir, "registry", "ci-facts.json"), {
    _generated: "fixture",
    ...(importedAt ? { importedAt } : {}),
    mode,
    facts: {},
  });
  const env = {};
  if (token !== undefined) env.GITHUB_TOKEN = token;
  if (previous !== undefined) env.PREVIOUS_FACTS_IMPORTED_AT = previous;
  return runNode(dir, script("scripts", "check-pipeline-health.mjs"), env);
}

test("check-pipeline-health accepts a fresh authenticated import", async () => {
  const result = await pipelineHealthCase({
    previous: "2026-01-01T00:00:00.000Z",
    token: "t",
    importedAt: "2026-01-02T00:00:00.000Z",
    mode: "authenticated",
  });
  if (result.code !== 0) throw new Error(`exit ${result.code}: ${result.stderr}`);
});

test("check-pipeline-health fails when the timestamp did not advance", async () => {
  const ts = "2026-01-01T00:00:00.000Z";
  const result = await pipelineHealthCase({
    previous: ts,
    token: "t",
    importedAt: ts,
    mode: "authenticated",
  });
  if (result.code !== 1) throw new Error(`exit ${result.code}`);
  if (!/did not advance/.test(result.stderr)) throw new Error(`stderr: ${result.stderr}`);
});

test("check-pipeline-health fails anonymous imports even with a token present", async () => {
  const result = await pipelineHealthCase({
    previous: "2026-01-01T00:00:00.000Z",
    token: "t",
    importedAt: "2026-01-02T00:00:00.000Z",
    mode: "anonymous",
  });
  if (result.code !== 1) throw new Error(`exit ${result.code}`);
  if (!/expected 'authenticated'/.test(result.stderr)) throw new Error(`stderr: ${result.stderr}`);
});

test("check-pipeline-health fails when no token reached the step", async () => {
  const result = await pipelineHealthCase({
    previous: "2026-01-01T00:00:00.000Z",
    token: undefined,
    importedAt: "2026-01-02T00:00:00.000Z",
    mode: "authenticated",
  });
  if (result.code !== 1) throw new Error(`exit ${result.code}`);
  if (!/GITHUB_TOKEN is empty/.test(result.stderr)) throw new Error(`stderr: ${result.stderr}`);
});

test("check-pipeline-health survives a missing facts file with a clear failure", async () => {
  const dir = tempDir("evm-nofile");
  const result = await runNode(dir, script("scripts", "check-pipeline-health.mjs"));
  if (result.code !== 1) throw new Error(`exit ${result.code}`);
  if (!/unreadable after import/.test(result.stderr)) throw new Error(`stderr: ${result.stderr}`);
});

// --- runner ------------------------------------------------------------------

console.log(`run-evidence-tests: ${tests.length} scenarios\n`);
for (const [name, fn] of tests) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (error) {
    failed++;
    console.error(
      `  FAIL ${name}\n       ${String(error.message).split("\n").join("\n       ")}`,
    );
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
