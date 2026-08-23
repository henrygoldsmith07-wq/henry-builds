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
let warnings = 0;
let checked = 0;

function fail(msg) {
  console.error(`✗ ${msg}`);
  errors++;
}

function warn(msg) {
  console.warn(`  ! ${msg}`);
  warnings++;
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

  // Archived-source studies keep historical pointers that legitimately rot;
  // their pages disclose the archival, so they are not alarm fodder.
  const statusPath = path.join(root, "registry/source-status.json");
  const statusBySlug = fs.existsSync(statusPath)
    ? (JSON.parse(fs.readFileSync(statusPath, "utf8")).projects ?? {})
    : {};

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
    if (data.liveUrl) urls.add(data.liveUrl);
  }
  return urls;
}

async function checkExternalLinks() {
  const urls = await collectEvidenceUrls();

  // Repos known to be private (from the generated source-status) 404 to
  // anonymous HTML requests by definition. They are verified via the API
  // instead and reported as access-limited, not broken.
  const privateRepos = new Set();
  const statusPath = path.join(root, "registry/source-status.json");
  if (fs.existsSync(statusPath)) {
    for (const entry of Object.values(JSON.parse(fs.readFileSync(statusPath, "utf8")).projects ?? {})) {
      if (entry.access === "private" && entry.repo) privateRepos.add(entry.repo);
    }
  }
  const repoOf = (url) => {
    const m = url.match(/^https?:\/\/github\.com\/([^/]+\/[^/]+)/);
    return m ? m[1] : null;
  };

  const token = (process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "").trim();
  const queue = [...urls];
  const worker = async () => {
    for (;;) {
      const url = queue.shift();
      if (!url) return;
      checked++;
      const repo = repoOf(url);
      const headers = { "user-agent": "Mozilla/5.0 (compatible; henry-builds-link-check)" };
      if (token && (repo || url.includes("api.github.com"))) {
        headers.authorization = `Bearer ${token}`;
      }
      try {
        if (repo && privateRepos.has(repo)) {
          if (!token) {
            // Without a token the API 404s private repos by definition; the
            // source-status derivation already verified existence with one.
            warn(`private source, not verifiable this run (no token) — ${url}`);
            continue;
          }
          const res = await fetch(`https://api.github.com/repos/${repo}`, {
            headers,
            signal: AbortSignal.timeout(20_000),
          });
          if (res.ok) {
            console.log(`  · private source exists (access-limited) — ${url}`);
            continue;
          }
          fail(`private source unreachable even via API — ${url}`);
          continue;
        }
        const isGithubHtml = /^https?:\/\/github\.com\//.test(url);
        let response = await fetch(url, {
          method: isGithubHtml ? "GET" : "HEAD",
          redirect: "follow",
          headers,
          signal: AbortSignal.timeout(20_000),
        });
        if (!isGithubHtml && [403, 405, 429].includes(response.status)) {
          response = await fetch(url, {
            method: "GET",
            redirect: "follow",
            headers,
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
      // Access failures are not evidence failures.
      warn(`could not verify github path this run — ${url} (${error.message})`);
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
