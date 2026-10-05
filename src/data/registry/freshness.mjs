/**
 * The canonical freshness windows.
 *
 * Before this file the same three questions had seven different answers:
 *
 *   - "How old may a generated layer be?"  14 in check-registry-freshness,
 *     14 in validate-registry, 2 under --strict, and a bare `3` in
 *     .github/workflows/deploy-monitor.yml that existed in no JS file at all.
 *   - "How old may a claim stay verified?"  180 in validate-registry, 180 in
 *     index.ts, and 180 again as a bare default parameter in EvidenceMeta.tsx.
 *   - "How old may a screenshot be?"        90 in validate-registry, 90 in an
 *     inline comparison in ProjectPreview.tsx, and 90 inside a user-facing
 *     sentence in the same file.
 *
 * A window written down twice is a window that will drift, and on a site whose
 * whole proposition is that its claims are checkable, a drifted window is not a
 * cosmetic bug — it is the failure mode the site exists to avoid.
 *
 * Like publication.mjs, this module imports nothing, so the Node scripts, the
 * Vite bundle and the type-checker all read the same constants. If a window
 * moves, it moves here and every consumer follows.
 */

/** How old a claim may stay verified before the site stops calling it current. */
export const MAX_CLAIM_AGE_DAYS = 180;

/**
 * How old a screenshot of a running product may be before it stops
 * presenting itself as evidence of what the project does today.
 */
export const MAX_CAPTURE_AGE_DAYS = 90;

/**
 * How old a deployment snapshot may be before the verification strip says
 * "unchecked" rather than restating it as current fact.
 */
export const DEPLOY_SNAPSHOT_WINDOW_DAYS = 14;

/**
 * How old a generated registry layer may be.
 *
 * `strictDays` is the post-sync assertion: a refresh that ran in this job and
 * produced a timestamp older than this did not actually reach the network.
 */
export const GENERATED_LAYER_MAX_AGE_DAYS = 14;
export const GENERATED_LAYER_STRICT_AGE_DAYS = 2;

/**
 * The deploy monitor's own alarm threshold.
 *
 * This was a bare `-gt 3` inside the workflow shell. It is a constant here so
 * the alarm and the gate can be read together and cannot drift apart silently.
 */
export const DEPLOY_ALARM_AGE_DAYS = 3;

/**
 * A green CI run older than this, sitting behind a failed newer run, stops
 * being news. Warn-level: it is a signal about maintenance, not a claim.
 */
export const RED_CI_STALE_DAYS = 30;

/**
 * The single predicate for "is this ISO date still inside its window".
 *
 * Shared so the validator, the freshness gate and the UI cannot disagree about
 * what "expired" means. A date in the future is treated as fresh rather than
 * expiring in negative days — the freshness gate separately rejects timestamps
 * that are implausibly ahead, which is the right place for that concern.
 *
 * @param {string | undefined | null} iso
 * @param {number} windowDays
 * @param {number} [nowMs]
 * @returns {boolean}
 */
export function isWithinWindow(iso, windowDays, nowMs = Date.now()) {
  if (!iso) return false;
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return false;
  return (nowMs - then) / 86_400_000 <= windowDays;
}

/**
 * Whole days between an ISO date and now. Null when the date is unusable, so
 * callers must decide what "unknown" means rather than rendering `NaN`.
 *
 * @param {string | undefined | null} iso
 * @param {number} [nowMs]
 * @returns {number | null}
 */
export function daysSince(iso, nowMs = Date.now()) {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return null;
  return Math.floor((nowMs - then) / 86_400_000);
}

/**
 * Human phrasing for a capture's age, used on the image itself.
 *
 * Beyond the window the wording changes on purpose: the badge stops calling it
 * a screenshot of the current build and starts calling it historical, which is
 * what an out-of-window capture actually is.
 *
 * @param {string | undefined | null} iso
 * @param {number} [nowMs]
 * @returns {string | null}
 */
export function captureAgeLabel(iso, nowMs = Date.now()) {
  const days = daysSince(iso, nowMs);
  if (days === null) return null;
  if (days > MAX_CAPTURE_AGE_DAYS) return "historical capture";
  if (days <= 0) return "captured today";
  if (days === 1) return "captured yesterday";
  if (days < 60) return `captured ${days}d ago`;
  return `captured ~${Math.round(days / 30)}mo ago`;
}