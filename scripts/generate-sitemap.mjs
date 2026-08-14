#!/usr/bin/env node
/**
 * Writes public/sitemap.xml and public/robots.txt from the registry, so a new
 * project is in the sitemap the moment its case study exists.
 *
 * Absolute URLs need an origin. Set SITE_URL (or VITE_SITE_URL) in the build
 * environment; without it the script writes root-relative paths and warns,
 * because a sitemap of relative URLs is accepted but weaker.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const caseStudyDir = path.join(root, "registry/case-studies");
const publicDir = path.join(root, "public");

const origin = (process.env.SITE_URL ?? process.env.VITE_SITE_URL ?? "").replace(/\/$/, "");

if (!origin) {
  console.warn(
    "generate-sitemap: SITE_URL is not set — writing relative URLs. " +
      "Set SITE_URL in the deploy environment for absolute ones.",
  );
}

const projects = fs.existsSync(caseStudyDir)
  ? fs
      .readdirSync(caseStudyDir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => JSON.parse(fs.readFileSync(path.join(caseStudyDir, file), "utf8")))
      .filter((project) => project.publish !== false)
  : [];

const today = new Date().toISOString().slice(0, 10);

const routes = [
  { path: "/", changefreq: "monthly", priority: "1.0" },
  { path: "/projects", changefreq: "monthly", priority: "0.8" },
  ...projects
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((project) => ({
      path: `/projects/${project.slug}`,
      changefreq: "monthly",
      priority: project.featured ? "0.7" : "0.5",
    })),
];

const urls = routes
  .map(
    (route) => `  <url>
    <loc>${origin}${route.path}</loc>
    <lastmod>${today}</lastmod>
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
