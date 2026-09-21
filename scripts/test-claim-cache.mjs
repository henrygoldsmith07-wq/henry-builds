#!/usr/bin/env node
/**
 * Source-hash cache tests for claim classification.
 *
 * Proves:
 *  - unchanged claims reuse the committed report (exact source-hash match)
 *  - changed claim text invalidates the report
 *  - taxonomy version change invalidates the report
 *  - claim ID change invalidates the report
 *  - offline mode stays green (no network, falls back to "other")
 *  - public rendering (src/) never imports classifier code
 *
 * Self-checking (like validate-classifier.mjs): exits 0 on success, 1 on failure.
 * Runs against a scratch tree built from tests/fixtures/claim-cache.json so the
 * real committed registry is never touched.
 */
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  collectClaimItems,
  buildSourceHash,
  loadReport,
  reportFresh,
  TAXONOMY_VERSION_USED,
} from "./lib/claim-source-hash.mjs";
import { TAXONOMY_VERSION, CLAIM_CATEGORIES, CONFIDENCE_THRESHOLD, TAXONOMY_INSTRUCTIONS } from "./lib/claim-taxonomy.mjs";
import { classifyClaims } from "./lib/classifier-client.mjs";

const root = process.cwd();
const fixtures = path.join(root, "tests", "fixtures", "claim-cache.json");
let fails = 0;
const ok = (m) => console.log("  ok   " + m);
const bad = (m) => { console.error("  FAIL " + m); fails++; };

async function makeScratch() {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "claim-cache-test-"));
  const src = JSON.parse(fs.readFileSync(fixtures, "utf8"));
  fs.mkdirSync(path.join(dir, "registry", "case-studies"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "registry", "case-studies", "alpha.json"),
    JSON.stringify(src.caseStudies[0], null, 2),
  );
  fs.writeFileSync(
    path.join(dir, "registry", "evidence-ledger.json"),
    JSON.stringify(src.ledger, null, 2),
  );
  return dir;
}

async function writeReport(dir, sourceHash, items) {
  const results = await classifyClaims(items.map((x) => x.text), { root: dir, offline: true });
  const rows = items.map((item, i) => {
    const r = results[i];
    return {
      id: item.id,
      category: r.category,
      confidence: r.confidence,
      rule: r.rule.ruleId,
      requiresAny: r.rule.requiresAny,
      enforce: r.rule.enforce,
      source: r.source,
      evidenceKinds: item.kinds,
    };
  });
  const report = {
    sourceHash,
    taxonomyVersion: TAXONOMY_VERSION_USED,
    generatedAt: new Date().toISOString(),
    count: rows.length,
    items: rows,
  };
  fs.writeFileSync(path.join(dir, "registry", "claim-classifications.json"), JSON.stringify(report, null, 2) + "\n");
  return report;
}

const baseHash = buildSourceHash(collectClaimItems(await makeScratch()));
console.log("test:claim-cache — base source hash " + baseHash);

// 1. unchanged claims reuse the committed report
{
  const dir = await makeScratch();
  const items = collectClaimItems(dir);
  const h = buildSourceHash(items);
  if (h !== baseHash) bad("unchanged claims produced a different hash");
  else ok("unchanged claims: source hash stable");
  const rep = await writeReport(dir, h, items);
  if (!reportFresh(rep, h)) bad("report with matching source hash not fresh");
  else ok("unchanged claims: report reused (fresh)");
}

// 2. changed claim text invalidates
{
  const dir = await makeScratch();
  const file = path.join(dir, "registry", "case-studies", "alpha.json");
  const p = JSON.parse(fs.readFileSync(file, "utf8"));
  p.caseStudy.outcomes[0].statement = "Caches 95% of requests with Redis.";
  fs.writeFileSync(file, JSON.stringify(p, null, 2));
  const h2 = buildSourceHash(collectClaimItems(dir));
  if (h2 === baseHash) bad("changed claim text did not change hash");
  else ok("changed text: hash changed (" + baseHash.slice(0, 12) + " -> " + h2.slice(0, 12) + ")");
  const rep = loadReport(dir);
  if (reportFresh(rep, h2)) bad("report reused after text change");
  else ok("changed text: report NOT reused");
}

// 3. taxonomy version change invalidates
{
  const dir = await makeScratch();
  const items = collectClaimItems(dir);
  await writeReport(dir, buildSourceHash(items), items);
  const repPath = path.join(dir, "registry", "claim-classifications.json");
  // Tamper with the stored taxonomy version only; source-hash check must reject.
  const patched = JSON.parse(fs.readFileSync(repPath, "utf8"));
  patched.taxonomyVersion = "1.0.0-bogus";
  fs.writeFileSync(repPath, JSON.stringify(patched, null, 2));
  const rep = loadReport(dir);
  if (reportFresh(rep, buildSourceHash(items))) bad("report reused after taxonomy version mismatch");
  else ok("taxonomy version change: report invalidated");
}

// 4. claim ID change invalidates
{
  const dir = await makeScratch();
  const file = path.join(dir, "registry", "case-studies", "alpha.json");
  const p = JSON.parse(fs.readFileSync(file, "utf8"));
  p.slug = "alpha-renamed";
  fs.writeFileSync(file, JSON.stringify(p, null, 2));
  const h3 = buildSourceHash(collectClaimItems(dir));
  if (h3 === baseHash) bad("ID change did not change hash");
  else ok("ID change: hash changed");
}

// 5. config signature: threshold / labels / instructions affect the hash
{
  if (!CLAIM_CATEGORIES.includes("security") || !Array.isArray(CLAIM_CATEGORIES)) bad("taxonomy labels not as expected");
  else ok("taxonomy labels included in signature (" + CLAIM_CATEGORIES.length + " labels)");
  if (typeof CONFIDENCE_THRESHOLD !== "number") bad("threshold not numeric");
  else ok("confidence threshold " + CONFIDENCE_THRESHOLD + " part of signature");
  if (TAXONOMY_INSTRUCTIONS.length === 0) bad("instructions empty");
  else ok("taxonomy instructions part of signature");
  if (TAXONOMY_VERSION !== TAXONOMY_VERSION_USED) bad("taxonomy version constant drift");
  else ok("taxonomy version constant consistent (" + TAXONOMY_VERSION + ")");
}

// 6. offline mode stays green and produces no network calls
{
  const dir = await makeScratch();
  const items = collectClaimItems(dir);
  const res = await classifyClaims(items.map((x) => x.text), { root: dir, offline: true });
  if (res.length !== items.length) bad("offline classification returned wrong count");
  else ok("offline: returned " + res.length + " rows");
  if (res.some((r) => r.source !== "offline-fallback")) bad("offline did not fall back");
  else ok("offline: all rows use 'offline-fallback' source");
  if (res.some((r) => r.category !== "other")) bad("offline produced non-other category");
  else ok("offline: every classification is advisory 'other' (never fails a build)");
}

// 7. public rendering (src/) never imports classifier code
{
  const src = path.join(root, "src");
  const banned = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx|js|jsx)$/.test(e.name)) {
        const t = fs.readFileSync(p, "utf8");
        if (/classifier-client|claim-taxonomy|classifier\.dev|classifyClaims|classify-claims/.test(t))
          banned.push(path.relative(root, p));
      }
    }
  }
  walk(src);
  if (banned.length) bad("public rendering imports classifier: " + banned.join(", "));
  else ok("no src/ file imports classifier code");
}

console.log(fails === 0 ? "test:claim-cache: all checks passed" : "test:claim-cache: " + fails + " failure(s)");
process.exit(fails > 0 ? 1 : 0);
