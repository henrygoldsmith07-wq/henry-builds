/**
 * Routes are read from the registry rather than hardcoded, so adding a case
 * study automatically adds it to the accessibility and visual suites. A new
 * project cannot ship unaudited.
 *
 * The publication gate is imported from the one definition in
 * scripts/lib/published-projects.mjs rather than reimplemented. This file used
 * to carry its own copy, which meant a third place to update and no guarantee
 * the tests audited the same routes the site actually serves.
 */
import { loadCaseStudies } from "../scripts/lib/published-projects.mjs";

const { published } = loadCaseStudies(process.cwd());

export const projectSlugs: string[] = published
  .map(({ data }) => data.slug)
  .sort();

export const featuredSlugs: string[] = published
  .filter(({ data }) => data.featured)
  .map(({ data }) => data.slug)
  .sort();

export const coreRoutes = [
  { name: "landing", path: "/" },
  { name: "projects", path: "/projects" },
  { name: "compare", path: "/compare" },
  // Published and crawler-visible since it was added, but absent from this
  // list until now — the accessibility suite never audited it.
  { name: "build-log", path: "/build-log" },
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
 * Full-page pixel snapshots stay on routes whose content is stable and small.
 * Case-study pages intentionally contain generated CI/source facts that refresh
 * without a UI change, so pixel-diffing an entire 5,000+ px page turns data
 * freshness into false visual regressions; case-study structure is asserted
 * separately. `/compare` is a wide table whose cell contents are generated, so
 * it is audited for accessibility but not pixel-diffed for the same reason.
 */
export const visualRoutes = [
  { name: "landing", path: "/" },
  { name: "projects", path: "/projects" },
];
