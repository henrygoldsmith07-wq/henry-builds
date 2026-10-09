import { useEffect } from "react";
import { profile } from "@/data/profile";
import type { HydratedProject } from "@/data/registry";
import {
  caseStudyGraph,
  landingGraph,
} from "@/data/registry/structured-data.mjs";

type MetadataProps = {
  title?: string;
  description?: string;
  /** Route path, e.g. "/projects/revise". Defaults to the current location. */
  path?: string;
  type?: "website" | "article";
  /** Optional crawler/social card override, e.g. "/og/projects.png". */
  image?: string;
  /** Prevent utility/error routes from being indexed. */
  noIndex?: boolean;
  /** When present, adds SoftwareSourceCode structured data and a per-project card. */
  project?: HydratedProject;
  /**
   * Builds the page's JSON-LD graph from the origin and route this component
   * has already resolved, so the graph's URLs cannot disagree with the
   * canonical link and og:url tags on the same page.
   *
   * The list pages pass a builder over the shared `collectionGraph` helpers in
   * `structured-data.mjs` — the same builders the static generator calls — so
   * the hydrated page and its crawler-visible HTML describe the same thing.
   * Before this prop existed the runtime overwrote the static CollectionPage
   * with the generic Person/WebSite graph, because a page without a `project`
   * prop had no way to say what it was.
   */
  buildStructuredData?: (context: {
    origin: string;
    routePath: string;
  }) => Record<string, unknown>;
};

/** Tags this component owns. Anything it added is removed on unmount. */
const OWNED = "data-portfolio-meta";

function upsert(
  selector: string,
  create: () => HTMLElement,
  apply: (element: HTMLElement) => void,
) {
  let element = document.head.querySelector<HTMLElement>(selector);
  if (!element) {
    element = create();
    element.setAttribute(OWNED, "");
    document.head.appendChild(element);
  }
  apply(element);
}

function meta(attribute: "name" | "property", key: string, content: string) {
  upsert(
    `meta[${attribute}="${key}"]`,
    () => {
      const element = document.createElement("meta");
      element.setAttribute(attribute, key);
      return element;
    },
    (element) => {
      (element as HTMLMetaElement).content = content;
    },
  );
}

function siteOrigin() {
  const configured = profile.siteUrl?.replace(/\/$/, "");
  if (configured) return configured;
  return typeof window === "undefined" ? "" : window.location.origin;
}

export function SiteMetadata({
  title,
  description,
  path,
  type = "website",
  image: imageOverride,
  noIndex = false,
  project,
  buildStructuredData,
}: MetadataProps = {}) {
  useEffect(() => {
    const origin = siteOrigin();
    const routePath = path ?? window.location.pathname;
    const pageUrl = `${origin}${routePath === "/" ? "/" : routePath}`;

    const pageTitle = title ?? profile.siteTitle;
    const pageDescription = description ?? profile.siteDescription;

    // Per-project cards are pre-rendered at build time by scripts/generate-og.mjs.
    const image = imageOverride
      ? imageOverride.startsWith("http")
        ? imageOverride
        : `${origin}${imageOverride}`
      : project
        ? `${origin}/og/${project.slug}.png`
        : `${origin}/og/default.png`;

    document.title = pageTitle;

    meta("name", "description", pageDescription);
    meta("name", "robots", noIndex ? "noindex, nofollow" : "index, follow");
    meta("property", "og:site_name", profile.siteName);
    meta("property", "og:title", pageTitle);
    meta("property", "og:description", pageDescription);
    meta("property", "og:type", type);
    meta("property", "og:url", pageUrl);
    meta("property", "og:image", image);
    meta("property", "og:image:width", "1200");
    meta("property", "og:image:height", "630");
    meta("property", "og:image:alt", project ? `${project.name} — ${project.tagline}` : pageTitle);
    meta("property", "og:locale", "en_GB");

    meta("name", "twitter:card", "summary_large_image");
    meta("name", "twitter:title", pageTitle);
    meta("name", "twitter:description", pageDescription);
    meta("name", "twitter:image", image);
    meta("name", "twitter:image:alt", project ? `${project.name} — ${project.tagline}` : pageTitle);

    upsert(
      "link[rel=canonical]",
      () => {
        const element = document.createElement("link");
        element.rel = "canonical";
        return element;
      },
      (element) => {
        (element as HTMLLinkElement).href = pageUrl;
      },
    );

    // A caller-supplied builder wins — it receives the origin and route this
    // component already resolved, so its URLs match the canonical link and
    // og:url tags. Next a per-project graph from the same builder the static
    // generator uses. The fallback is the site-wide graph and only the
    // site-wide graph: no route may silently receive a graph that describes a
    // different page, which is the defect structured-data.mjs exists to
    // prevent. The person details come from profile.ts, which re-exports the
    // same literals the generator reads, so the Person graph is byte-identical
    // on both sides.
    const structuredData =
      buildStructuredData?.({ origin, routePath }) ??
      (project
        ? caseStudyGraph({
            origin,
            route: routePath === "/" ? "/" : routePath,
            name: project.name,
            summary: project.summary,
            // Only emitted when the source actually exists. A removed source
            // must not produce a `codeRepository` pointing at a repository that
            // no longer holds the project — asserting one in structured data is
            // a claim a crawler cannot check but a reader will believe.
            codeRepository:
              project.repo && "href" in project.repo
                ? project.repo.href
                : undefined,
            programmingLanguage: project.upstream?.stack,
            keywords: project.tags.join(", "),
            sameAs: project.liveUrl ? [project.liveUrl] : [],
          })
        : landingGraph(origin, {
            githubUrl: profile.contact.github,
            knowsAbout: [...profile.knowsAbout],
          }));

    upsert(
      "script#portfolio-structured-data",
      () => {
        const element = document.createElement("script");
        element.id = "portfolio-structured-data";
        (element as HTMLScriptElement).type = "application/ld+json";
        return element;
      },
      (element) => {
        element.textContent = JSON.stringify(structuredData);
      },
    );

    return () => {
      document.head.querySelectorAll(`[${OWNED}]`).forEach((element) => element.remove());
    };
  }, [title, description, path, type, imageOverride, noIndex, project, buildStructuredData]);

  return null;
}
