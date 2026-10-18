#!/usr/bin/env node
/**
 * Emits one crawler-visible HTML entry per public route after Vite builds.
 *
 * React still owns the page after hydration. These files exist so crawlers that
 * do not execute JavaScript see the same title, description, canonical URL and
 * OpenGraph card that the runtime SiteMetadata component exposes.
 *
 * Vercel checks the filesystem before rewrites. With cleanUrls enabled,
 * /projects/revise resolves to dist/projects/revise.html; unknown paths fall
 * through to dist/404.html with an actual 404 response.
 */

import fs from "node:fs";
import path from "node:path";
import { buildRoutePaths, loadCaseStudies } from "./lib/published-projects.mjs";
import {
  BUILD_LOG_DESCRIPTION,
  BUILD_LOG_TITLE,
  COMPARE_DESCRIPTION,
  COMPARE_TITLE,
  LANDING_DESCRIPTION,
  LANDING_TITLE,
  PROJECTS_DESCRIPTION,
  PROJECTS_TITLE,
  SITE_NAME,
  caseStudyGraph,
  collectionGraph,
  escapeHtml,
  landingGraph,
  nameSortedEntries,
  noscriptBody,
} from "../src/data/registry/structured-data.mjs";
import { profileData } from "../src/data/profile-data.mjs";
import { LINK_CHECK_MAX_AGE_DAYS, isWithinWindow } from "../src/data/registry/freshness.mjs";

const root = process.cwd();
const distDir = path.join(root, "dist");
const templatePath = path.join(distDir, "index.html");

const PRODUCTION_ORIGIN = "https://henry-builds.vercel.app";
const origin =
  (process.env.SITE_URL ?? process.env.VITE_SITE_URL ?? "").replace(/\/$/, "") ||
  PRODUCTION_ORIGIN;

if (!fs.existsSync(templatePath)) {
  console.error("generate-route-html: dist/index.html is missing — run Vite first.");
  process.exit(1);
}

const template = fs.readFileSync(templatePath, "utf8");
const { published, upstreamById } = loadCaseStudies(root);

// The build-log entries are generated data, not a static import — the
// noscript body needs the entries that exist *now*, so they are read from
// the committed registry/build-log.json rather than re-deriving them here.
const buildLogPath = path.join(root, "registry", "build-log.json");
const buildLogEntries = fs.existsSync(buildLogPath)
  ? JSON.parse(fs.readFileSync(buildLogPath, "utf8")).entries ?? []
  : [];

/**
 * Site-wide evidence-link verification, for crawlers.
 *
 * `registry/link-health.json` is produced by the scheduled
 * `check-links --external` run. It is the one generated layer that states a
 * positive fact about the site ("these links were checked, and they resolve"),
 * so it belongs in the crawler-visible body — otherwise the only place it
 * exists is a JSON file a crawler has no reason to fetch, and the claim is
 * silently unavailable to exactly the reader it matters to.
 *
 * Absent file, stale check, or any broken link each render as a specific,
 * honest sentence rather than being omitted or rounded to "verified".
 */
const linkHealthPath = path.join(root, "registry", "link-health.json");
const linkHealth = fs.existsSync(linkHealthPath)
  ? JSON.parse(fs.readFileSync(linkHealthPath, "utf8"))
  : null;
const linkHealthFresh = linkHealth && isWithinWindow(linkHealth.checkedAt, LINK_CHECK_MAX_AGE_DAYS);
const linkHealthSections = linkHealth
  ? [
      {
        heading: "Evidence links",
        items: [
          linkHealth.totalBroken > 0
            ? `${linkHealth.totalBroken} of ${linkHealth.totalChecked} evidence links did not resolve on the last automated check (${String(linkHealth.checkedAt).slice(0, 10)}).`
            : linkHealthFresh
              ? `All ${linkHealth.totalChecked} evidence links resolved on ${String(linkHealth.checkedAt).slice(0, 10)}.`
              : `The last evidence-link check was ${String(linkHealth.checkedAt).slice(0, 10)}, older than the ${LINK_CHECK_MAX_AGE_DAYS}-day window this site treats as current.`,
          linkHealth.authenticated
            ? `Checked with a repository token, so private repositories were verified through the API.`
            : `Checked without a repository token, so private repositories could not be confirmed.`,
        ],
      },
    ]
  : [
      {
        heading: "Evidence links",
        items: [
          "No automated evidence-link check has run for this build, so nothing here has been verified.",
        ],
      },
    ];
