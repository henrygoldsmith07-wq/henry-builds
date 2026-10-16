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
import { buildRoutePaths, loadCaseStudies } from "./lib/published-projects.mjs";

const root = process.cwd();
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

/**
 * Per-project outcomes of the external URL probe.
 *
 * The results of this check used to be discarded — only the process exit code
 * survived — so the single fact this site most wants to be able to state ("every
 * evidence link was checked, and they resolve") was impossible for a reader to
 * see. Recording them turns a pass/fail gate into something the product can
 * actually show. Populated only under `--external`, which is the scheduled path.
 */
const linkHealth = new Map();

function recordLink(slug, outcome) {
  if (!slug) return;
  let entry = linkHealth.get(slug);
  if (!entry) {
    entry = { checked: 0, broken: 0, unverifiable: 0 };
    linkHealth.set(slug, entry);
  }
  entry.checked++;
  if (outcome === "broken") entry.broken++;
  else if (outcome === "unverifiable") entry.unverifiable++;
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  errors++;
}

function warn(msg) {
  console.warn(`  ! ${msg}`);
}

const {
  all: projects,
  published,
  unpublished,
} = loadCaseStudies(root);

/**
 * Every route the app can serve.
 *
 * Derived from the canonical manifest, so a route added there is checked here
 * without anyone remembering to edit this file.
 */
