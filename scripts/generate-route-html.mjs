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
  landingGraph,
  nameSortedEntries,
} from "../src/data/registry/structured-data.mjs";
import { profileData } from "../src/data/profile-data.mjs";

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
const projects = published
  .map(({ data }) => data)
  .sort((a, b) => a.name.localeCompare(b.name));

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}

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

write(
  "index.html",
  renderPage({
    title: LANDING_TITLE,
    description: LANDING_DESCRIPTION,
    route: "/",
    image: "/og/default.png",
    imageAlt: "Henry Goldsmith — build it, measure it, say what it does.",
    structuredData: landingGraph(origin, person),
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
  }),
);

write(
  "compare.html",
  renderPage({
    title: COMPARE_TITLE,
    description: COMPARE_DESCRIPTION,
    route: "/compare",
    image: "/og/default.png",
    imageAlt: `${SITE_NAME} — all projects compared`,
    structuredData: collectionGraph({
      origin,
      route: "/compare",
      title: COMPARE_TITLE,
      description: COMPARE_DESCRIPTION,
      entries,
    }),
  }),
);

write(
  "build-log.html",
  renderPage({
    title: BUILD_LOG_TITLE,
    description: BUILD_LOG_DESCRIPTION,
    route: "/build-log",
    image: "/og/default.png",
    imageAlt: `${SITE_NAME} — build log`,
    structuredData: collectionGraph({
      origin,
      route: "/build-log",
      title: BUILD_LOG_TITLE,
      description: BUILD_LOG_DESCRIPTION,
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
