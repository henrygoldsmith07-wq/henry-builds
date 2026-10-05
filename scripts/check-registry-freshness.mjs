#!/usr/bin/env node
/**
 * Fails when generated truth has silently stopped refreshing.
 *
 * Normal CI allows a wider window so pull requests are not blocked by a brief
 * scheduled-workflow outage. The scheduled registry sync uses --strict after it
 * refreshes everything, so a missing token or broken collector becomes visible
 * immediately instead of leaving month-old "current" data on the site.
 *
 * This check is deliberately more than a timestamp comparison.
 *
 * Comparing `importedAt` to the clock alone can be satisfied by editing one
 * string: set `importedAt` to today in all six files and every layer reads as
 * freshly imported while its contents are months old. On a site whose entire
 * claim is that its data is current, a freshness gate that a `sed` can defeat
 * is worse than no gate, because it manufactures confidence.
 *
 * So the check also verifies that the contents could plausibly have come from
 * that timestamp:
 *
 *   - every fact inside a layer was observed at or before the layer's own stamp
 *     (a run cannot happen in the future relative to its own import);
 *   - every fact is itself recent enough that "imported today" is not a lie;
 *   - the layers that depend on each other are ordered correctly (the facts
 *     layer is derived from the source-status snapshot, so it cannot predate it);
 *   - a layer that says it was refreshed anonymously, or that carries records
 *     carried forward from an earlier import, cannot count as clean evidence.
 *
 * See src/data/registry/freshness.mjs for the shared windows.
 */

import fs from "node:fs";
import path from "node:path";
import {
  DEPLOY_ALARM_AGE_DAYS,
  GENERATED_LAYER_MAX_AGE_DAYS,
  GENERATED_LAYER_STRICT_AGE_DAYS,
  isWithinWindow,
} from "../src/data/registry/freshness.mjs";

const root = process.cwd();
const strict = process.argv.includes("--strict");
const now = Date.now();
const DAY = 86_400_000;
const maxAgeDays = strict ? GENERATED_LAYER_STRICT_AGE_DAYS : GENERATED_LAYER_MAX_AGE_DAYS;

/** [file, timestamp field, window] */
const checks = [
  ["registry/upstream.json", "importedAt", maxAgeDays],
  ["registry/evidence-ledger.json", "importedAt", maxAgeDays],
  ["registry/source-status.json", "checkedAt", maxAgeDays],
  ["registry/ci-facts.json", "importedAt", maxAgeDays],
  ["registry/facts-history.json", "generatedAt", maxAgeDays],
  ["registry/bundle-history.json", "generatedAt", maxAgeDays],
];

/**
 * How old an individual observation may be and still back a freshly-stamped
 * layer. Deliberately wider than the layer window: the importer legitimately
 * carries a project's last green run forward when its repository has gone
 * private, and refusing that would push it to invent a fresher number.
 */
const OBSERVATION_MAX_AGE_DAYS = 45;

let failures = 0;
let warnings = 0;

const fail = (msg) => {
  console.error(`freshness: ${msg}`);
  failures++;
};
const warn = (msg) => {
  console.warn(`freshness: ${msg}`);
  warnings++;
};
const ok = (msg) => console.log(`freshness: ${msg}`);

const load = (relative) => {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    fail(`missing ${relative}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`${relative} is not valid JSON (${error.message})`);
    return null;
  }
};

const stamps = new Map();

for (const [relative, field, allowedDays] of checks) {
  const data = load(relative);
  if (!data) continue;

  const raw = data[field];
  const timestamp = Date.parse(raw);
  if (!raw || !Number.isFinite(timestamp)) {
    fail(`${relative} has no valid ${field}`);
    continue;
  }
  stamps.set(relative, timestamp);

  const ageDays = (now - timestamp) / DAY;
  if (ageDays < -1) {
    fail(`${relative} ${field} is ${Math.abs(ageDays).toFixed(1)} days in the future`);
    continue;
  }
  if (ageDays > allowedDays) {
    fail(`${relative} is ${ageDays.toFixed(1)} days old (limit ${allowedDays})`);
  } else {
    ok(`${relative} ${ageDays.toFixed(1)} days old (limit ${allowedDays})`);
  }
}

// --- the stamp must be consistent with what it claims to contain -----------

/**
 * Every nested observation must predate the layer that contains it. A run dated
 * after its own import timestamp means the file was assembled by hand, or the
 * stamp was rewritten, and either way the layer cannot be trusted as a record
 * of when anything was actually seen.
 */
function checkObservations(relative, data, stamp, paths) {
  for (const trail of paths(data)) {
    const observed = Date.parse(trail.value);
    if (!trail.value || !Number.isFinite(observed)) {
      fail(`${relative}: ${trail.label} has an unusable timestamp (${trail.value})`);
      continue;
    }
    if (observed > stamp + DAY) {
      fail(
        `${relative}: ${trail.label} (${trail.value}) is dated after the layer's own ` +
          `${relative.split("/").pop()} stamp — the file cannot have been written when it says`,
      );
      continue;
    }
    const ageDays = (now - observed) / DAY;
    if (ageDays > OBSERVATION_MAX_AGE_DAYS) {
      warn(
        `${relative}: ${trail.label} is ${Math.round(ageDays)} days old, so a ` +
          `${Math.round((now - stamp) / DAY)}-day-old ${relative.split("/").pop()} stamp is doing more work than it can`,
      );
    }
  }
}

