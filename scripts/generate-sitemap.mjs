#!/usr/bin/env node
/**
 * Writes public/sitemap.xml and public/robots.txt from the registry, so a new
 * project is in the sitemap the moment its case study exists.
 *
 * Absolute URLs need an origin. Set SITE_URL (or VITE_SITE_URL) in the build
 * environment. Without it the script fails closed — a sitemap of relative URLs
 * is ignored by search engines wholesale, which is worse than no deploy.
 * Set ALLOW_RELATIVE_SITEMAP=1 to opt into relative URLs for local work.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const caseStudyDir = path.join(root, "registry/case-studies");
const publicDir = path.join(root, "public");

const origin = (process.env.SITE_URL ?? process.env.VITE_SITE_URL ?? "").replace(/\/$/, "");

if (!origin && !process.env.ALLOW_RELATIVE_SITEMAP) {
  console.error(
    "generate-sitemap: SITE_URL is not set. Refusing to write a sitemap of relative\n" +
      "URLs (search engines ignore them). Set SITE_URL, or ALLOW_RELATIVE_SITEMAP=1\n" +
      "for local development.",
  );
  process.exit(1);
}
if (!origin) {
  console.warn("generate-sitemap: SITE_URL not set — writing relative URLs (ALLOW_RELATIVE_SITEMAP).");
}

const projects = fs.existsSync(caseStudyDir)
  ? fs
      .readdirSync(caseStudyDir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => JSON.parse(fs.readFileSync(path.join(caseStudyDir, file), "utf8")))
      .filter((project) => project.publish !== false)
  : [];

/**
 * A lastmod that changes on every build trains crawlers to distrust it.
 * Prefer the case-study file's last commit date (stable until the content
 * actually changes); fall back to the upstream import date.
 */
function lastmodFor(file) {
  try {
    const date = execFileSync(
      "git",
      ["log", "-1", "--format=%cs", "--", `registry/case-studies/${file}`],
      { encoding: "utf8" },
    ).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  } catch {
    // not a git checkout or git missing — fall through
  }
  return undefined;
}

let fallbackLastmod;
try {
  const upstream = JSON.parse(
    fs.readFileSync(path.join(root, "registry/upstream.json"), "utf8"),
  );
  // Newest case-study commit wins; a registry re-import alone does not make
  // the pages newer, and churning lastmod trains crawlers to ignore it.
  const dates = fs
    .readdirSync(caseStudyDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => lastmodFor(file))
    .filter(Boolean)
    .sort();
  fallbackLastmod = dates[dates.length - 1] ?? upstream.importedAt.slice(0, 10);
} catch {
  fallbackLastmod = new Date().toISOString().slice(0, 10);
}

const routes = [
  { path: "/", changefreq: "monthly", priority: "1.0", lastmod: fallbackLastmod },
  { path: "/projects", changefreq: "monthly", priority: "0.8", lastmod: fallbackLastmod },
  ...projects
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((project) => ({
      path: `/projects/${project.slug}`,
      changefreq: "monthly",
      priority: project.featured ? "0.7" : "0.5",
      lastmod:
        lastmodFor(`${project.slug}.json`) ?? fallbackLastmod,
    })),
];

const urls = routes
  .map(
    (route) => `  <url>
    <loc>${origin}${route.path}</loc>
    <lastmod>${route.lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`,
  )
  .join("\n");

fs.writeFileSync(
  path.join(publicDir, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
);

fs.writeFileSync(
  path.join(publicDir, "robots.txt"),
  `User-agent: *
Allow: /

# Auth and dashboard are behind a login and hold nothing worth indexing.
Disallow: /auth
Disallow: /dashboard

Sitemap: ${origin}/sitemap.xml
`,
);

console.log(`generate-sitemap: wrote ${routes.length} URLs to public/sitemap.xml`);
