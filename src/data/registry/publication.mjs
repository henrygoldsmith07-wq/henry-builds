/**
 * The canonical publication rule.
 *
 * One file decides two things that were previously decided in six places:
 *
 *   1. Does this case study appear on the site? (`isPublishedCaseStudy`)
 *   2. What routes does the site serve, and how should crawlers treat them?
 *      (`CORE_ROUTES`, `buildRouteManifest`)
 *
 * WHY THIS IS PLAIN .mjs AND NOT TypeScript
 *
 * The Node-side consumers (sitemap, route HTML, link checks, OG cards, the
 * Playwright suites) run under `node script.mjs`. The browser side runs under
 * Vite. Before this file existed, each side carried its own copy of the rule and
 * `src/data/registry/index.ts` carried a comment admitting the two "must be kept
 * in step by hand".
 *
 * Nothing here imports `node:fs`, `node:path` or any DOM global, so the *same
 * module object* is loaded by Node and by the browser bundle. There is no second
 * implementation left to drift, and no build step in between to hide a
 * divergence.
 *
 * The filesystem-touching parts (loading the registry from disk) deliberately
 * live in `scripts/lib/published-projects.mjs`, which imports the rule from
 * here. Keeping IO out of this module is what makes it shareable.
 *
 * If you change what gets published, change it here and nowhere else.
 */

/** @typedef {"research"|"prototype"|"beta"|"shipped"|"archived"} Stage */
/** @typedef {"current-source"|"archived-source"|"concept"|"historical-case-study"} SourceState */

/**
 * Upstream lifecycles that open a `publish: false` gate on their own.
 *
 * A project is gated either because its source is not ready, or because the
 * registry's lifecycle has not promoted it out of incubating. Promotion is the
 * machine-checkable signal that the gate should open, so the gate opens on it
 * rather than waiting for a human to remember.
 */
export const PUBLISHING_LIFECYCLES = Object.freeze(["active", "maintenance"]);

/**
 * Source states that describe a project whose source is not currently live.
 *
 * These are always authored by hand — the importer derives the other two — and
 * every one of them means the page must say so in words rather than presenting
 * the project as current work.
 */
export const NON_CURRENT_SOURCE_STATES = Object.freeze([
  "archived-source",
  "concept",
  "historical-case-study",
]);

/**
 * Does this case study appear on the public site?
 *
 * Authored `publish: true` always publishes. `publish: false` is a gate that
 * opens automatically once the upstream lifecycle is promoted.
 *
 * @param {{ publish?: boolean, upstreamId?: string }} project
 * @param {Map<string, { lifecycle?: string }>} upstreamById
 * @returns {boolean}
 */
export function isPublishedCaseStudy(project, upstreamById) {
  if (project.publish === true) return true;
  const lifecycle = upstreamById.get(project.upstreamId)?.lifecycle;
  return PUBLISHING_LIFECYCLES.includes(/** @type {string} */ (lifecycle));
}

/**
 * Whether the page must carry a "this is not current work" disclosure.
 *
 * Kept here rather than in the components so that a new page cannot forget it:
 * the rule is a property of the data, not of a particular template.
 *
 * @param {{ sourceState?: SourceState }} project
 * @returns {boolean}
 */
export function needsHistoricalDisclosure(project) {
  return NON_CURRENT_SOURCE_STATES.includes(/** @type {string} */ (project.sourceState));
}

/**
 * The routes that exist regardless of which projects are published.
 *
 * Declared once, in order, with the crawler metadata that belongs to each. The
 * sitemap, the route-HTML generator, the link checker and the deploy probe all
 * read this; none of them keeps its own list, so adding a route is a one-line
 * change that cannot half-apply.
 *
 * `priority` and `changefreq` follow the usual sitemap reading: the home page is
 * the only 1.0, the archive sits under it, and `/compare` is a genuine
 * destination for someone choosing what to read rather than an index page.
 *
 * @type {ReadonlyArray<{path: string, changefreq: string, priority: string}>}
 */
export const CORE_ROUTES = Object.freeze([
  Object.freeze({ path: "/", changefreq: "monthly", priority: "1.0" }),
  Object.freeze({ path: "/projects", changefreq: "monthly", priority: "0.8" }),
  Object.freeze({ path: "/compare", changefreq: "monthly", priority: "0.7" }),
]);

/**
 * Every route the site serves, derived: the core routes plus one page per
 * published case study.
 *
 * Accepts either a bare case study or the `{ file, data }` wrapper that
 * `loadCaseStudies` hands out, because half the Node consumers pass the wrapper
 * and half pass the study. Normalising here keeps every caller simple instead of
 * making each one remember which shape it holds.
 *
 * @param {ReadonlyArray<{slug?: string, featured?: boolean, data?: {slug?: string, featured?: boolean}}>} projects
 * @returns {Array<{path: string, changefreq: string, priority: string, slug: string, featured: boolean}>}
 */
export function buildRouteManifest(projects) {
  const projectRoutes = projects
    .map((entry) => (entry && entry.data ? entry.data : entry))
    .map((project) => ({
      slug: project?.slug,
      featured: Boolean(project?.featured),
    }))
    .filter((project) => typeof project.slug === "string" && project.slug.length > 0)
    .sort((a, b) => /** @type {string} */ (a.slug).localeCompare(/** @type {string} */ (b.slug)))
    .map((project) => ({
      path: `/projects/${project.slug}`,
      changefreq: "monthly",
      // Featured work is what the archive is for; the rest is reachable but
      // does not compete for crawl attention against the curated set.
      priority: project.featured ? "0.7" : "0.5",
      slug: /** @type {string} */ (project.slug),
      featured: project.featured,
    }));

  return [...CORE_ROUTES.map((route) => ({ ...route })), ...projectRoutes];
}

/**
 * The bare path list, for consumers that only need to know what to walk.
 *
 * @param {ReadonlyArray<{slug?: string, featured?: boolean, data?: {slug?: string, featured?: boolean}}>} projects
 * @returns {string[]}
 */
export function buildRoutePaths(projects) {
  return buildRouteManifest(projects).map((route) => route.path);
}