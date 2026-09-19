/**
 * Rule table: category -> deterministic evidence requirement.
 * requiresAny uses EvidenceKind values from src/data/registry/schema.ts.
 * enforce=false means warn-only; existing validator stays authoritative.
 */
import { FALLBACK_CATEGORY } from "./claim-taxonomy.mjs";
export const CATEGORY_RULES = {
  performance: { ruleId: "perf-benchmark", requiresAny: ["benchmark"], enforce: true, note: "performance needs benchmark" },
  reliability: { ruleId: "rel-test-prod", requiresAny: ["ci","benchmark","live"], enforce: true, note: "reliability needs ci/benchmark/live" },
  security: { ruleId: "sec-reviewable", requiresAny: ["ci","repo","doc"], enforce: true, note: "security needs ci/repo/doc" },
  accessibility: { ruleId: "a11y-evidence", requiresAny: ["screenshot","video","ci"], enforce: true, note: "a11y needs screenshot/video/ci" },
  usability: { ruleId: "use-observed", requiresAny: ["screenshot","video","doc"], enforce: false, note: "usability should show observed" },
  feature: { ruleId: "feat-any", requiresAny: ["repo","doc","ci","screenshot","video","live","benchmark"], enforce: false, note: "feature needs one item" },
  benchmark: { ruleId: "bench-evidence", requiresAny: ["benchmark"], enforce: true, note: "benchmark needs benchmark" },
  testing: { ruleId: "test-evidence", requiresAny: ["ci","benchmark"], enforce: true, note: "testing needs ci/benchmark" },
  deployment: { ruleId: "deploy-live", requiresAny: ["live"], enforce: true, note: "deployment needs live" },
  "unsupported-or-unclear": { ruleId: "unclear-rewrite", requiresAny: [], enforce: false, note: "rewrite or drop" },
  other: { ruleId: "other-any", requiresAny: [], enforce: false, note: "generic rule" },
};
export function resolveCategory(label, confidence, opts = {}) {
  const src = opts.source ?? "classifier";
  const threshold = opts.threshold ?? 0.7;
  const known = Object.prototype.hasOwnProperty.call(CATEGORY_RULES, label) ? label : null;
  const num = typeof confidence === "number" && Number.isFinite(confidence) ? confidence : 0;
  if (!known) return { category: FALLBACK_CATEGORY, confidence: 0, rule: CATEGORY_RULES.other, lowConfidence: false, unknownLabel: true, suggested: label ?? null, source: src };
  if (num < threshold) return { category: FALLBACK_CATEGORY, confidence: num, rule: CATEGORY_RULES.other, lowConfidence: true, unknownLabel: false, suggested: known, source: src };
  return { category: known, confidence: num, rule: CATEGORY_RULES[known], lowConfidence: false, unknownLabel: false, suggested: null, source: src };
}
export async function cacheKeyFor(text) {
  const { createHash } = await import("node:crypto");
  const n = String(text ?? "").replace(/\s+/g, " ").trim().slice(0, 1000);
  return "v1:" + createHash("sha256").update(n).digest("hex").slice(0, 32);
}
