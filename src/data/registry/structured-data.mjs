/**
 * The canonical crawler-visible page descriptions.
 *
 * One defect fixed: three routes shipped one JSON-LD graph in their static HTML
 * and a different one after hydration. `generate-route-html.mjs` emitted a
 * CollectionPage with the published project's name and URL for `/projects`,
 * `/compare` and `/build-log`; then `SiteMetadata` mounted, found no `project`
 * prop, and overwrote the same `<script id="portfolio-structured-data">` with
 * the generic Person/WebSite graph. A crawler that executes JavaScript learned a
 * different page about the same URL than a crawler that does not.
 *
 * Like publication.mjs and freshness.mjs, this module imports nothing — no
 * `node:` imports, no DOM globals — so `generate-route-html.mjs` and the Vite
 * bundle load the same builders and their outputs cannot drift apart. Route
 * titles and descriptions are defined once here; both renderers import them.
 *
 * Only the data both sides already hold is described: route, title,
 * description, and — for /projects and /compare — the published project's name
 * and slug. Nothing is ranked or summarised, so there is no judgement for the
 * two renderers to disagree on.
 */

export const SITE_NAME = "Henry Goldsmith";

/**
 * The GitHub identity behind the Person graph, passed in from `profile-data.mjs`
 * — the one place a personal identifier may be stated, and the module both the
 * generator and the runtime import, so two copies of the URL cannot drift.
 */
/**
 * @param {{
 *   origin: string,
 *   githubUrl?: string,
 *   knowsAbout?: string[],
 * }} params
 */
export function personGraph({ origin, githubUrl, knowsAbout }) {
  return {
    "@type": "Person",
    name: SITE_NAME,
    url: origin,
    ...(githubUrl ? { sameAs: [githubUrl] } : {}),
    ...(knowsAbout?.length ? { knowsAbout } : {}),
  };
}

export const LANDING_TITLE = "Henry Goldsmith — Software, evidence-first";
export const LANDING_DESCRIPTION =
  "Projects by Henry Goldsmith, each with a stage label, the numbers behind it and a link to the source. Prototypes are labelled as prototypes.";

export const PROJECTS_TITLE = "All work — Henry Goldsmith";
export const PROJECTS_DESCRIPTION =
  "Every project in the registry, including the weaker and unfinished ones, with an honest stage label on each.";

export const COMPARE_TITLE = "Compare the work — Henry Goldsmith";
export const COMPARE_DESCRIPTION =
  "Every project side by side: stage, source state, CI health, evidence density, measured numbers, ledger grades and what each one demonstrates.";

export const BUILD_LOG_TITLE = "Build log — Henry Goldsmith";
export const BUILD_LOG_DESCRIPTION =
  "Decisions, dead ends, lessons and stated limits recorded while building each project. Every entry comes from the case study it appears on; none is invented.";

/**
 * A published project as JSON-LD needs it: name and slug, nothing else.
 * Both sides already hold this pair — the generator from
 * `loadCaseStudies().published[].data`, the pages from `projects` — so the
 * builder takes the pair rather than either wrapper type.
 */
export function itemListOf(entries) {
  return {
    "@type": "ItemList",
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      url: entry.url,
    })),
  };
}

/**
 * The ItemList entries, name-sorted.
 *
 * The visible archive orders by source state, featured flag, stage and name;
 * the generator only has the authored files, so it cannot reproduce the
 * derived dead-source ordering. Rather than ship two orderings for the same
 * list, both JSON-LD graphs sort by name — deterministic from data both sides
 * hold, and independent of which registry layers happen to be fresh. An
 * ItemList position drives no UI, so the page keeps its curated order.
 */
/**
 * @param {Array<{ name: string, slug?: string }>} projects
 * @param {string} origin
 */
export function nameSortedEntries(projects, origin) {
  return [...projects]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((project) => ({
      name: project.name,
      url: `${origin}/projects/${project.slug}`,
    }));
}

/**
 * @param {string} origin
 * @param {{ githubUrl?: string, knowsAbout?: string[] }} [person]
 */
export function landingGraph(origin, person = {}) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      personGraph({ origin, ...person }),
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url: origin,
        description: LANDING_DESCRIPTION,
      },
    ],
  };
}

/**
 * The CollectionPage graph for a list route.
 *
 * `description` is optional because `/projects` never carried one in its
 * crawler-visible HTML and `/compare` and `/build-log` always did; preserving
 * that distinction keeps this refactor from quietly rewriting three pages'
 * metadata. `entries` is optional because the build log's entries are undated,
 * so an ItemList would imply an ordering that does not exist.
 *
 * @param {{
 *   origin: string,
 *   route: string,
 *   title: string,
 *   description?: string,
 *   entries?: { name: string, url: string }[],
 * }} params
 */
export function collectionGraph({ origin, route, title, description, entries }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    url: `${origin}${route}`,
    ...(description ? { description } : {}),
    ...(entries ? { mainEntity: itemListOf(entries) } : {}),
  };
}

