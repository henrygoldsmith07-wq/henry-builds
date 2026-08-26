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
      lastVerifiedAt: daysAgoIso(1),
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

test("validate-registry blocks outcomes restating insufficient-evidence claims", async () => {
  const dir = tempDir("evm-ledger");
  const studies = minimalRegistry();
  writeRegistry(dir, studies);
  writeJson(path.join(dir, "registry", "evidence-ledger.json"), {
    _generated: true,
    importedAt: new Date().toISOString(),
    statusValues: {},
    claims: [
      {
        id: "blocked-capability",
        product: "proj-0",
        claim: "automatically translates ancient Sumerian poetry perfectly",
        status: "insufficient-evidence",
        sampleSize: 0,
        benchmark: "",
        limitations: "",
      },
    ],
  });
  studies[0].caseStudy.outcomes.push({
    statement: "It automatically translates ancient Sumerian poetry perfectly.",
    evidence: [{ kind: "doc", label: "x", href: "https://example.com/x" }],
  });
  writeJson(path.join(dir, "registry", "case-studies", "proj-0.json"), studies[0]);
  const result = await runNode(dir, script("scripts", "validate-registry.mjs"));
  if (result.code !== 1) throw new Error(`expected exit 1, got ${result.code}`);
  if (!/insufficient-evidence/.test(result.stderr)) {
    throw new Error(`missing ledger block message:\n${result.stderr}`);
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
  if (!/latest upstream\s*run failed/.test(result.stdout)) {
    throw new Error(`missing red-CI warning:\n${result.stdout}`);
  }
});

test("validate-registry fails stale captures past their shelf life", async () => {
  const dir = tempDir("evm-expired");
  const studies = minimalRegistry();
  studies[0].caseStudy.metrics.push({
    label: "Stale capture",
    value: "1",
    method: "measured once, long ago, by the fixture builder",
    evidence: [
      {
        kind: "benchmark",
        label: "old bench",
        href: "https://example.com/bench",
        capturedAt: daysAgoIso(120),
      },
    ],
  });
  writeRegistry(dir, studies);
  const result = await runNode(dir, script("scripts", "validate-registry.mjs"));
  if (result.code !== 1) throw new Error(`expected exit 1, got ${result.code}`);
  if (!/days old \(captured/.test(result.stderr)) {
    throw new Error(`missing freshness failure:\n${result.stderr}`);
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
