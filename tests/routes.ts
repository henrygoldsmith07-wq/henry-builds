import fs from "node:fs";
import path from "node:path";

/**
 * Routes are read from the registry rather than hardcoded, so adding a case
 * study automatically adds it to the accessibility and visual suites. A new
 * project cannot ship unaudited.
 */
const caseStudyDir = path.join(process.cwd(), "registry/case-studies");

const published = fs
  .readdirSync(caseStudyDir)
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(fs.readFileSync(path.join(caseStudyDir, file), "utf8")))
  .filter((project) => project.publish !== false);

export const projectSlugs: string[] = published.map((project) => project.slug).sort();

export const featuredSlugs: string[] = published
  .filter((project) => project.featured)
  .map((project) => project.slug)
  .sort();

export const coreRoutes = [
  { name: "landing", path: "/" },
  { name: "projects", path: "/projects" },
];

export const allRoutes = [
  ...coreRoutes,
  ...projectSlugs.map((slug) => ({ name: `case-study-${slug}`, path: `/projects/${slug}` })),
];

/**
 * Visual snapshots cover the two core pages plus one representative case study.
 * Snapshotting all fourteen would make every copy edit a snapshot update
 * without catching anything the one case study does not already catch.
 */
export const visualRoutes = [
  ...coreRoutes,
  { name: "case-study", path: `/projects/${featuredSlugs[0] ?? projectSlugs[0]}` },
];
