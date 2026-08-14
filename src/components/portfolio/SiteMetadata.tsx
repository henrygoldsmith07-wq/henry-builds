import { useEffect } from "react";
import { profile } from "@/data/profile";
import type { HydratedProject } from "@/data/registry";

type MetadataProps = {
  title?: string;
  description?: string;
  /** Route path, e.g. "/projects/revise". Defaults to the current location. */
  path?: string;
  type?: "website" | "article";
  /** When present, adds SoftwareSourceCode structured data and a per-project card. */
  project?: HydratedProject;
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
  project,
}: MetadataProps = {}) {
  useEffect(() => {
    const origin = siteOrigin();
    const routePath = path ?? window.location.pathname;
    const pageUrl = `${origin}${routePath === "/" ? "/" : routePath}`;

    const pageTitle = title ?? profile.siteTitle;
    const pageDescription = description ?? profile.siteDescription;

    // Per-project cards are pre-rendered at build time by scripts/generate-og.mjs.
    const image = project
      ? `${origin}/og/${project.slug}.png`
      : `${origin}/og/default.png`;

    document.title = pageTitle;

    meta("name", "description", pageDescription);
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

    const structuredData = project
      ? {
          "@context": "https://schema.org",
          "@type": "SoftwareSourceCode",
          name: project.name,
          description: project.summary,
          url: pageUrl,
          codeRepository: project.repo?.href,
          programmingLanguage: project.upstream?.stack,
          author: { "@type": "Person", name: profile.name, url: origin },
          keywords: project.tags.join(", "),
          ...(project.liveUrl ? { discussionUrl: undefined, sameAs: [project.liveUrl] } : {}),
        }
      : {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Person",
              name: profile.name,
              url: origin,
              sameAs: [profile.contact.github].filter(Boolean),
              knowsAbout: profile.knowsAbout,
            },
            {
              "@type": "WebSite",
              name: profile.siteTitle,
              url: origin,
              description: profile.siteDescription,
            },
          ],
        };

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
  }, [title, description, path, type, project]);

  return null;
}
