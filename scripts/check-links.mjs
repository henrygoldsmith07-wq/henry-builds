#!/usr/bin/env node
/**
 * Broken-link check.
 *
 *   node scripts/check-links.mjs              internal only (fast, offline)
 *   node scripts/check-links.mjs --external   also HEAD every external URL
 *   node scripts/check-links.mjs --github     also verify GitHub blob/tree paths
 *                                             exist in their repos (API, cached)
 *
 * Internal checks are always run and always fatal: a case study pointing at a
 * missing asset, or an evidence chip pointing at a route that does not exist,
 * is a bug in the site itself.
 *
 * External checks are opt-in because they depend on the network. In CI they
 * run on a schedule rather than on every push, so a third party's outage
 * cannot block a merge.
 */

import fs from "node:fs";
import path from "node:path";
import { parseGitHubUrl, pathExistsIn } from "./lib/github-paths.mjs";

const root = process.cwd();
const caseStudyDir = path.join(root, "registry/case-studies");
const publicDir = path.join(root, "public");
const distDir = path.join(root, "dist");

const checkExternal = process.argv.includes("--external");
const checkGithub = process.argv.includes("--github");
const checkAllSources = process.argv.includes("--all");

const SITE_URL = (process.env.SITE_URL ?? process.env.VITE_SITE_URL ?? "").replace(/\/$/, "");

let errors = 0;
let checked = 0;

function fail(msg) {
  console.error(`✗ ${msg}`);
  errors++;
}

const projects = fs
  .readdirSync(caseStudyDir)
  .filter((file) => file.endsWith(".json"))
  .map((file) => ({
    file: `registry/case-studies/${file}`,
    data: JSON.parse(fs.readFileSync(path.join(caseStudyDir, file), "utf8")),
  }));

const published = projects.filter((p) => p.data.publish !== false);

/** Every route the app can serve. */
const routes = new Set([
  "/",
  "/projects",
  "/auth",
  "/dashboard",
  ...published.map((p) => `/projects/${p.data.slug}`),
]);

