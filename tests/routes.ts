import fs from "node:fs";
import path from "node:path";

/**
 * Routes are read from the registry rather than hardcoded, so adding a case
 * study automatically adds it to the accessibility and visual suites. A new
 * project cannot ship unaudited.
 */
const root = process.cwd();
const caseStudyDir = path.join(root, "registry/case-studies");
const upstream = JSON.parse(
  fs.readFileSync(path.join(root, "registry/upstream.json"), "utf8"),
);
const upstreamById = new Map(
  (upstream.entries ?? []).map((entry: { id: string; lifecycle?: string }) => [
    entry.id,
    entry,
  ]),
);

const published = fs
  .readdirSync(caseStudyDir)
  .filter((file) => file.endsWith(".json"))
  .map((file) =>
    JSON.parse(fs.readFileSync(path.join(caseStudyDir, file), "utf8")),
  )
  .filter((project) => {
    if (project.publish === true) return true;
    const lifecycle = (
      upstreamById.get(project.upstreamId) as { lifecycle?: string } | undefined
    )?.lifecycle;
    return lifecycle === "active" || lifecycle === "maintenance";
  });

export const projectSlugs: string[] = published
  .map((project) => project.slug)
  .sort();

export const featuredSlugs: string[] = published
  .filter((project) => project.featured)
  .map((project) => project.slug)
  .sort();

export const coreRoutes = [
  { name: "landing", path: "/" },
  { name: "projects", path: "/projects" },
];

export const notFoundRoute = {
  name: "not-found",
  path: "/__missing-page-for-test__",
};

export const allRoutes = [
  ...coreRoutes,
  notFoundRoute,
  ...projectSlugs.map((slug) => ({
    name: `case-study-${slug}`,
    path: `/projects/${slug}`,
  })),
];

export const representativeCaseStudy = {
  name: "case-study",
  path: `/projects/${featuredSlugs[0] ?? projectSlugs[0]}`,
};

/**
 * Full-page pixel snapshots stay on routes whose content is stable. Case-study
 * pages intentionally contain generated CI/source facts that refresh without a
 * UI change, so pixel-diffing an entire 5,000+ px page turns data freshness into
 * false visual regressions. Case-study structure is asserted separately.
 */
export const visualRoutes = [...coreRoutes];