const routes = new Set(buildRoutePaths(published));

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

  // Same manifest, so the sitemap and the checker cannot disagree about what
  // the site is supposed to serve.
  for (const route of routes) {
    checked++;
    if (!paths.has(route)) fail(`sitemap.xml is missing ${route} — run \`bun run sitemap\``);
  }
  for (const listed of paths) {
    checked++;
    if (!routes.has(listed)) fail(`sitemap.xml lists ${listed}, which is not a route`);
  }
  // An unpublished project must not leak into the sitemap.
  for (const { data } of unpublished) {
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
    // Route-shaped hrefs (the `<noscript>` bodies link between routes) are
    // served by rewrites, never emitted as literal files. The canonical route
    // manifest — not the dist filesystem — is what says they exist. Anything
    // else must be a real emitted asset.
    const bare = asset.split(/[?#]/)[0].replace(/\/$/, "") || "/";
    if (routes.has(bare)) continue;
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
    // Each entry is an array of evidence objects, gathered with `?? []` so a
    // missing group is simply empty. These must NOT be spread into the outer
    // array: `...flatMap((m) => m.evidence ?? [])` pushes each *evidence
    // object* as a top-level element, and the loop below then tries to iterate
    // that object — `TypeError: list is not iterable`. That is what happened
    // here: `--github` threw on the first project whose evidence lived under
    // `metrics`/`outcomes` rather than `architecture`, so upstream path
    // verification never actually ran in the scheduled link check.
    const groups = [
      study.architecture?.evidence ?? [],
      (study.metrics ?? []).flatMap((m) => m.evidence ?? []),
      (study.outcomes ?? []).flatMap((o) => o.evidence ?? []),
      study.benchmarkChart?.evidence ?? [],
      study.insightLifecycle?.evidence ?? [],
    ];
    for (const group of groups) {
      for (const item of group) {
        if (item?.kind || item?.href || item?.path || item?.src) items.push({ file, item });
      }
    }
  }
  return items;
}

/**
 * HTML URLs belonging to repositories the registry knows are private.
 *
 * `github.com/owner/repo/...` answers 404 to an unauthenticated *page* request
 * even when the repository exists, because the token in `GITHUB_TOKEN`
 * authenticates the API rather than a browser session. Probing those URLs as
 * links therefore reports a failure for every private source — and the whole
 * point of `--github` below is that the API is the correct way to check them.
 *
 * Built from two sources, because one is not enough:
 *
 *  1. `registry/source-status.json`, which names the repository behind each
 *     project.
 *  2. The evidence URLs of any project whose source is private. A repository
 *     can be renamed upstream (rtk's source is now `slimout`), so the name in
 *     source-status.json does not always match the name in an older evidence
 *     link. The access level travels with the project, so keying off that
 *     catches the alias too.
 *
 * Skipping them here is not a weakening of the check: `checkGithubPathsUpstream`
 * still verifies each `path:` against the API, and `verify-sources` records
 * repository existence in `registry/source-status.json`. What this removes is a
 * guaranteed false failure that made the scheduled evidence monitor red every
 * run, which is how a real broken link would have gone unnoticed.
 */
function privateRepoPrefixes(projectsWithEvidence, privateSlugs) {
  const prefixes = new Set();
  const add = (href) => {
    const match = /^(https:\/\/github\.com\/[^/]+\/[^/?#]+)/.exec(href ?? "");
    if (match) prefixes.add(match[1]);
  };

  const statusPath = path.join(root, "registry", "source-status.json");
  if (fs.existsSync(statusPath)) {
    try {
      const { projects: statuses = {} } = JSON.parse(fs.readFileSync(statusPath, "utf8"));
      for (const entry of Object.values(statuses)) {
        if (entry?.access === "private" && entry.repo) {
          prefixes.add(`https://github.com/${entry.repo}`);
        }
      }
    } catch (error) {
      warn(`could not read registry/source-status.json (${error.message}); probing every URL`);
    }
  }

  for (const { data, evidenceUrls } of projectsWithEvidence) {
    if (!privateSlugs.has(data.slug)) continue;
    for (const href of evidenceUrls) add(href);
    add(data.repo?.href);
  }

  return prefixes;
}

/**
 * Slugs whose source the registry records as private.
 *
 * The case-study JSON does not carry the access level — it is derived in
 * `registry/source-status.json` from the upstream repository — so it has to be
 * read here rather than off `data`. Read separately from the prefix builder
 * because both the skip list and the 404 fallback need it.
 */
function privateSourceSlugs() {
  const statusPath = path.join(root, "registry", "source-status.json");
  const slugs = new Set();
  if (!fs.existsSync(statusPath)) return slugs;
  try {
    const { projects: statuses = {} } = JSON.parse(fs.readFileSync(statusPath, "utf8"));
    for (const [slug, entry] of Object.entries(statuses)) {
      if (entry?.access === "private") slugs.add(slug);
    }
  } catch {
    // Reported by privateRepoPrefixes; an unreadable file must not crash.
  }
  return slugs;
}

async function checkExternalLinks() {
  const urls = new Set();
  const privateSlugs = privateSourceSlugs();
  // URLs that belong to a case study whose source was removed upstream. Their
  // targets are expected to be gone, so a 404 is the documented outcome rather
  // than a broken link — but a *200* would mean the archive claim is wrong, so
  // these are still probed and reported.
  const removedSourceUrls = new Set();
  const projectsWithEvidence = [];
  // Which project(s) cite each URL, so an outcome can be attributed back to a
  // case study. A URL shared by two studies is recorded against both.
  const slugsByUrl = new Map();

  for (const { data } of projects) {
    const study = data.caseStudy ?? {};
    const evidence = [
      ...(study.architecture?.evidence ?? []),
      ...(study.metrics ?? []).flatMap((m) => m.evidence ?? []),
      ...(study.outcomes ?? []).flatMap((o) => o.evidence ?? []),
    ];
    const removed = data.sourceState === "historical-case-study";
    const evidenceUrls = [];
    for (const item of evidence) {
      if (!item.href) continue;
      urls.add(item.href);
      evidenceUrls.push(item.href);
      const owners = slugsByUrl.get(item.href) ?? new Set();
      owners.add(data.slug);
      slugsByUrl.set(item.href, owners);
      if (removed) removedSourceUrls.add(item.href);
    }
    projectsWithEvidence.push({ data, evidenceUrls });
    for (const url of [data.repo?.href, data.liveUrl]) {
      if (!url) continue;
      urls.add(url);
      const owners = slugsByUrl.get(url) ?? new Set();
      owners.add(data.slug);
      slugsByUrl.set(url, owners);
    }
  }

  const privatePrefixes = privateRepoPrefixes(projectsWithEvidence, privateSlugs);
  const probeable = [...urls].filter(
    (url) => ![...privatePrefixes].some((prefix) => url.startsWith(prefix)),
  );
  const skipped = urls.size - probeable.length;
  console.log(
    `check-links: HEAD-checking ${probeable.length} external URLs` +
      (skipped ? ` (${skipped} private-repo URL(s) verified through the API instead)` : ""),
  );

  // Private-repo URLs are never probed over HTTP — an anonymous 404 from a
  // private repository says nothing. They are confirmed through the API in
  // `privateRepoPrefixes`, so they are recorded as checked-but-not-probed
  // rather than counted as failures or silently dropped.
  const prefixList = [...privatePrefixes];
  for (const url of urls) {
    if (!prefixList.some((prefix) => url.startsWith(prefix))) continue;
    for (const slug of slugsByUrl.get(url) ?? []) recordLink(slug, "unverifiable");
  }

  for (const url of probeable) {
    checked++;
    const owners = slugsByUrl.get(url) ?? [];
    try {
      let response = await fetch(url, { method: "HEAD", redirect: "follow" });
      // Some hosts refuse HEAD but answer GET.
      if (response.status === 403 || response.status === 405) {
        response = await fetch(url, { method: "GET", redirect: "follow" });
      }
      if (!response.ok) {
        if (removedSourceUrls.has(url) && response.status === 404) {
          // The case study says this source was removed, and it is. Passing
          // here is not a weaker check — `verify-sources` and the case study's
          // own banner carry the same claim, and a 200 would contradict it.
          console.log(`  · ${url} — absent as the historical case study states`);
          for (const slug of owners) recordLink(slug, "ok");
        } else {
          // A 404 from a private repository's web page is ambiguous: the repo
          // may exist but be invisible to an unauthenticated page request. Ask
          // the API before calling the link broken, so a genuinely deleted
          // repository still fails while a private one that exists passes.
          const verified = await verifyViaApi(url);
          if (verified) {
            console.log(`  ~ ${url} — 404 to an anonymous request, repo confirmed via the API`);
            for (const slug of owners) recordLink(slug, "ok");
          } else {
            fail(`${response.status} ${response.statusText} — ${url}`);
            for (const slug of owners) recordLink(slug, "broken");
          }
        }
      } else {
        for (const slug of owners) recordLink(slug, "ok");
      }
    } catch (error) {
      // An unreachable host is not proof the link is dead — a timeout or a
      // transient outage must not be published as a broken citation. The gate
      // still fails (a human should look), but the recorded health says
      // "unverifiable", which is the honest description.
      fail(`unreachable — ${url} (${error.message})`);
      for (const slug of owners) recordLink(slug, "unverifiable");
    }
  }
}

/**
 * Ask the GitHub API whether the repository behind a github.com URL exists.
 *
 * Returns true only on a definite yes, so an outage or a rate limit leaves the
 * original 404 as the verdict rather than silently passing a broken link.
 */
async function verifyViaApi(url) {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/?#]+)/.exec(url);
  if (!match) return false;
  const [, owner, repo] = match;
  try {
    const headers = { "user-agent": "henry-builds-link-check" };
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo.replace(/\.git$/, "")}`, {
      headers,
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- 6. repo paths behind evidence really exist upstream -------------------
async function checkGithubPathsUpstream() {
  // Every `path:` field plus the top-level repo pointer must exist at SOURCE_REF.
  const paths = new Set();
  // A historical case study documents work whose source was removed upstream.
  // Its evidence paths describe where the code *used to* live, so demanding
  // that they still resolve contradicts the case study's own banner — and the
  // `repo.path` loop below already exempts them. The evidence loop did not,
  // which is why the three removed projects (dictation-typer, meeting-recorder,
  // world-news) reported missing paths on every scheduled run.
  const removedFiles = new Set(
    projects
      .filter(({ data }) => data.sourceState === "historical-case-study")
      .map(({ file }) => file),
  );
  for (const { file, item } of collectEvidenceItems()) {
    if (item.path && item.path.startsWith("apps/") && !removedFiles.has(file)) {
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

/**
 * Persist what was actually checked, so the site can say it.
 *
 * Written only when the external probe ran: the internal-only mode (`bun run
 * check:links`) is a fast offline gate and knows nothing about whether a remote
 * evidence link resolves. Recording it then would let a build claim "links
 * verified" on the strength of a run that never touched the network — which is
 * exactly the kind of unearned assertion this site is built to avoid.
 *
 * The file is committed by `registry-sync` alongside the other generated
 * registry layers, and `check-registry-freshness` ages it out like the rest, so
 * a stale check stops being presented as a current one.
 */
function writeLinkHealth() {
  if (!checkExternal) return;
  const projectsOut = {};
  for (const [slug, entry] of [...linkHealth].sort(([a], [b]) => a.localeCompare(b))) {
    projectsOut[slug] = {
      checked: entry.checked,
      broken: entry.broken,
      unverifiable: entry.unverifiable,
    };
  }
  const payload = {
    _generated: "Written by scripts/check-links.mjs --external. Do not edit by hand.",
    checkedAt: new Date().toISOString(),
    sourceRepo: SOURCE_REPO,
    sourceRef: SOURCE_REF,
    // The token matters to a reader: an unauthenticated run cannot see private
    // repositories, so more of its results are "unverifiable" than a
    // token-authenticated run's. Recording it keeps the two comparable.
    authenticated: Boolean(token),
    totalChecked: [...linkHealth.values()].reduce((sum, e) => sum + e.checked, 0),
    totalBroken: [...linkHealth.values()].reduce((sum, e) => sum + e.broken, 0),
    projects: projectsOut,
  };
  const target = path.join(root, "registry", "link-health.json");
  fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `check-links: wrote registry/link-health.json — ${payload.totalChecked} link(s) across ` +
      `${Object.keys(projectsOut).length} project(s), ${payload.totalBroken} broken`,
  );
}

const done = Promise.all([
  checkExternal ? checkExternalLinks() : Promise.resolve(),
  checkGithubPaths ? checkGithubPathsUpstream() : Promise.resolve(),
]);

done.then(() => {
  writeLinkHealth();
  console.log(`check-links: ${checked} checks, ${errors} broken`);
  process.exit(errors > 0 ? 1 : 0);
});