// --- 1. local assets referenced by the registry ---------------------------
for (const { file, data } of projects) {
  const visuals = data.caseStudy?.visuals ?? [];
  for (const visual of visuals) {
    if (visual.kind === "screenshot" && visual.src) {
      checked++;
      if (!fs.existsSync(path.join(publicDir, visual.src.replace(/^\//, "")))) {
        fail(`${file}: screenshot missing from public/ — ${visual.src}`);
      }
    }
  }
  if (data.caseStudy?.video?.src) {
    checked++;
    const video = data.caseStudy.video.src.replace(/^\//, "");
    if (!fs.existsSync(path.join(publicDir, video))) {
      fail(`${file}: video missing from public/ — ${data.caseStudy.video.src}`);
    }
  }
}

// --- 2. OG card per published route ---------------------------------------
for (const { data } of published) {
  checked++;
  if (!fs.existsSync(path.join(publicDir, "og", `${data.slug}.png`))) {
    fail(`public/og/${data.slug}.png missing — run \`bun run og\``);
  }
}
for (const name of ["default", "projects"]) {
  checked++;
  if (!fs.existsSync(path.join(publicDir, "og", `${name}.png`))) {
    fail(`public/og/${name}.png missing — run \`bun run og\``);
  }
}

// --- 3. sitemap covers exactly the public routes --------------------------
const sitemapPath = path.join(publicDir, "sitemap.xml");
if (!fs.existsSync(sitemapPath)) {
  fail("public/sitemap.xml missing — run `bun run sitemap`");
} else {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const paths = new Set(locs.map((loc) => loc.replace(/^https?:\/\/[^/]+/, "") || "/"));

  // When the origin is known, every loc must be on it — a stray domain in the
  // sitemap is how a staging URL ends up indexed.
  if (SITE_URL) {
    for (const [i, loc] of locs.entries()) {
      checked++;
      if (!loc.startsWith(SITE_URL)) {
        fail(`sitemap.xml url ${i + 1} is not on ${SITE_URL}: ${loc}`);
      }
    }
  }

  const shouldBeListed = ["/", "/projects", ...published.map((p) => `/projects/${p.data.slug}`)];
  for (const route of shouldBeListed) {
    checked++;
    if (!paths.has(route)) fail(`sitemap.xml is missing ${route} — run \`bun run sitemap\``);
  }
  for (const listed of paths) {
    checked++;
    if (!routes.has(listed)) fail(`sitemap.xml lists ${listed}, which is not a route`);
  }
  // An unpublished project must not leak into the sitemap.
  for (const { data } of projects.filter((p) => p.data.publish === false)) {
    checked++;
    if (paths.has(`/projects/${data.slug}`)) {
      fail(`sitemap.xml lists /projects/${data.slug}, but that project is not published`);
    }
  }
}

// --- 4. built output references assets that exist -------------------------
if (fs.existsSync(distDir)) {
  const html = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
  for (const match of html.matchAll(/(?:src|href)="(\/[^"]+)"/g)) {
    const asset = match[1];
    if (asset.startsWith("//")) continue;
    checked++;
    if (!fs.existsSync(path.join(distDir, asset.replace(/^\//, "")))) {
      fail(`dist/index.html references ${asset}, which was not emitted`);
    }
  }
}

// --- 5. external evidence links -------------------------------------------
async function collectEvidenceUrls() {
  const urls = new Set();

  for (const { data } of projects) {
    const study = data.caseStudy ?? {};
    const evidence = [
      ...(study.architecture?.evidence ?? []),
      ...(study.failedApproaches ?? []).flatMap((f) => f.evidence ?? []),
      ...(study.metrics ?? []).flatMap((m) => m.evidence ?? []),
      ...(study.outcomes ?? []).flatMap((o) => o.evidence ?? []),
      ...(study.insightLifecycle?.evidence ?? []),
    ];
    for (const item of evidence) if (item.href) urls.add(item.href);
    if (data.repo?.href) urls.add(data.repo.href);
    if (data.liveUrl) urls.add(data.liveUrl);
  }
  return urls;
}

async function checkExternalLinks() {
  const urls = await collectEvidenceUrls();
  console.log(`check-links: HEAD-checking ${urls.size} external URLs`);

  // Bounded concurrency: slow hosts must not serialise the whole run, and a
  // hung request must not hang the job.
  const queue = [...urls];
  const worker = async () => {
    for (;;) {
      const url = queue.shift();
      if (!url) return;
      checked++;
      try {
        let response = await fetch(url, {
          method: "HEAD",
          redirect: "follow",
          signal: AbortSignal.timeout(20_000),
        });
        // Some hosts refuse HEAD but answer GET.
        if (response.status === 403 || response.status === 405 || response.status === 429) {
          response = await fetch(url, {
            method: "GET",
            redirect: "follow",
            signal: AbortSignal.timeout(20_000),
          });
        }
        if (!response.ok) fail(`${response.status} ${response.statusText} — ${url}`);
      } catch (error) {
        fail(`unreachable — ${url} (${error.message})`);
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
}

/**
 * GitHub path checking: every blob/tree URL in evidence must resolve to a real
 * file in that repo at that ref. Catches renamed files and moved repos that a
 * plain HTTP check misses (GitHub returns 404 HTML with status 404 — but only
 * for the page, not for API-level verification of what a reader will find).
 */
async function checkGithubPaths() {
  // Same degraded-mode rule as verify-sources: a repo-scoped token cannot read
  // sibling repos, and enforcing would produce pure noise. Say so, skip.
  const { crossRepoReadable } = await import("./lib/github-paths.mjs");
  if (!(await crossRepoReadable())) {
    console.warn(
      "check-links: cross-repo GitHub reads unavailable — skipping github path checks. " +
        "Set REGISTRY_TOKEN to enforce.",
    );
    if (process.env.CI) {
      console.log("::warning::check:links --github skipped — no usable GitHub token");
    }
    return;
  }

  const urls = new Set();
  const statusesRaw = fs.existsSync(path.join(root, "registry/source-status.json"))
    ? JSON.parse(fs.readFileSync(path.join(root, "registry/source-status.json"), "utf8"))
    : { projects: {} };
  const statusBySlug = statusesRaw.projects ?? {};

  // Archived-source studies keep historical pointers that legitimately rot;
  // they are labelled as archived on the page itself.
  for (const { data } of projects) {
    if (!checkAllSources && statusBySlug[data.slug]?.derived !== "current") continue;
    const study = data.caseStudy ?? {};
    const evidence = [
      ...(study.architecture?.evidence ?? []),
      ...(study.failedApproaches ?? []).flatMap((f) => f.evidence ?? []),
      ...(study.metrics ?? []).flatMap((m) => m.evidence ?? []),
      ...(study.outcomes ?? []).flatMap((o) => o.evidence ?? []),
      ...(study.insightLifecycle?.evidence ?? []),
    ];
    for (const item of evidence) if (item.href) urls.add(item.href);
    if (data.repo?.href) urls.add(data.repo.href);
  }

  const targets = new Map();
  for (const url of urls) {
    const parsed = parseGitHubUrl(url);
    if (parsed) targets.set(url, parsed);
  }
  console.log(`check-links: verifying ${targets.size} GitHub paths exist`);

  for (const [url, { repo, ref, path: filePath }] of targets) {
    checked++;
    try {
      const exists = await pathExistsIn(repo, ref, decodeURIComponent(filePath));
      if (!exists) fail(`github path missing — ${url}`);
    } catch (error) {
      fail(`could not verify github path — ${url} (${error.message})`);
    }
  }
}

try {
  if (checkExternal) await checkExternalLinks();
  if (checkGithub) await checkGithubPaths();
} catch (error) {
  fail(`checker crashed — ${error.stack ?? error}`);
}
console.log(`check-links: ${checked} checks, ${errors} broken`);
process.exit(errors > 0 ? 1 : 0);