/**
 * The SoftwareSourceCode graph for one case study.
 *
 * Every field except `origin`/`route` is optional and emitted only when the
 * data exists: an absent stack or an empty keyword list must leave no key at
 * all, because `JSON.stringify` drops `undefined` but keeps `""`, and a
 * crawler reading `keywords: ""` reads a claim that nothing wrote.
 *
 * @param {{
 *   origin: string,
 *   route: string,
 *   name: string,
 *   summary: string,
 *   codeRepository?: string,
 *   programmingLanguage?: string,
 *   keywords?: string,
 *   sameAs?: string[],
 * }} params
 */
export function caseStudyGraph({
  origin,
  route,
  name,
  summary,
  codeRepository,
  programmingLanguage,
  keywords,
  sameAs,
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name,
    description: summary,
    url: `${origin}${route}`,
    ...(codeRepository ? { codeRepository } : {}),
    // A bare string or absent, matching what both renderers always emitted.
    // JSON.stringify drops `undefined`, so an absent stack leaves no key.
    programmingLanguage,
    author: { "@type": "Person", name: SITE_NAME, url: origin },
    ...(keywords ? { keywords } : {}),
    ...(sameAs?.length ? { sameAs } : {}),
  };
}

/**
 * Escape text for interpolation into static HTML.
 *
 * This module is shared between Node scripts and the browser bundle, so the
 * escaper lives here rather than being written down twice. `generate-route-html`
 * used to carry its own copy; it now imports this one.
 */
export function escapeHtml(value) {
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

/**
 * A static, no-JavaScript body for the generated route files.
 *
 * Every generated route currently ships `<div id="root"></div>` and nothing
 * else: correct head metadata and JSON-LD, but zero crawlable body content and
 * zero internal links. A crawler that never runs scripts can verify the URL
 * exists but cannot follow anywhere or read a word. The `<noscript>` block
 * below gives it a heading, the page's own description, and links built from
 * the same data the JSON-LD graphs already carry — no new copy, so the static
 * and hydrated pages cannot describe the same URL differently.
 *
 * Browsers with JavaScript replace the whole `#root` subtree on hydration, so
 * sighted users never see this markup. It is deliberately plain: unstyled list
 * markup with no classes, so it cannot drift from the design system or be
 * mistaken for the rendered page.
 *
 * @param {{ heading: string, description?: string, links?: Array<{ href: string, label: string, note?: string }>, note?: string }} params
 */
export function noscriptBody({ heading, description, links = [], note, entries = [], sections = [] }) {
  const items = links
    .map(
      ({ href, label, note: linkNote }) =>
        `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a>` +
        (linkNote ? ` — ${escapeHtml(linkNote)}` : "") +
        `</li>`,
    )
    .join("");

  /**
   * A titled block of list items — the case-study surfaces a crawler should
   * read: measured numbers, what the project demonstrates, and stated limits.
   *
   * The case-study routes used to carry only a heading, the summary, two nav
   * links and a source pointer, so a crawler that never runs JavaScript saw a
   * sentence about a project and none of the evidence behind it. That is the
   * one thing this site argues it does differently, so the no-JS body has to
   * show it. Every string here is already authored registry copy; nothing is
   * generated, so the static and hydrated views cannot disagree.
   */
  const sectionHtml = sections
    .map(({ heading: sectionHeading, items: sectionItems = [] }) => {
      const listItems = sectionItems
        .filter((item) => item && String(item).trim())
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("");
      if (!listItems) return "";
      return (
        `<section>` +
        `<h2>${escapeHtml(sectionHeading)}</h2>` +
        `<ul>${listItems}</ul>` +
        `</section>`
      );
    })
    .join("");

  // Each entry renders as a semantic section: project name as eyebrow,
  // title as a sub-heading, body as the content, and evidence links as a
  // list. This gives non-JS crawlers the substance of the build log rather
  // than an empty shell — the evidence pointers are the part a crawler
  // should index first.
  const entryHtml = entries
    .map(
      ({ project, title, body, evidence }) => {
        const evidenceLinks = (evidence ?? [])
          .map(
            (item) =>
              `<li><a href="${escapeHtml(item.href ?? "")}">${escapeHtml(item.label ?? "Evidence")}</a></li>`,
          )
          .join("");
        return (
          `<section>` +
          `<p>${escapeHtml(project)}</p>` +
          (title ? `<h2>${escapeHtml(title)}</h2>` : "") +
          `<p>${escapeHtml(body)}</p>` +
          (evidenceLinks ? `<ul>${evidenceLinks}</ul>` : "") +
          `</section>`
        );
      },
    )
    .join("");

  // No wrapping <div>: the generator replaces the entire <div id="root">…</div>
  // subtree by matching the first </div>, and a nested div would silently
  // truncate the body. The <noscript> element itself is the only container.
  return (
    `<noscript>` +
    `<h1>${escapeHtml(heading)}</h1>` +
    (description ? `<p>${escapeHtml(description)}</p>` : "") +
    sectionHtml +
    entryHtml +
    (items ? `<ul>${items}</ul>` : "") +
    (note ? `<p>${escapeHtml(note)}</p>` : "") +
    `</noscript>`
  );
}
