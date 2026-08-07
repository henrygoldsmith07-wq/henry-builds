import { useEffect } from "react";
import { profile } from "@/data/profile";

const metadataKeys = [
  "description",
  "og:title",
  "og:description",
  "og:type",
  "og:url",
  "og:image",
  "twitter:card",
  "twitter:title",
  "twitter:description",
  "twitter:image",
];

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function SiteMetadata() {
  useEffect(() => {
    const siteUrl = (profile.siteUrl || window.location.origin).replace(/\/$/, "");
    const pageUrl = `${siteUrl}${window.location.pathname === "/" ? "/" : window.location.pathname}`;
    const imageUrl = `${siteUrl}/og-image.svg`;

    document.title = profile.siteTitle;
    setMeta("name", "description", profile.siteDescription);
    setMeta("property", "og:title", profile.siteTitle);
    setMeta("property", "og:description", profile.siteDescription);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", pageUrl);
    setMeta("property", "og:image", imageUrl);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", profile.siteTitle);
    setMeta("name", "twitter:description", profile.siteDescription);
    setMeta("name", "twitter:image", imageUrl);

    let canonical = document.head.querySelector<HTMLLinkElement>("link[rel=canonical]");
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = pageUrl;

    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Person",
          name: profile.name,
          url: siteUrl,
          sameAs: [profile.contact.github],
          knowsAbout: [
            "Software development",
            "Artificial intelligence",
            "Product design",
            "UI/UX design",
            "Learning",
            "Productivity",
            "Fitness",
            "Cycling",
          ],
        },
        {
          "@type": "WebSite",
          name: profile.siteTitle,
          url: siteUrl,
          description: profile.siteDescription,
        },
      ],
    };

    let jsonLd = document.getElementById("portfolio-structured-data") as HTMLScriptElement | null;
    if (!jsonLd) {
      jsonLd = document.createElement("script");
      jsonLd.id = "portfolio-structured-data";
      jsonLd.type = "application/ld+json";
      document.head.appendChild(jsonLd);
    }
    jsonLd.textContent = JSON.stringify(structuredData);

    return () => {
      metadataKeys.forEach((key) => {
        document.head.querySelector(`meta[name="${key}"], meta[property="${key}"]`)?.remove();
      });
      canonical?.remove();
      jsonLd?.remove();
    };
  }, []);

  return null;
}
