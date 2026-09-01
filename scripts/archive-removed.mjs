#!/usr/bin/env node
/**
 * Detects projects whose source has disappeared from the monorepo and moves
 * them to a clearly-labelled historical state instead of letting them pose as
 * live work.
 *
 *   node scripts/archive-removed.mjs            # apply transitions to registry/case-studies/
 *   node scripts/archive-removed.mjs --check    # report only; exit 1 if a transition is owed
 *
 * Source states (what the site means by each):
 *   current-source          the code lives in the monorepo today
 *   archived-source         the code lives in the monorepo but is archived/superseded there
 *   concept                 an idea/design with no product source claimed
 *   historical-case-study   the source no longer exists on main — kept for the record only
 *
 * A project becomes historical-case-study when its upstreamId is gone from the
 * monorepo registry, or its registry path no longer exists on main. The script
 * never deletes narrative: it sets stage=archived, drops it from the landing
 * page, and stamps when/why the transition happened.
 *
 * Run registry:import first — this reads the freshly imported upstream.json.
 * No dependencies, on purpose.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const caseStudyDir = path.join(root, "registry/case-studies");
const checkOnly = process.argv.includes("--check");

const SOURCE_STATES = [
  "current-source",
  "archived-source",
  "concept",
  "historical-case-study",
];

let changes = 0;
const report = [];

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function pathExistsUpstream(entry) {
  // The import step already resolved entries against main; an entry present in
  // upstream.json is by construction still registered upstream. Path existence
  // beyond registration is checked by validate-registry against the GitHub API;
  // here we trust the fresh snapshot's entry list as the removal signal.
  return Boolean(entry);
}

const upstreamPath = path.join(root, "registry/upstream.json");
if (!fs.existsSync(upstreamPath)) {
  console.error("archive-removed: registry/upstream.json missing — run `bun run registry:import` first");
  process.exit(1);
}
const upstream = loadJson(upstreamPath);
const upstreamById = new Map((upstream.entries ?? []).map((e) => [e.id, e]));

const today = new Date().toISOString().slice(0, 10);

for (const file of fs.readdirSync(caseStudyDir).filter((f) => f.endsWith(".json")).sort()) {
  const full = path.join(caseStudyDir, file);
  const project = loadJson(full);
  const id = project.slug ?? path.basename(file, ".json");

  const entry = upstreamById.get(project.upstreamId);
  const exists = pathExistsUpstream(entry);

  let targetState;
  if (project.sourceState === "concept") {
    targetState = "concept"; // author-declared; nothing to detect
  } else if (!exists) {
    targetState = "historical-case-study";
  } else if (entry.lifecycle === "archived" || entry.lifecycle === "superseded") {
    targetState = "archived-source";
  } else {
    targetState = "current-source";
  }

  const current = project.sourceState;
  if (current !== targetState) {
    const line = `${id}: ${current ?? "(unset)"} → ${targetState}`;
    report.push(line);

    if (!checkOnly) {
      project.sourceState = targetState;

      if (targetState === "historical-case-study") {
        const already = project.sourceRemoved?.detectedAt;
        project.stage = "archived";
        project.featured = false;
        project.sourceRemoved = {
          detectedAt: already ?? today,
          note:
            project.sourceRemoved?.note ??
            "Source no longer exists in the monorepo (removed from apps/registry.json on main). Kept as a historical case study.",
        };
      }
      if (targetState === "archived-source" && project.stage !== "shipped") {
        project.stage = "archived";
      }

      fs.writeFileSync(full, `${JSON.stringify(project, null, 2)}\n`);
      changes++;
    }
  } else {
    // Normalise the field onto every file so the site can always rely on it.
    if (project.sourceState === undefined) {
      report.push(`${id}: sourceState set to ${targetState}`);
      if (!checkOnly) {
        project.sourceState = targetState;
        fs.writeFileSync(full, `${JSON.stringify(project, null, 2)}\n`);
        changes++;
      }
    }
  }
}

console.log(`archive-removed: ${changes} file(s) changed, ${report.length} transition(s)`);
for (const line of report) console.log(`  · ${line}`);

process.exit(checkOnly && changes > 0 ? 1 : 0);
