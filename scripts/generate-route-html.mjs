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
import { loadCaseStudies } from "./lib/published-projects.mjs";

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

function write(relativePath, html) {
  const target = path.join(distDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
  console.log(`  ${relativePath}`);
}

const siteDescription =
  "Projects by Henry Goldsmith, each with a stage label, the numbers behind it and a link to the source. Prototypes are labelled as prototypes.";

write(
  "index.html",
  renderPage({
    title: "Henry Goldsmith — Software, evidence-first",
    description: siteDescription,
    route: "/",
    image: "/og/default.png",
    imageAlt: "Henry Goldsmith — build it, measure it, say what it does.",
    structuredData: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Person",
          name: "Henry Goldsmith",
          url: origin,
          sameAs: ["https://github.com/henrygoldsmith07-wq"],
        },
        {
          "@type": "WebSite",
          name: "Henry Goldsmith",
          url: origin,
          description: siteDescription,
        },
      ],
    },
  }),
);

const projectsDescription =
  "Every project in the registry, including the weaker and unfinished ones, with an honest stage label on each.";

write(
  "projects.html",
  renderPage({
    title: "All work — Henry Goldsmith",
    description: projectsDescription,
    route: "/projects",
    image: "/og/projects.png",
    imageAlt: "Henry Goldsmith — all work",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "All work — Henry Goldsmith",
      url: `${origin}/projects`,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: projects.map((project, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: project.name,
          url: `${origin}/projects/${project.slug}`,
        })),
      },
    },
  }),
);

for (const project of projects) {
  const route = `/projects/${project.slug}`;
  const upstreamEntry = upstreamById.get(project.upstreamId);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: project.name,
    description: project.summary,
    url: `${origin}${route}`,
    codeRepository: project.repo?.href,
    programmingLanguage: upstreamEntry?.stack,
    author: {
      "@type": "Person",
      name: "Henry Goldsmith",
      url: origin,
    },
    keywords: (project.tags ?? []).join(", "),
    ...(project.liveUrl ? { sameAs: [project.liveUrl] } : {}),
  };

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

console.log(
  `generate-route-html: wrote ${projects.length + 3} crawler-visible route files for ${origin}`,
);