const projects = published
  .map(({ data }) => data)
  .sort((a, b) => a.name.localeCompare(b.name));

// escapeHtml is imported from the shared structured-data module. It used to be
// defined inline here; the single copy keeps the two from drifting.

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceOrInsert(html, pattern, replacement) {
  if (pattern.test(html)) return html.replace(pattern, replacement);
  return html.replace("</head>", `  ${replacement}\n</head>`);
}

function setTitle(html, title) {
  const tag = `<title>${escapeHtml(title)}</title>`;
  return replaceOrInsert(html, /<title>[\s\S]*?<\/title>/i, tag);
}

function setMeta(html, attribute, key, content) {
  const pattern = new RegExp(
    `<meta\\b(?=[^>]*\\b${attribute}=["']${escapeRegExp(key)}["'])[^>]*>`,
    "i",
  );
  const tag = `<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(content)}" />`;
  return replaceOrInsert(html, pattern, tag);
}

function setCanonical(html, href) {
  const pattern = /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i;
  const tag = `<link rel="canonical" href="${escapeHtml(href)}" />`;
  return replaceOrInsert(html, pattern, tag);
}

function setStructuredData(html, value) {
  const pattern =
    /<script\b(?=[^>]*\bid=["']portfolio-structured-data["'])[^>]*>[\s\S]*?<\/script>/i;
  const json = JSON.stringify(value).replace(/</g, "\\u003c");
  const tag = `<script id="portfolio-structured-data" type="application/ld+json">${json}</script>`;
  return replaceOrInsert(html, pattern, tag);
}

function renderPage({
  title,
  description,
  route,
  image,
  imageAlt,
  type = "website",
  noIndex = false,
  structuredData,
  body,
}) {
  const url = `${origin}${route === "/" ? "/" : route}`;
  const imageUrl = image.startsWith("http") ? image : `${origin}${image}`;

  let html = template;
  html = setTitle(html, title);
  html = setMeta(html, "name", "description", description);
  html = setMeta(html, "name", "robots", noIndex ? "noindex, nofollow" : "index, follow");
  html = setMeta(html, "property", "og:site_name", "Henry Goldsmith");
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:description", description);
  html = setMeta(html, "property", "og:type", type);
  html = setMeta(html, "property", "og:url", url);
  html = setMeta(html, "property", "og:image", imageUrl);
  html = setMeta(html, "property", "og:image:width", "1200");
  html = setMeta(html, "property", "og:image:height", "630");
  html = setMeta(html, "property", "og:image:alt", imageAlt ?? title);
  html = setMeta(html, "property", "og:locale", "en_GB");
  html = setMeta(html, "name", "twitter:card", "summary_large_image");
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "name", "twitter:description", description);
  html = setMeta(html, "name", "twitter:image", imageUrl);
  html = setMeta(html, "name", "twitter:image:alt", imageAlt ?? title);
  html = setCanonical(html, url);

  if (structuredData) html = setStructuredData(html, structuredData);

  // The template body is an empty `#root` shell on a fresh build — but once
  // this generator has run, `dist/index.html` (the template) already carries a
  // `<noscript>` body, and the next run reads it back. An exact-match replace
  // of `<div id="root"></div>` would silently stop firing and leave the landing
  // body in every file, so the whole root subtree is replaced instead.
  // `noscriptBody` emits no nested divs, so matching to the first `</div>`
  // cannot truncate. The evidence test below pins that invariant, and this is
  // also what makes the generator idempotent: two consecutive runs yield
  // byte-identical output.
  if (body) {
    html = html.replace(
      /<div id="root">[\s\S]*?<\/div>/,
      `<div id="root">${body}</div>`,
    );
  }

  return html;
}

const written = [];

/**
 * Writes a crawler-visible route file and records it, so the count reported at
 * the end is what was actually written rather than an arithmetic guess.
 */
function write(relativePath, html) {
  const target = path.join(distDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
  written.push(relativePath);
  console.log(`  ${relativePath}`);
}

/**
 * Removes the page of any case study that is no longer published.
 *
 * Writing the published set is not enough on its own: `dist/` survives between
 * builds, so closing a project's publication gate leaves its previous HTML in
 * place. `check-route-html.mjs` then fails — correctly — because a gated
 * project still has a crawlable page, which is exactly the state this site
 * exists to avoid. Deleting here keeps the two in step automatically.
 */
function pruneGatedRoutes(publishedSlugs) {
  const projectsDir = path.join(distDir, "projects");
  if (!fs.existsSync(projectsDir)) return;
  for (const file of fs.readdirSync(projectsDir)) {
    if (!file.endsWith(".html")) continue;
    const slug = file.replace(/\.html$/, "");
    if (publishedSlugs.has(slug)) continue;
    fs.rmSync(path.join(projectsDir, file), { force: true });
    console.log(`  projects/${file} (removed — publication gate is closed)`);
  }
}

// Route copy lives in structured-data.mjs so the static HTML and the hydrated
// runtime describe the same page with the same words. The builder functions
// below are the same ones SiteMetadata calls, which is what makes "agrees"
// checkable rather than aspirational.
const person = {
  githubUrl: profileData.contact.github,
  knowsAbout: profileData.knowsAbout,
};

const entries = nameSortedEntries(projects, origin);

// Links both the head metadata and the body can share: one derivation of the
// project list, used by the ItemList graphs and the `<noscript>` link lists.
const entryLinks = entries.map((entry) => {
  const slug = entry.url.replace(`${origin}/projects/`, "");
  const project = projects.find((candidate) => candidate.slug === slug);
  return {
    href: `/projects/${slug}`,
    label: entry.name,
    ...(project?.tagline ? { note: project.tagline } : {}),
  };
});

write(
  "index.html",
  renderPage({
    title: LANDING_TITLE,
    description: LANDING_DESCRIPTION,
    route: "/",
    image: "/og/default.png",
    imageAlt: "Henry Goldsmith — build it, measure it, say what it does.",
    structuredData: landingGraph(origin, person),
    body: noscriptBody({
      heading: LANDING_TITLE,
      description: LANDING_DESCRIPTION,
      links: [
        { href: "/projects", label: "All work" },
        { href: "/compare", label: "Compare the work" },
        { href: "/build-log", label: "Build log" },
      ],
    }),
  }),
);

write(
  "projects.html",
  renderPage({
    title: PROJECTS_TITLE,
    description: PROJECTS_DESCRIPTION,
    route: "/projects",
    image: "/og/projects.png",
    imageAlt: `${SITE_NAME} — all work`,
    structuredData: collectionGraph({
      origin,
      route: "/projects",
      title: PROJECTS_TITLE,
      entries,
    }),
    body: noscriptBody({
      heading: PROJECTS_TITLE,
      description: PROJECTS_DESCRIPTION,
      links: entryLinks,
    }),
  }),
);

write(
  "compare.html",
  renderPage({
    title: COMPARE_TITLE,
    description: COMPARE_DESCRIPTION,
    route: "/compare",
    image: "/og/compare.png",
    imageAlt: `${SITE_NAME} — all projects compared`,
    structuredData: collectionGraph({
      origin,
      route: "/compare",
      title: COMPARE_TITLE,
      description: COMPARE_DESCRIPTION,
      entries,
    }),
    body: noscriptBody({
      heading: COMPARE_TITLE,
      description: COMPARE_DESCRIPTION,
      links: entryLinks,
    }),
  }),
);

write(
  "build-log.html",
  renderPage({
    title: BUILD_LOG_TITLE,
    description: BUILD_LOG_DESCRIPTION,
    route: "/build-log",
    image: "/og/build-log.png",
    imageAlt: `${SITE_NAME} — build log`,
    structuredData: collectionGraph({
      origin,
      route: "/build-log",
      title: BUILD_LOG_TITLE,
      description: BUILD_LOG_DESCRIPTION,
    }),
    body: noscriptBody({
      heading: BUILD_LOG_TITLE,
      description: BUILD_LOG_DESCRIPTION,
      links: [{ href: "/projects", label: "All work" }],
      // Give non-JS crawlers the actual entries rather than an empty shell.
      // The evidence pointers are the part that matters most for indexing.
      entries: buildLogEntries,
      // And the site's own verification of them, so the claim "these were
      // checked" is visible without executing JavaScript.
      sections: linkHealthSections,
    }),
  }),
);

for (const project of projects) {
  const route = `/projects/${project.slug}`;
  const upstreamEntry = upstreamById.get(project.upstreamId);
  // The generator reads bare case studies, so `repo` is the authored SourceRef
  // (or absent), not the hydrated `repoBaseFor` derivation the pages use. Only
  // an href that actually exists may become `codeRepository`: pointing a crawler
  // at a removed repository is a claim no reader can check but every reader
  // will believe. This matches the `"href" in project.repo` guard in
  // SiteMetadata.
  const codeRepository =
    project.repo && "href" in project.repo ? project.repo.href : undefined;
  const structuredData = caseStudyGraph({
    origin,
    route,
    name: project.name,
    summary: project.summary,
    codeRepository,
    programmingLanguage: upstreamEntry?.stack,
    keywords: (project.tags ?? []).join(", "),
    sameAs: project.liveUrl ? [project.liveUrl] : [],
  });

  // The evidence surfaces a crawler should be able to read. A case-study route
  // used to hand a scriptless crawler a heading, the summary and two nav links
  // — so every headline claim on the page was invisible to it, which is the
  // opposite of what this site is for. Every string is authored registry copy,
  // re-formatted rather than rewritten, so this cannot introduce a claim the
  // hydrated page does not make.
  const study = project.caseStudy ?? {};
  const sections = [
    {
      heading: "What it demonstrates",
      items: [
        ...(study.demonstrates?.technical ?? []),
        ...(study.demonstrates?.product ?? []),
      ],
    },
    {
      heading: "Measured",
      items: (study.metrics ?? []).map((metric) => `${metric.label}: ${metric.value}`),
    },
    {
      heading: "What the project says it cannot yet claim",
      items: study.limitations ?? [],
    },
  ].filter((section) => section.items.length > 0);

  write(
    path.join("projects", `${project.slug}.html`),
    renderPage({
      title: `${project.name} — ${project.tagline}`,
      description: project.summary,
      route,
      image: `/og/${project.slug}.png`,
      imageAlt: `${project.name} — ${project.tagline}`,
      type: "article",
      structuredData,
      body: noscriptBody({
        heading: `${project.name} — ${project.tagline}`,
        description: project.summary,
        links: [
          { href: "/projects", label: "All work" },
          { href: "/compare", label: "Compare the work" },
        ],
        ...(sections.length ? { sections } : {}),
        ...(codeRepository ? { note: `Source: ${codeRepository}` } : {}),
      }),
    }),
  );
}

write(
  "404.html",
  renderPage({
    title: "Page not found — Henry Goldsmith",
    description:
      "That page does not exist. Return to Henry Goldsmith's portfolio or browse the project archive.",
    route: "/404",
    image: "/og/default.png",
    noIndex: true,
    body: noscriptBody({
      heading: "Page not found",
      description:
        "That page does not exist. Return to the portfolio or browse the project archive.",
      links: [
        { href: "/", label: "Home" },
        { href: "/projects", label: "All work" },
      ],
    }),
  }),
);

// `projects` holds bare case studies, not the `{file, data}` wrappers, so this
// reads `project.slug`. Using `buildRoutePaths` rather than rebuilding the set
// inline means the prune and the sitemap can never disagree about what is
// published — the failure mode this whole refactor exists to prevent.
pruneGatedRoutes(new Set(buildRoutePaths(published).map((route) => route.replace(/^\/projects\//, ""))));

console.log(
  `generate-route-html: wrote ${written.length} crawler-visible route files for ${origin}`,
);
