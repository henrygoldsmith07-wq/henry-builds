#!/usr/bin/env node
/**
 * Validates that every source location a case study claims actually exists,
 * before the site publishes it.
 *
 *   node scripts/verify-sources.mjs              # current projects only (publish gate)
 *   node scripts/verify-sources.mjs --all        # include archived-source studies
 *
 * What is checked:
 *   - every evidence `path` field resolves in the repo that owns it today
 *     (app-owned paths follow the 2026-08 migration into standalone repos)
 *   - every architecture layer's `path` resolves too
 *   - top-level `repo.path` pointers resolve
 *
 * Archived-source studies are exempt by default: their whole point is that the
 * code is gone, and the site labels them as such.
 *
 * Exit 1 on any missing path, so CI gates publication on it.
 */

import fs from "node:fs";
import path from "node:path";
import { pathExistsIn, resolveLocation } from "./lib/github-paths.mjs";

const root = process.cwd();
const checkAll = process.argv.includes("--all");

let errors = 0;
let checked = 0;

function fail(msg) {
  console.error(`✗ ${msg}`);
  errors++;
}

const upstreamRaw = JSON.parse(fs.readFileSync(path.join(root, "registry/upstream.json"), "utf8"));
const statusesRaw = JSON.parse(fs.readFileSync(path.join(root, "registry/source-status.json"), "utf8"));
const upstreamById = new Map((upstreamRaw.entries ?? []).map((e) => [e.id, e]));
const statusBySlug = statusesRaw.projects ?? {};

const files = fs
  .readdirSync(path.join(root, "registry/case-studies"))
  .filter((f) => f.endsWith(".json"))
  .sort();

for (const file of files) {
  const project = JSON.parse(fs.readFileSync(path.join(root, "registry/case-studies", file), "utf8"));
  const status = statusBySlug[project.slug]?.derived ?? "current";

  if (status !== "current" && !checkAll) {
    continue;
  }

  const upstream = upstreamById.get(project.upstreamId) ?? null;
  const claims = [];

  const collect = (section, item) => {
    if (item?.path) claims.push([`${section} '${item.label}'`, item.path]);
    // A GitHub blob/tree href pins its own location — check it literally.
    if (item?.href && /github\.com\/[^/]+\/[^/]+\/(?:blob|tree)\//.test(item.href)) {
      claims.push([`${section} href '${item.href}'`, { href: item.href }]);
    }
  };

  for (const metric of project.caseStudy?.metrics ?? []) {
    for (const ev of metric.evidence ?? []) collect(`metrics[${metric.label}]`, ev);
  }
  for (const [i, outcome] of (project.caseStudy?.outcomes ?? []).entries()) {
    for (const ev of outcome.evidence ?? []) collect(`outcomes[${i}]`, ev);
  }
  for (const [i, layer] of (project.caseStudy?.architecture?.layers ?? []).entries()) {
    if (layer.path) claims.push([`architecture.layers[${i}] '${layer.name}'`, layer.path]);
  }
  for (const ev of project.caseStudy?.architecture?.evidence ?? []) {
    collect("architecture", ev);
  }
  for (const [fi, failure] of (project.caseStudy?.failedApproaches ?? []).entries()) {
    for (const ev of failure.evidence ?? []) collect(`failedApproaches[${fi}]`, ev);
  }
  for (const ev of project.caseStudy?.insightLifecycle?.evidence ?? []) {
    collect("insightLifecycle", ev);
  }
  if (project.repo?.path) claims.push(["repo pointer", project.repo.path]);

  for (const [where, claim] of claims) {
    checked++;
    let location;
    if (typeof claim === "string") {
      location = resolveLocation(claim, upstream);
    } else {
      const match = claim.href.match(
        /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|tree)\/([^/]+)\/(.+?)\/?$/,
      );
      if (!match) continue;
      location = { repo: `${match[1]}/${match[2]}`, ref: match[3], path: match[4] };
    }

    try {
      // A bare repo pointer ("." or "") just means the repository itself.
      const isRoot = location.path === "." || location.path === "";
      const exists =
        isRoot || (await pathExistsIn(location.repo, location.ref, location.path));
      if (!exists) {
        fail(
          `${file}: ${where} → ${location.repo}@${location.ref}:${location.path} does not exist. ` +
            `Update the pointer or archive the study.`,
        );
      }
    } catch (error) {
      fail(`${file}: ${where} → could not check ${location.repo}: ${error.message}`);
    }
  }
}

console.log(
  `verify-sources: ${checked} paths checked across ${files.length} case studies ` +
    `(${checkAll ? "including" : "excluding"} archived sources), ${errors} missing`,
);
process.exit(errors > 0 ? 1 : 0);