/**
 * A layer that claims to have been refreshed recently has to contain evidence
 * of that. If every observation inside it is older than the observation window
 * while the layer's own stamp is newer, the two cannot both be true: either the
 * stamp was rewritten, or nothing was actually re-read.
 *
 * This is what makes the gate impossible to satisfy with `sed`. Without it, the
 * check is a comparison against one editable string.
 */
function checkStampIsSubstantiated(relative, stamp, observations) {
  if (observations.length === 0) return; // nothing to corroborate with
  const stampAgeDays = (now - stamp) / DAY;
  if (stampAgeDays > OBSERVATION_MAX_AGE_DAYS) return; // already caught by age

  const freshest = observations.reduce(
    (best, value) => Math.max(best, Date.parse(value) || 0),
    0,
  );
  const freshestAgeDays = (now - freshest) / DAY;

  if (freshestAgeDays > OBSERVATION_MAX_AGE_DAYS) {
    fail(
      `${relative} claims to have been refreshed ${Math.round(stampAgeDays)} day(s) ago, but its ` +
        `newest recorded observation is ${Math.round(freshestAgeDays)} days old — the stamp is not ` +
        `substantiated by its own contents`,
    );
  }
}

const ciFacts = load("registry/ci-facts.json");
if (ciFacts) {
  const stamp = Date.parse(ciFacts.importedAt);
  const observations = [];
  checkObservations("registry/ci-facts.json", ciFacts, stamp, (data) =>
    Object.entries(data.facts ?? {}).flatMap(([id, fact]) =>
      ["lastRunAt", "lastSuccessfulRunAt"]
        .filter((key) => fact?.[key])
        .map((key) => ({ label: `facts.${id}.${key}`, value: fact[key] })),
    ).map((trail) => {
      observations.push(trail.value);
      return trail;
    }),
  );
  checkStampIsSubstantiated("registry/ci-facts.json", stamp, observations);

  // The importer records how it read GitHub. An anonymous import is a degraded
  // read even when the timestamp is current, and `check-pipeline-health.mjs`
  // already treats it as a failure condition for the sync job.
  const mode = ciFacts.mode ?? "anonymous";
  const carried = Object.entries(ciFacts.facts ?? {}).filter(([, f]) => f?.carriedForward);

  if (mode !== "authenticated") {
    fail(
      `registry/ci-facts.json was written in '${mode}' mode — no repository-scoped token reached ` +
        `this import, so these CI facts are not independently checkable`,
    );
  }

  if (carried.length > 0) {
    const severity = mode === "authenticated" ? warn : fail;
    severity(
      `registry/ci-facts.json: ${carried.length} of ${Object.keys(ciFacts.facts ?? {}).length} ` +
        `records are carried forward from an earlier import (${carried.map(([id]) => id).join(", ")}) — ` +
        `these are shown on the site and must stay labelled as carried-forward`,
    );
  }
}

const sourceStatus = load("registry/source-status.json");
if (sourceStatus) {
  checkObservations("registry/source-status.json", sourceStatus, Date.parse(sourceStatus.checkedAt), (data) =>
    Object.entries(data.projects ?? data.entries ?? {}).flatMap(([slug, entry]) =>
      entry?.checkedAt ? [{ label: `projects.${slug}.checkedAt`, value: entry.checkedAt }] : [],
    ),
  );
}

// --- the layers that derive from one another must agree -------------------

/**
 * `collect-facts.mjs` gates on `status.derived !== "current"`, so the facts
 * layer is derived from the source-status snapshot. A facts snapshot older than
 * the status it was derived from means the two disagree, and neither is
 * authoritative.
 */
const statusStamp = stamps.get("registry/source-status.json");
const factsStamp = stamps.get("registry/facts-history.json");
if (statusStamp && factsStamp && factsStamp < statusStamp) {
  fail(
    `registry/facts-history.json (${new Date(factsStamp).toISOString().slice(0, 10)}) predates ` +
      `registry/source-status.json (${new Date(statusStamp).toISOString().slice(0, 10)}), which it is derived from`,
  );
}

// --- a summary the operator can act on ------------------------------------

if (failures > 0) {
  console.error(
    `\nfreshness: ${failures} failure(s), ${warnings} warning(s). Generated layers are not trustworthy ` +
      `until a registry sync with REGISTRY_TOKEN succeeds.`,
  );
}
process.exit(failures > 0 ? 1 : 0);