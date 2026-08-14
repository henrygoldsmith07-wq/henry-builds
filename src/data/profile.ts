export const profile = {
  siteName: "Henry Goldsmith",
  siteTitle: "Henry Goldsmith — Software, evidence-first",
  siteDescription:
    "Projects by Henry Goldsmith, each with a stage label, the numbers behind it and a link to the source. Prototypes are labelled as prototypes.",
  /**
   * Set VITE_SITE_URL in the deployment environment. Absolute URLs in the
   * sitemap, canonical tags and OpenGraph cards all depend on it; without it
   * they fall back to the runtime origin, which crawlers handle less well.
   */
  siteUrl: import.meta.env?.VITE_SITE_URL ?? "",
  name: "Henry Goldsmith",
  monogram: "HG",
  role: "Student · Developer",
  statement: "Build it, measure it, say what it actually does.",
  intro:
    "I build software around problems I run into myself, then try to be honest about how far each one actually got. Every project here carries a stage label, and every number links to the thing that produced it.",

  /** Shown in the About section. Kept short and specific. */
  about: [
    "Most of these projects start with a small frustration — a revision system that scattered across five apps, a pantry nobody could keep accurate, a debate I lost because I could not name why my argument was weak.",
    "The part I find interesting is not getting something working once. It is deciding what a product should refuse to do, and then making that refusal something a test can check.",
  ],

  /** The three ideas the work keeps coming back to. */
  principles: [
    {
      title: "Deterministic core, narrow AI boundary",
      description:
        "Where a model is involved, it writes sentences. Scores, schedules and decisions are computed in code so they are reproducible and testable — and so the product still works with no provider configured.",
    },
    {
      title: "A claim needs a source",
      description:
        "Numbers carry the method that produced them. Coverage figures match the granularity of the underlying data. If something cannot be pointed at, it does not get stated.",
    },
    {
      title: "Say what it isn't",
      description:
        "Every project here says what stage it is at and what I did not build. A prototype labelled as a prototype is more useful than a prototype described as a product.",
    },
  ],

  currently: "Building the projects listed here, mostly in one monorepo.",
  learning: "Statistics, testing strategy and how to design a product constraint.",
  outsideCoding: "Fitness, cycling and football.",
  approach: "Start with a problem I actually have.",

  /** Used for Person structured data. */
  knowsAbout: [
    "Software development",
    "TypeScript",
    "React",
    "Product design",
    "Applied statistics",
    "Accessibility",
    "Test automation",
  ],

  contact: {
    github: "https://github.com/henrygoldsmith07-wq",
    email: "",
  },
} as const;
