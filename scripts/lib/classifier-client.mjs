/**
 * Reusable classifier.dev client for evidence workflows ONLY.
 * Never import from src/. Public rendering must not depend on network.
 * Features: taxonomy versioning, file cache (CI caching), safe fallback,
 * metadata-only logs (never log claim text), batch + retry/backoff.
 */
import fs from "node:fs";
import path from "node:path";
import { CLAIM_CATEGORIES, CONFIDENCE_THRESHOLD, FALLBACK_CATEGORY, TAXONOMY_INSTRUCTIONS, TAXONOMY_VERSION, TAXONOMY_MAJOR } from "./claim-taxonomy.mjs";
import { CATEGORY_RULES, resolveCategory, cacheKeyFor } from "./claim-taxonomy-rules.mjs";
export { CLAIM_CATEGORIES, CONFIDENCE_THRESHOLD, FALLBACK_CATEGORY, TAXONOMY_VERSION, TAXONOMY_MAJOR, CATEGORY_RULES, resolveCategory };
const ENDPOINT = process.env.CLASSIFIER_ENDPOINT ?? "https://classifier.dev/v1/classify";
const TIMEOUT_MS = Number(process.env.CLASSIFIER_TIMEOUT_MS ?? 30000);
const OFFLINE = process.argv.includes("--offline") || process.env.CLASSIFIER_OFFLINE === "1";
function cachePath(root) { return path.join(root, ".cache", "classifier-v" + TAXONOMY_MAJOR + ".json"); }
function loadCache(root) { try { return JSON.parse(fs.readFileSync(cachePath(root), "utf8")); } catch { return { version: TAXONOMY_VERSION, entries: {} }; } }
function saveCache(root, data) { fs.mkdirSync(path.dirname(cachePath(root)), { recursive: true }); fs.writeFileSync(cachePath(root), JSON.stringify(data, null, 2) + "\n"); }
function cacheValid(c) { return c && c.version === TAXONOMY_VERSION && c.entries && typeof c.entries === "object"; }
async function postClassify(inputs) {
  const body = JSON.stringify({ labels: CLAIM_CATEGORIES, inputs, instructions: TAXONOMY_INSTRUCTIONS, tier: "fast" });
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json", "user-agent": "henry-builds-evidence", accept: "application/json" }, body, signal: ctrl.signal });
      clearTimeout(t);
      if (res.status === 429 || res.status >= 500) { const wait = 1000 * 2 ** attempt; await new Promise((r) => setTimeout(r, wait)); continue; }
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const results = data.results ?? data.classifications ?? [];
      return results.map((r) => ({ label: r.label ?? r.category ?? FALLBACK_CATEGORY, confidence: typeof r.confidence === "number" ? r.confidence : 0 }));
    } catch (e) { clearTimeout(t); if (attempt === 2) throw e; await new Promise((r) => setTimeout(r, 500 * (attempt + 1))); }
  }
  throw new Error("classifier retries exhausted");
}
export async function classifyClaims(texts, opts = {}) {
  const root = opts.root ?? process.cwd();
  const offline = opts.offline ?? OFFLINE;
  const out = new Array(texts.length);
  const cache = loadCache(root);
  if (!cacheValid(cache)) { cache.version = TAXONOMY_VERSION; cache.entries = {}; }
  const pending = [];
  for (let i = 0; i < texts.length; i++) {
    const key = await cacheKeyFor(texts[i]);
    const hit = cache.entries[key];
    if (hit && hit.version === TAXONOMY_VERSION && CLAIM_CATEGORIES.includes(hit.label)) {
      const r = resolveCategory(hit.label, hit.confidence, { source: "cache", threshold: CONFIDENCE_THRESHOLD });
      out[i] = { ...r, cacheHit: true };
    } else { pending.push({ i, key }); out[i] = null; }
  }
  // Metadata-only logging: callers log id/category/confidence/rule/source.
  // Claim text is never printed here.
  if (offline || pending.length === 0) {
    for (const p of pending) { const r = resolveCategory(null, 0, { source: "offline-fallback" }); out[p.i] = { ...r, cacheHit: false }; }
  } else {
    const CHUNK = 100;
    for (let s = 0; s < pending.length; s += CHUNK) {
      const slice = pending.slice(s, s + CHUNK);
      let answers;
      try { answers = await postClassify(slice.map((p) => String(texts[p.i]).slice(0, 2000))); }
      catch (e) { for (const p of slice) { const r = resolveCategory(null, 0, { source: "error-fallback:" + String(e.message).slice(0, 60) }); out[p.i] = { ...r, cacheHit: false }; } continue; }
      slice.forEach((p, k) => {
        const a = answers[k] ?? { label: FALLBACK_CATEGORY, confidence: 0 };
        cache.entries[p.key] = { label: a.label, confidence: a.confidence, version: TAXONOMY_VERSION, at: new Date().toISOString() };
        const r = resolveCategory(a.label, a.confidence, { threshold: CONFIDENCE_THRESHOLD });
        out[p.i] = { ...r, cacheHit: false };
      });
    }
    saveCache(root, cache);
  }
  return out;
}
