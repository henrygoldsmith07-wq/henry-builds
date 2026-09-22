/**
 * Deterministic source-aware invalidation for claim classification.
 *
 * classifier.dev identifies the TYPE of each claim only; it never proves
 * claims. This module builds a single stable source hash over everything
 * that, if changed, would change a classification result:
 *
 *   - claim IDs (an ID change invalidates the cache)
 *   - normalised claim text (text change invalidates the cache)
 *   - taxonomy version (taxonomy change invalidates the cache)
 *   - classifier configuration affecting output (labels, threshold,
 *     instructions, rule table)
 *
 * The hash is persisted in registry/claim-classifications.json. The report
 * is reused ONLY when the stored source hash exactly matches the current one.
 * The per-text classifier cache (see classifier-client.mjs) is unaffected and
 * still reused when the text hash matches within a run.
 *
 * Public rendering never imports this module: it only reads the committed
 * registry/claim-classifications.json metadata, which is advisory only.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  CLAIM_CATEGORIES,
  CONFIDENCE_THRESHOLD,
  TAXONOMY_INSTRUCTIONS,
  TAXONOMY_VERSION,
} from "./claim-taxonomy.mjs";
import { CATEGORY_RULES } from "./claim-taxonomy-rules.mjs";

export const TAXONOMY_VERSION_USED = TAXONOMY_VERSION;

/**
 * Read the registry sources and return the canonical, deterministic list of
 * claim items. Both classify-claims.mjs and audit-claims.mjs must use this same
 * function so the source hash is consistent everywhere a report can be reused.
 */
export function collectClaimItems(root) {
  const items = [];
  const dir = path.join(root, "registry", "case-studies");
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
      const p = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      const cs = p.caseStudy ?? {};
      (cs.outcomes ?? []).forEach((o, i) => {
        if (o?.statement)
          items.push({
            id: p.slug + ".outcomes[" + i + "]",
            text: normaliseText(o.statement),
            kinds: (o.evidence ?? []).map((e) => e.kind),
          });
      });
      (cs.metrics ?? []).forEach((m, i) => {
        if (m?.label || m?.value)
          items.push({
            id: p.slug + ".metrics[" + i + "]",
            text: normaliseText(m.label + ": " + m.value + ". " + (m.method ?? "")),
            kinds: (m.evidence ?? []).map((e) => e.kind),
          });
      });
    }
  }
  const ledger = loadLedger(root);
  for (const c of ledger.claims ?? []) {
    if (c.claim)
      items.push({
        id: "ledger:" + c.id,
        text: normaliseText(c.claim),
        kinds: [],
      });
  }
  return items;
}

function loadLedger(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, "registry", "evidence-ledger.json"), "utf8"));
  } catch {
    return { claims: [] };
  }
}

/**
 * Collapse whitespace, trim, and cap length — the same canonical form the
 * per-text classifier cache key uses, so cached per-text results stay valid
 * exactly when the source hash would say the inputs are unchanged.
 */
export function normaliseText(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim().slice(0, 1000);
}

/**
 * Classifier configuration affecting output: the labels offered to the
 * service, the confidence threshold, the instructions text, the taxonomy
 * version, and the rule table that turns a label into a deterministic
 * evidence requirement. Any change to any of these changes a result.
 */
function classifierConfigSignature() {
  return {
    taxonomyVersion: TAXONOMY_VERSION,
    confidenceThreshold: CONFIDENCE_THRESHOLD,
    labels: CLAIM_CATEGORIES,
    instructions: TAXONOMY_INSTRUCTIONS,
    ruleIds: Object.keys(CATEGORY_RULES),
  };
}

/**
 * Build a stable, order-independent source hash.
 *
 * Order-independence matters: case-study files may be renamed or the ledger
 * order may shift without any claim itself changing. We sort items by id so
 * such reordering does not needlessly invalidate the shared report cache,
 * while any change to an id, text, the taxonomy, or the config does.
 */
export function buildSourceHash(items) {
  const sig = classifierConfigSignature();
  const payload = {
    config: sig,
    claims: items
      .slice()
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((it) => ({ id: it.id, text: it.text })),
  };
  const h = createHash("sha256").update(JSON.stringify(payload), "utf8").digest("hex");
  return "sha256:" + h.slice(0, 40);
}

/** Load the committed report (if any). */
export function loadReport(root) {
  const p = path.join(root, "registry", "claim-classifications.json");
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

/** True only when the report is present AND its source hash matches exactly. */
export function reportFresh(report, currentSourceHash) {
  return (
    report != null &&
    report.sourceHash === currentSourceHash &&
    report.taxonomyVersion === TAXONOMY_VERSION &&
    Array.isArray(report.items)
  );
}
