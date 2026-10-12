#!/usr/bin/env node
/**
 * Verifies the crawler-visible HTML emitted after Vite builds.
 *
 * Playwright proves the hydrated app renders. This script proves a crawler that
 * never executes JavaScript still sees the right route, card and indexability.
 */

import fs from "node:fs";
import path from "node:path";
import { loadCaseStudies } from "./lib/published-projects.mjs";

const root = process.cwd();
const distDir = path.join(root, "dist");
const PRODUCTION_ORIGIN = "https://henry-builds.vercel.app";
const origin =
  (process.env.SITE_URL ?? process.env.VITE_SITE_URL ?? "").replace(/\/$/, "") ||
  PRODUCTION_ORIGIN;

const { published, unpublished } = loadCaseStudies(root);

let checked = 0;
let errors = 0;

function fail(message) {
  console.error(`✗ ${message}`);
  errors++;
}

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

function expectContains(html, needle, label) {
  checked++;
  if (!html.includes(needle)) fail(label);
}

function routeFile(route) {
  if (route === "/") return "index.html";
  return `${route.replace(/^\//, "")}.html`;
}

function verifyRoute({
  route,
  title,
  image,
  noIndex = false,
  structuredType,
}) {
  const relative = routeFile(route);
  const file = path.join(distDir, relative);
  checked++;

  if (!fs.existsSync(file)) {
    fail(`${relative} missing — run \`bun run build\``);
    return;
  }

  const html = fs.readFileSync(file, "utf8");
  const url = `${origin}${route === "/" ? "/" : route}`;
  const imageUrl = `${origin}${image}`;

  expectContains(html, `<title>${escapeHtml(title)}</title>`, `${relative}: wrong or missing title`);
  expectContains(
    html,
    `<link rel="canonical" href="${url}" />`,
    `${relative}: canonical URL does not match ${route}`,
  );
  expectContains(
    html,
    `<meta property="og:url" content="${url}" />`,
    `${relative}: og:url does not match ${route}`,
  );
  expectContains(
    html,
    `<meta property="og:image" content="${imageUrl}" />`,
    `${relative}: wrong crawler-visible OG image`,
  );
  expectContains(
    html,
    `<meta name="robots" content="${noIndex ? "noindex, nofollow" : "index, follow"}" />`,
    `${relative}: wrong robots directive`,
  );

  if (structuredType) {
    expectContains(
      html,
      `"@type":"${structuredType}"`,
      `${relative}: missing ${structuredType} structured data`,
    );
  }

  // A no-JavaScript crawler sees the head metadata but React never mounts, so
  // the body must carry something followable on its own. Every indexable route
  // ships a `<noscript>` block with the page description and internal links
  // built from the same data as the JSON-LD above.
  if (!noIndex) {
    checked++;
    const body = html.split("</head>")[1] ?? "";
    if (!body.includes("<noscript>")) {
      fail(`${relative}: no <noscript> body — a crawler without JavaScript sees an empty page`);
    } else {
      const hrefs = [...body.matchAll(/<a\s+href="([^"]+)"/g)].map((match) => match[1]);
      const internal = hrefs.filter((href) => href.startsWith("/"));
      checked++;
      if (internal.length === 0) {
        fail(`${relative}: <noscript> body has no internal links to follow`);
      }
      // The body heading must agree with the head title it stands in for, or
      // the two renderers describe the same URL differently.
      checked++;
      const heading = body.match(/<noscript><h1>(.*?)<\/h1>/)?.[1];
      if (heading && !title.startsWith(heading.replace(/&quot;/g, '"'))) {
        fail(`${relative}: <noscript> heading does not match the page title`);
      }
    }
  }
}

verifyRoute({
  route: "/",
  title: "Henry Goldsmith — Software, evidence-first",
  image: "/og/default.png",
  structuredType: "WebSite",
});

verifyRoute({
  route: "/projects",
  title: "All work — Henry Goldsmith",
  image: "/og/projects.png",
  structuredType: "CollectionPage",
});

verifyRoute({
  route: "/compare",
  title: "Compare the work — Henry Goldsmith",
  image: "/og/compare.png",
  structuredType: "CollectionPage",
});

// The build log was generated but never verified here, so a broken or missing
// card for it would have passed the suite. It is now a route of its own in the
// OG set rather than a fallback to the marketing card.
verifyRoute({
  route: "/build-log",
  title: "Build log — Henry Goldsmith",
  image: "/og/build-log.png",
  structuredType: "CollectionPage",
});

for (const { data: project } of published) {
  verifyRoute({
    route: `/projects/${project.slug}`,
    title: `${project.name} — ${project.tagline}`,
    image: `/og/${project.slug}.png`,
    structuredType: "SoftwareSourceCode",
  });
}

const notFoundPath = path.join(distDir, "404.html");
checked++;
if (!fs.existsSync(notFoundPath)) {
  fail("404.html missing — unknown production routes will fall back to Vercel's generic error page");
} else {
  const html = fs.readFileSync(notFoundPath, "utf8");
  expectContains(
    html,
    '<meta name="robots" content="noindex, nofollow" />',
    "404.html must be noindex",
  );
  expectContains(
    html,
    "<title>Page not found — Henry Goldsmith</title>",
    "404.html has the wrong title",
  );
}

for (const { data: project } of unpublished) {
  const file = path.join(distDir, "projects", `${project.slug}.html`);
  checked++;
  if (fs.existsSync(file)) {
    fail(`projects/${project.slug}.html exists even though the publication gate is closed`);
  }
}

console.log(`check-route-html: ${checked} checks, ${errors} broken`);
process.exit(errors > 0 ? 1 : 0);
