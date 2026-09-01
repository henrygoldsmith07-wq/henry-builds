#!/usr/bin/env node
/**
 * Broken-link check.
 *
 *   node scripts/check-links.mjs              internal only (fast, offline)
 *   node scripts/check-links.mjs --external   also HEAD every external URL
 *
 * Internal checks are always run and always fatal: a case study pointing at a
 * missing asset, or an evidence chip pointing at a route that does not exist,
 * is a bug in the site itself.
 *
 * External checks are opt-in because they depend on the network and on GitHub
 * rate limits. In CI they run on a schedule rather than on every push, so a
 * third party's outage cannot block a merge.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const caseStudyDir = path.join(root, "registry/case-studies");
const publicDir = path.join(root, "public");
const distDir = path.join(root, "dist");

const checkExternal = process.argv.includes("--external");
// Verify evidence `path:` fields against the GitHub API rather than trusting
// that a blob URL answers 200. A renamed or deleted directory upstream breaks
// an evidence link without any HTTP error on the rendered page.
const checkGithubPaths = process.argv.includes("--github");

const SOURCE_REPO = process.env.UPSTREAM_REPO ?? "henrygoldsmith07-wq/Claude-Code";
const SOURCE_REF = process.env.UPSTREAM_REF ?? "main";
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";

let errors = 0;
let checked = 0;

function fail(msg) {
  console.error(`✗ ${msg}`);
  errors++;
}

function warn(msg) {
  console.warn(`  ! ${msg}`);
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
function collectEvidenceItems() {
  const items = [];
  for (const { file, data } of projects) {
    const study = data.caseStudy ?? {};
    const lists = [
      study.architecture?.evidence ?? [],
      ...(study.metrics ?? []).flatMap((m) => m.evidence ?? []),
      ...(study.outcomes ?? []).flatMap((o) => o.evidence ?? []),
      study.benchmarkChart?.evidence ?? [],
      study.insightLifecycle?.evidence ?? [],
    ];
    for (const list of lists) {
      for (const item of list) {
        if (item?.kind || item?.href || item?.path || item?.src) items.push({ file, item });
      }
    }
  }
  return items;
}

async function checkExternalLinks() {
  const urls = new Set();

  for (const { data } of projects) {
    const study = data.caseStudy ?? {};
    const evidence = [
      ...(study.architecture?.evidence ?? []),
      ...(study.metrics ?? []).flatMap((m) => m.evidence ?? []),
      ...(study.outcomes ?? []).flatMap((o) => o.evidence ?? []),
    ];
    for (const item of evidence) if (item.href) urls.add(item.href);
    if (data.repo?.href) urls.add(data.repo.href);
    if (data.liveUrl) urls.add(data.liveUrl);
  }

  console.log(`check-links: HEAD-checking ${urls.size} external URLs`);

  for (const url of urls) {
    checked++;
    try {
      let response = await fetch(url, { method: "HEAD", redirect: "follow" });
      // Some hosts refuse HEAD but answer GET.
      if (response.status === 403 || response.status === 405) {
        response = await fetch(url, { method: "GET", redirect: "follow" });
      }
      if (!response.ok) fail(`${response.status} ${response.statusText} — ${url}`);
    } catch (error) {
      fail(`unreachable — ${url} (${error.message})`);
    }
  }
}

// --- 6. repo paths behind evidence really exist upstream -------------------
async function checkGithubPathsUpstream() {
  // Every `path:` field plus the top-level repo pointer must exist at SOURCE_REF.
  const paths = new Set();
  for (const { file, item } of collectEvidenceItems()) {
    if (item.path && item.path.startsWith("apps/")) {
      paths.add(JSON.stringify({ path: item.path, file }));
    }
  }
  for (const { file, data } of projects) {
    if (data.repo?.path && data.sourceState !== "historical-case-study") {
      paths.add(JSON.stringify({ path: data.repo.path, file }));
    }
  }

  const unique = [...paths].map((s) => JSON.parse(s));
  console.log(
    `check-links: verifying ${unique.length} repo path(s) against ${SOURCE_REPO}@${SOURCE_REF}`,
  );

  const cache = new Map();
  for (const { path: repoPath, file } of unique) {
    checked++;
    if (!cache.has(repoPath)) {
      try {
        const headers = { "user-agent": "henry-builds-link-check" };
        if (token) headers.authorization = `Bearer ${token}`;
        const res = await fetch(
          `https://api.github.com/repos/${SOURCE_REPO}/contents/${encodeURI(repoPath)}?ref=${SOURCE_REF}`,
          { headers },
        );
        cache.set(repoPath, res.ok ? true : res.status === 404 ? false : `HTTP ${res.status}`);
      } catch (error) {
        cache.set(repoPath, `error: ${error.message}`);
      }
    }
    const result = cache.get(repoPath);
    if (result === false) {
      fail(`${file}: evidence path '${repoPath}' does not exist on ${SOURCE_REPO}@${SOURCE_REF}`);
    } else if (result !== true) {
      // Unknown ≠ broken (rate limit / outage). Report, don't fail.
      warn(`could not verify ${repoPath} (${result})`);
    }
  }
}

const done = Promise.all([
  checkExternal ? checkExternalLinks() : Promise.resolve(),
  checkGithubPaths ? checkGithubPathsUpstream() : Promise.resolve(),
]);

done.then(() => {
  console.log(`check-links: ${checked} checks, ${errors} broken`);
  process.exit(errors > 0 ? 1 : 0);
});
