/**
 * The browser-facing profile.
 *
 * The authored literals live in `profile-data.mjs`, a pure ESM module that Node
 * scripts import directly (the static generator needs the GitHub URL and
 * `knowsAbout` for the Person JSON-LD graph, and cannot read this file's
 * `import.meta.env`). This wrapper adds the one browser-only field and keeps
 * the `profile` export shape every existing consumer uses.
 */
import { profileData } from "./profile-data.mjs";

export const profile = {
  ...profileData,
  /**
   * Set VITE_SITE_URL in the deployment environment. Absolute URLs in the
   * sitemap, canonical tags and OpenGraph cards all depend on it; without it
   * they fall back to the runtime origin, which crawlers handle less well.
   */
  siteUrl: import.meta.env?.VITE_SITE_URL ?? "",
} as const;
