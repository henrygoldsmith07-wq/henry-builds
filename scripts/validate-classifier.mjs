#!/usr/bin/env node
/**
 * Validates the classifier evidence plumbing itself (offline-safe).
 * Checks: taxonomy file loads, client resolves fallback offline,
 * fixture claims produce expected categories when online (skipped offline),
 * no src/ file imports classifier code, audit-claims stays green offline.
 */
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { CLAIM_CATEGORIES, CONFIDENCE_THRESHOLD, TAXONOMY_VERSION } from "./lib/claim-taxonomy.mjs";
import { CATEGORY_RULES, resolveCategory } from "./lib/claim-taxonomy-rules.mjs";
import { classifyClaims } from "./lib/classifier-client.mjs";
const root = process.cwd();
let fails = 0;
const ok = (m) => console.log("  ok " + m);
const bad = (m) => { console.error("  FAIL " + m); fails++; };
if (!Array.isArray(CLAIM_CATEGORIES) || CLAIM_CATEGORIES.length !== 11) bad("taxonomy must have 11 labels");
else ok("taxonomy has 11 labels v" + TAXONOMY_VERSION);
for (const c of CLAIM_CATEGORIES) if (!CATEGORY_RULES[c]) bad("missing rule for " + c);
if (fails === 0) ok("every category has a deterministic rule");
const low = resolveCategory("performance", 0.1, { threshold: CONFIDENCE_THRESHOLD });
if (low.category !== "other" || !low.lowConfidence) bad("low confidence must fall back to other");
else ok("confidence policy: 0.1 -> other (suggested performance)");
const unk = resolveCategory("nope", 0.99, { threshold: CONFIDENCE_THRESHOLD });
if (unk.category !== "other" || !unk.unknownLabel) bad("unknown label must fall back to other");
else ok("other/unknown: bogus label -> other");
const r = await classifyClaims(["x", "y"], { root, offline: true });
if (r.length !== 2 || r.some((x) => x.category !== "other")) bad("offline fallback must return other");
else ok("safe fallback: offline -> other (stays green)");
// Ambiguous-claim fixtures: structure valid, categories within the taxonomy,
// and every row satisfiable without failing the build when offline/unsure.
try {
  const fixtures = JSON.parse(fs.readFileSync(path.join(root, "tests", "fixtures", "ambiguous-claims.json"), "utf8"));
  const rows = fixtures.ambiguousClaims ?? [];
  if (!Array.isArray(rows) || rows.length === 0) bad("ambiguous fixtures missing");
  else {
    let fixtureBad = 0;
    for (const row of rows) {
      if (!row.id || !row.text || !Array.isArray(row.acceptable) || row.acceptable.length === 0) { fixtureBad++; continue; }
      for (const a of row.acceptable) if (!CATEGORY_RULES[a]) fixtureBad++;
    }
    if (fixtureBad) bad("ambiguous fixtures reference unknown categories");
    else ok(`ambiguous fixtures: ${rows.length} rows, all acceptable values in taxonomy`);
    const offlineRouted = await classifyClaims(rows.map((x) => x.text), { root, offline: true });
    if (offlineRouted.some((x) => x.category !== "other")) bad("ambiguous fixtures must route to other when offline");
    else ok("ambiguous fixtures: offline routes all to other (never fail)");
  }
} catch (e) { bad("cannot read ambiguous fixtures: " + e.message); }
const banned = [];
for (const f of walkFiles(path.join(root, "src"))) {
  const t = fs.readFileSync(f, "utf8");
  if (/classifier-client|claim-taxonomy|classifier\.dev/.test(t)) banned.push(path.relative(root, f));
}
if (banned.length) bad("public rendering imports classifier: " + banned.join(", "));
else ok("no src/ file imports classifier code");
function walkFiles(d) {
  const out = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) out.push(...walkFiles(p));
    else if (/\.(ts|tsx|js)$/.test(e.name)) out.push(p);
  }
  return out;
}
await new Promise((resolve) => {
  execFile(process.execPath, ["scripts/audit-claims.mjs", "--offline"], { cwd: root }, (err, stdout, stderr) => {
    if (err) bad("audit-claims --offline exits nonzero");
    else ok("audit-claims --offline stays green");
    process.stdout.write((stdout + stderr).split("\n").filter((l) => l.includes("audit-claims:")).map((l) => "    " + l.trim() + "\n").join(""));
    resolve();
  });
});
console.log(fails === 0 ? "validate-classifier: all checks passed" : "validate-classifier: " + fails + " failure(s)");
process.exit(fails > 0 ? 1 : 0);
