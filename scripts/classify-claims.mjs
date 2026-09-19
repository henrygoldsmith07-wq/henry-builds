#!/usr/bin/env node
/**
 * Classify every claim (outcomes + metrics + ledger) and write a
 * metadata-only report. Never decides proof. Safe offline fallback.
 * Usage: node scripts/classify-claims.mjs [--offline] [--refresh]
 * Writes: registry/claim-classifications.json (generated, committed for CI cache)
 */
import fs from "node:fs";
import path from "node:path";
import { classifyClaims } from "./lib/classifier-client.mjs";
import { TAXONOMY_VERSION, CONFIDENCE_THRESHOLD } from "./lib/claim-taxonomy.mjs";
const root = process.cwd();
const offline = process.argv.includes("--offline");
const refresh = process.argv.includes("--refresh");
const outPath = path.join(root, "registry", "claim-classifications.json");
function load(p, fb) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fb; } }
function collect() {
  const items = [];
  const dir = path.join(root, "registry", "case-studies");
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
    const p = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const cs = p.caseStudy ?? {};
    (cs.outcomes ?? []).forEach((o, i) => { if (o?.statement) items.push({ id: p.slug + ".outcomes[" + i + "]", text: o.statement, kinds: (o.evidence ?? []).map((e) => e.kind) }); });
    (cs.metrics ?? []).forEach((m, i) => { if (m?.label || m?.value) items.push({ id: p.slug + ".metrics[" + i + "]", text: m.label + ": " + m.value + ". " + (m.method ?? ""), kinds: (m.evidence ?? []).map((e) => e.kind) }); });
  }
  const ledger = load(path.join(root, "registry", "evidence-ledger.json"), { claims: [] });
  for (const c of ledger.claims ?? []) items.push({ id: "ledger:" + c.id, text: c.claim, kinds: [] });
  return items;
}
const items = collect();
console.log("classify-claims: " + items.length + " claims, taxonomy v" + TAXONOMY_VERSION + ", threshold " + CONFIDENCE_THRESHOLD + (offline ? " (offline)" : ""));
const prev = load(outPath, null);
if (prev && !refresh && prev.taxonomyVersion === TAXONOMY_VERSION && Array.isArray(prev.items) && prev.items.length === items.length) {
  console.log("classify-claims: cache fresh (" + prev.items.length + " rows) — report unchanged");
  process.exit(0);
}
const results = await classifyClaims(items.map((x) => x.text), { root, offline });
const rows = items.map((item, i) => {
  const r = results[i];
  return { id: item.id, category: r.category, confidence: Math.round(r.confidence * 1000) / 1000, rule: r.rule.ruleId, requiresAny: r.rule.requiresAny, enforce: r.rule.enforce, source: r.source, cacheHit: r.cacheHit, lowConfidence: r.lowConfidence, unknownLabel: r.unknownLabel, suggested: r.suggested ?? r.suggestedCategory ?? null, evidenceKinds: item.kinds };
});
const report = { _generated: "Written by scripts/classify-claims.mjs. Do not edit by hand.", taxonomyVersion: TAXONOMY_VERSION, confidenceThreshold: CONFIDENCE_THRESHOLD, generatedAt: new Date().toISOString(), count: rows.length, items: rows };
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
const cats = {};
for (const r of rows) cats[r.category] = (cats[r.category] ?? 0) + 1;
console.log("classify-claims: wrote registry/claim-classifications.json (" + rows.length + " rows) " + JSON.stringify(cats));
