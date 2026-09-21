#!/usr/bin/env node
/**
 * Classify every claim (outcomes + metrics + ledger) and write a
 * metadata-only report. Never decides proof. Safe offline fallback.
 * Usage: node scripts/classify-claims.mjs [--offline] [--refresh]
 * Writes: registry/claim-classifications.json (generated, committed for CI cache)
 *
 * Invalidation is source-aware, not size-aware: the committed report is reused
 * ONLY when the stored source hash exactly matches the current one, where the
 * hash covers claim IDs, normalised claim text, the taxonomy version, and the
 * classifier configuration affecting output.
 */
import fs from "node:fs";
import path from "node:path";
import { classifyClaims } from "./lib/classifier-client.mjs";
import { TAXONOMY_VERSION, CONFIDENCE_THRESHOLD } from "./lib/claim-taxonomy.mjs";
import { collectClaimItems, buildSourceHash, loadReport, reportFresh } from "./lib/claim-source-hash.mjs";
const root = process.cwd();
const offline = process.argv.includes("--offline");
const refresh = process.argv.includes("--refresh");
const outPath = path.join(root, "registry", "claim-classifications.json");
const items = collectClaimItems(root);
const sourceHash = buildSourceHash(items);
console.log("classify-claims: " + items.length + " claims, source hash " + sourceHash + ", taxonomy v" + TAXONOMY_VERSION + ", threshold " + CONFIDENCE_THRESHOLD + (offline ? " (offline)" : ""));
const prev = loadReport(root);
if (prev && !refresh && reportFresh(prev, sourceHash)) {
  console.log("classify-claims: source hash matches — report fresh (" + prev.items.length + " rows) — no reclassification");
  process.exit(0);
}
if (prev) console.log("classify-claims: source hash changed (" + (prev.sourceHash ?? "none") + " -> " + sourceHash + ") — reclassifying");
const results = await classifyClaims(items.map((x) => x.text), { root, offline });
const rows = items.map((item, i) => {
  const r = results[i];
  return { id: item.id, category: r.category, confidence: Math.round(r.confidence * 1000) / 1000, rule: r.rule.ruleId, requiresAny: r.rule.requiresAny, enforce: r.rule.enforce, source: r.source, cacheHit: r.cacheHit, lowConfidence: r.lowConfidence, unknownLabel: r.unknownLabel, suggested: r.suggested ?? r.suggestedCategory ?? null, evidenceKinds: item.kinds };
});
const report = { _generated: "Written by scripts/classify-claims.mjs. Do not edit by hand.", sourceHash, taxonomyVersion: TAXONOMY_VERSION, confidenceThreshold: CONFIDENCE_THRESHOLD, generatedAt: new Date().toISOString(), count: rows.length, items: rows };
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
const cats = {};
for (const r of rows) cats[r.category] = (cats[r.category] ?? 0) + 1;
console.log("classify-claims: wrote registry/claim-classifications.json (" + rows.length + " rows) " + JSON.stringify(cats));
