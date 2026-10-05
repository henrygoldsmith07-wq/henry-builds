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
  role: "Student developer — product engineering & applied AI",
  /**
   * The one-line version of what he is trying to become, used as the hero's
   * supporting line and the Person structured-data `jobTitle`.
   *
   * "Student · Developer" was accurate and said nothing: it did not tell a
   * reader which problems he picks or what he is trying to get better at. The
   * claims below are the ones the registry actually supports — an AI boundary
   * held narrow and testable across several projects, and a preference for
   * shipping the constraint rather than the feature.
   */
  roleSummary:
    "I build small products end to end, keep the AI part narrow enough to test, and write down what the thing actually does.",
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

  /**
   * What he is doing now.
   *
   * This used to say "mostly in one monorepo", which stopped being true during
   * the 2026-08 migration: every project now lives in its own repository, and
   * the README says so. Profile copy that contradicts the repository is worse
   * than no copy, so it names the architecture that is actually there.
   */
  currently:
    "Building the projects listed here. Each one is its own repository now — they left the shared monorepo during the 2026-08 migration, which is why the archive is split across a dozen private repos rather than one tree.",
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

  /**
   * The areas the work keeps coming back to.
   *
   * Every one of these is derivable from the registry rather than aspirational:
   * each names projects that demonstrate it, and the matching `/compare` view
   * finds them from the same fields. If a line here cannot be pointed at, it
   * does not belong here.
   */
  focus: [
    {
      title: "Product engineering",
      description:
        "Small tools built end to end around a problem I actually hit — a revision system that scattered across five apps, a pantry nobody could keep accurate, a debate I lost because I could not name why my argument was weak.",
      slugs: ["revise", "forq", "noticed"],
    },
    {
      title: "Learning tools",
      description:
        "Software that has to teach something and then admit what it has not proven. The Spanish app knows roughly where you are; the revision app marks against a mark scheme it has only double-marked internally.",
      slugs: ["le-studio-french", "revise", "rapport"],
    },
    {
      title: "Applied AI, held to a narrow boundary",
      description:
        "Where a model is involved it writes sentences; scores, schedules and decisions are computed in code so they stay reproducible and testable — and the product still runs with no provider configured.",
      slugs: ["rapport", "pulse", "reflect", "revise"],
    },
    {
      title: "Developer tooling",
      description:
        "Command-line and systems work: parsers, compression strategies and a benchmark harness that fails the build if a reduction ever costs a line the reader needed.",
      slugs: ["rtk", "dictation-typer", "meeting-recorder"],
    },
    {
      title: "Evidence-driven software",
      description:
        "This site. Every claim carries a stage label and a link to whatever produced it, and stale data is shown as stale rather than quietly dropped.",
      slugs: [],
    },
  ],

  /**
   * Contact and the CV link.
   *
   * Fields that are not populated are left as empty strings rather than filled
   * with something plausible: the contact block renders only what is present,
   * so adding an address here is the single edit that puts it on the page. No
   * address, handle or URL in this file may be invented.
   *
   * `cv` is a path under /public, not an external link, so it is served by the
   * same origin as the site and does not leak a third-party profile URL.
   */
  contact: {
    github: "https://github.com/henrygoldsmith07-wq",
    /** Empty until he supplies one; the site hides the row rather than showing a dead mailto. */
    email: "",
    /** Empty until he supplies one. */
    linkedin: "",
    /** Public CV file under /public, or "" for none. */
    cv: "",
    /** Short status line shown next to the contact actions. Not a promise of availability. */
    availability: "",
  },
} as const;
