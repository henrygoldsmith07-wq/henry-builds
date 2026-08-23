#!/usr/bin/env node
/**
 * Collects per-project operational facts from GitHub and keeps history.
 *
 *   GITHUB_TOKEN=... node scripts/collect-facts.mjs
 *
 * Reads:  registry/upstream.json, ci-facts.json, source-status.json
 * Writes: registry/facts-history.json  (generated)
 *
 *   latest  — one snapshot per upstream id: CI state, deployment state,
 *             deployed-vs-HEAD, latest release, vulnerability status
 *   history — append-only daily snapshots (capped), powering trend charts
 *
 * Everything degrades gracefully: without a usable cross-repo token the
 * existing file is kept untouched, loudly.
 */

import fs from "node:fs";
import path from "node:path";
import { crossRepoReadable } from "./lib/github-paths.mjs";

const root = process.cwd();
const outPath = path.join(root, "registry/facts-history.json");
const CAP = 60;

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";
const today = new Date().toISOString().slice(0, 10);

function log(msg) {
  process.stdout.write(`collect-facts: ${msg}\n`);
}

async function ghJson(url) {
  const headers = { "user-agent": "henry-builds-facts" };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

/** Partial facts are worse than none: only collect with an authenticated token. */
async function readable() {
  if (!token) return false;
  try {
    await ghJson("https://api.github.com/repos/henrygoldsmith07-wq/arise");
    return true;
  } catch {
    return false;
  }
}

const upstream = JSON.parse(fs.readFileSync(path.join(root, "registry/upstream.json"), "utf8"));
const ciFacts = JSON.parse(fs.readFileSync(path.join(root, "registry/ci-facts.json"), "utf8"));
const statuses = JSON.parse(fs.readFileSync(path.join(root, "registry/source-status.json"), "utf8"));
const upstreamById = new Map((upstream.entries ?? []).map((e) => [e.id, e]));
const statusBySlug = statuses.projects ?? {};

if (!fs.existsSync(outPath)) {
  fs.writeFileSync(
    outPath,
    `${JSON.stringify({ _generated: true, generatedAt: null, latest: {}, history: {} }, null, 2)}\n`,
  );
}
const file = JSON.parse(fs.readFileSync(outPath, "utf8"));
file.history ??= {};
file.latest ??= {};

if (!(await readable())) {
  log("cross-repo reads unavailable — keeping the existing facts-history.json");
  if (process.env.CI) {
    console.log("::warning::facts collection skipped — no usable GitHub token (set REGISTRY_TOKEN)");
  }
  process.exit(0);
}

// Slug -> upstream id for case studies whose ids were renamed.
const slugToId = {};
for (const file_ of fs.readdirSync(path.join(root, "registry/case-studies")).filter((f) => f.endsWith(".json"))) {
  const study = JSON.parse(fs.readFileSync(path.join(root, "registry/case-studies", file_), "utf8"));
  slugToId[study.slug] = study.upstreamId;
}

for (const [slug, status] of Object.entries(statusBySlug)) {
  const id = slugToId[slug];
  const entry = id ? upstreamById.get(id) : null;
  const repo = status.repo ?? entry?.repo;
  if (status.derived !== "current" || !repo || !id) continue;

  const snapshot = { date: today };
  const headSha = status.sha;

  // --- CI ------------------------------------------------------------------
  const ci = ciFacts.facts?.[id];
  if (ci) {
    snapshot.ci = {
      conclusion: ci.conclusion,
      tests: ci.tests?.total,
      lastGreenAt: ci.lastSuccessAt?.slice(0, 10),
    };
    snapshot.sha = ci.headSha ?? headSha;
  }

  // --- deployment vs HEAD ----------------------------------------------------
  try {
    const deployments = await ghJson(
      `https://api.github.com/repos/${repo}/deployments?per_page=5`,
    );
    const prod =
      deployments.find((d) => /prod/i.test(d.environment)) ?? deployments[0] ?? null;
    if (prod) {
      const states = await ghJson(prod.statuses_url);
      snapshot.deploy = {
        state: states[0]?.state,
        environment: prod.environment,
        sha: prod.sha.slice(0, 7),
        url: states[0]?.target_url ?? undefined,
        createdAt: prod.created_at.slice(0, 10),
        upToDate: headSha ? prod.sha === headSha : undefined,
      };
    } else {
      snapshot.deploy = { state: "none" };
    }
  } catch (error) {
    log(`${slug}: deploy lookup failed (${error.message})`);
  }

  // --- latest release or tag -------------------------------------------------
  try {
    const releases = await ghJson(`https://api.github.com/repos/${repo}/releases?per_page=1`);
    if (releases.length > 0) {
      snapshot.release = {
        tag: releases[0].tag_name,
        url: releases[0].html_url,
        publishedAt: releases[0].published_at?.slice(0, 10),
      };
    } else {
      const tags = await ghJson(`https://api.github.com/repos/${repo}/tags?per_page=1`);
      if (tags.length > 0) {
        snapshot.release = {
          tag: tags[0].name,
          url: `https://github.com/${repo}/tag/${tags[0].name}`,
        };
      }
    }
  } catch {
    // no releases/tags is normal — leave absent
  }

  // --- vulnerability alerts ---------------------------------------------------
  try {
    const alerts = await ghJson(
      `https://api.github.com/repos/${repo}/dependabot/alerts?state=open&per_page=100`,
    );
    snapshot.vulnerabilities = { open: Array.isArray(alerts) ? alerts.length : 0 };
  } catch {
    snapshot.vulnerabilities = {
      unavailable: "needs a token with security_events scope (REGISTRY_TOKEN)",
    };
  }

  file.latest[id] = snapshot;
  const series = (file.history[id] ??= []);
  const existingIndex = series.findIndex((s) => s.date === today);
  if (existingIndex >= 0) series[existingIndex] = snapshot;
  else series.push(snapshot);
  if (series.length > CAP) file.history[id] = series.slice(-CAP);

  log(
    `${slug}: ci=${snapshot.ci?.conclusion ?? "?"}` +
      ` deploy=${snapshot.deploy?.state ?? "?"}${snapshot.deploy?.upToDate ? " (current)" : ""}` +
      `${snapshot.release ? ` rel=${snapshot.release.tag}` : ""}` +
      `${snapshot.vulnerabilities ? ` vuln=${snapshot.vulnerabilities.open ?? "n/a"}` : ""}`,
  );
}

file.generatedAt = new Date().toISOString();
fs.writeFileSync(outPath, `${JSON.stringify(file, null, 2)}\n`);
log(`wrote registry/facts-history.json (${Object.keys(file.latest).length} projects tracked)`);
