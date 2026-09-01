/**
 * Portfolio registry types.
 *
 * The registry is the single source of truth for what appears on this site.
 * It has three layers:
 *
 *   registry/upstream.json        imported from the monorepo's apps/registry.json (generated)
 *   registry/ci-facts.json        test/benchmark counts pulled from CI (generated)
 *   registry/case-studies/*.json  hand-authored narrative + evidence (edited by a human)
 *
 * Generated layers are never edited by hand; `bun run registry:import` rewrites them.
 * `bun run registry:validate` enforces every rule described in these types, so a claim
 * that cannot point at evidence fails CI rather than reaching the site.
 */

/** How far along a project actually is. Ordered weakest to strongest. */
export type Stage = "research" | "prototype" | "beta" | "shipped" | "archived";

export const stageOrder: Stage[] = ["research", "prototype", "beta", "shipped", "archived"];

/**
 * What kind of code the site is presenting. Distinct from stage: stage says how
 * far the work got, source state says whether you can still go and read it.
 */
export type SourceState =
  | "current-source"
  | "archived-source"
  | "concept"
  | "historical-case-study";

export const sourceStateCopy: Record<SourceState, { label: string; meaning: string }> = {
  "current-source": {
    label: "Current source",
    meaning: "The code lives in the monorepo today and can be read and run.",
  },
  "archived-source": {
    label: "Archived source",
    meaning: "The code still exists but is archived or superseded upstream.",
  },
  concept: {
    label: "Concept",
    meaning: "An idea or design with no product source claimed.",
  },
  "historical-case-study": {
    label: "Historical case study",
    meaning:
      "The source no longer exists on main. Kept for the record only — claims cannot be re-verified against code.",
  },
};

export const stageCopy: Record<Stage, { label: string; meaning: string }> = {
  research: {
    label: "Research",
    meaning: "Exploring the problem. No product to use yet.",
  },
  prototype: {
    label: "Prototype",
    meaning: "Runs end to end, but not something anyone else depends on.",
  },
  beta: {
    label: "Beta",
    meaning: "Feature-complete and tested in CI. No public deployment yet.",
  },
  shipped: {
    label: "Shipped",
    meaning: "Publicly deployed and in regular use.",
  },
  archived: {
    label: "Archived",
    meaning: "Frozen. Kept for provenance, not developed further.",
  },
};

/**
 * Lifecycle values used by the upstream monorepo registry.
 * Kept in sync with apps/registry.json -> lifecycleStates.
 */
export type UpstreamLifecycle =
  | "active"
  | "incubating"
  | "maintenance"
  | "archived"
  | "superseded"
  | "tooling"
  | "external";

/** A pointer to something a reader can go and check for themselves. */
export type EvidenceKind =
  | "repo" // source directory or repository
  | "ci" // a workflow that runs on every push
  | "benchmark" // a committed, reproducible benchmark artifact
  | "doc" // a README or design doc in the repo
  | "screenshot" // a real capture of the running app
  | "video" // a screen recording of the running app
  | "live"; // a public deployment

export type Evidence = {
  kind: EvidenceKind;
  /** Human-readable name of the thing being pointed at. */
  label: string;
  /** External URL. Required for `live`; optional elsewhere. */
  href?: string;
  /** Repo-relative path, e.g. "apps/rtk/benchmark/results.md". */
  path?: string;
  /** Local asset served from /public, e.g. "/media/rtk/benchmark.png". */
  src?: string;
};

/**
 * A statement about a project that is only rendered if it carries evidence.
 * The validator rejects any claim with an empty `evidence` array.
 */
export type Claim = {
  statement: string;
  evidence: Evidence[];
};

/**
 * A number. Numbers are the easiest thing to overstate, so a metric must say
 * how it was measured and point at something reproducible.
 */
export type Metric = {
  label: string;
  value: string;
  /** How this number was produced. Free text, but must be specific. */
  method: string;
  evidence: Evidence[];
  /**
   * Set by the CI importer when the number comes from a workflow run rather
   * than from the hand-authored file. Never edited by hand.
   */
  source?: "ci" | "authored";
};

export type Tradeoff = {
  choice: string;
  gained: string;
  gaveUp: string;
};

export type FailedApproach = {
  approach: string;
  whyItFailed: string;
  whatItChanged: string;
};

/**
 * A visual. `kind` is load-bearing: the UI labels illustrations as illustrations
 * so a drawn mockup is never mistaken for a screenshot of working software.
 */
export type Visual =
  | { kind: "screenshot"; src: string; alt: string; caption?: string }
  | { kind: "illustration"; preview: PreviewKind; alt: string; caption?: string };

export type PreviewKind =
  | "revise"
  | "rapport"
  | "pulse"
  | "rtk"
  | "forq"
  | "reflect"
  | "world-news"
  | "fitness"
  | "language"
  | "calendar"
  | "studio"
  | "generic";

export type ArchitectureLayer = {
  name: string;
  /** What lives in this layer. */
  role: string;
  /** Repo-relative path this layer maps to, when there is one. */
  path?: string;
};

export type Architecture = {
  /** One sentence describing the organising idea, not a list of technologies. */
  summary: string;
  layers: ArchitectureLayer[];
  /** The constraint the layering exists to enforce. */
  invariant?: string;
  evidence: Evidence[];
};

/**
 * A project's own answer to "how does a claim move from first notice to
 * established knowledge?". Rendered as its own numbered section when present.
 * The state names must match the machine in the code, so a reader can go and
 * check them; `next` entries must name states that exist in `states`.
 */
export type InsightLifecycle = {
  /** One sentence describing the organising idea. */
  summary: string;
  /** The states a claim passes through, in order. */
  states: {
    /** Machine state name, e.g. "replicated". */
    state: string;
    /** What being in this state means. */
    meaning: string;
    /** What has to be true to enter it. */
    entry: string;
    /** Which states can follow from here — must name states in `states`. */
    next: string[];
  }[];
  /** The rules that gate movement between states. */
  rules: string[];
  /** Links to the code that owns the machine. */
  evidence: Evidence[];
};

export type CaseStudy = {
  problem: string;
  approach: string;
  architecture?: Architecture;
  insightLifecycle?: InsightLifecycle;
  visuals: Visual[];
  video?: { src: string; poster?: string; caption: string };
  metrics: Metric[];
  outcomes: Claim[];
  tradeoffs: Tradeoff[];
  failedApproaches: FailedApproach[];
  lessons: string[];
  /**
   * Required. What this project cannot yet claim, stated plainly — rendered as
   * its own prominent section, not a footnote.
   */
  limitations: string[];
  /** Only where genuine committed benchmark data exists; never decoration. */
  benchmarkChart?: BenchmarkChart;
};

/**
 * A chart built from real benchmark data in the repo. The validator requires a
 * unit, evidence and numeric series, so charts must rest on something a reader
 * can go and re-run.
 */
export type BenchmarkChart = {
  title: string;
  /** What the numbers measure, e.g. "% of raw tokens removed". */
  unit: string;
  series: { label: string; value: number }[];
  evidence: Evidence[];
  note?: string;
};

/** What the author personally built, stated plainly. */
export type Authorship = {
  /** e.g. "Sole author" or "Design and implementation, on top of X". */
  role: string;
  /** Specific things built. */
  built: string[];
  /** Specific things NOT built — libraries, services, borrowed designs. */
  notBuilt: string[];
};

export type Project = {
  slug: string;
  /** Matches an `id` in the upstream monorepo registry. */
  upstreamId: string;
  name: string;
  tagline: string;
  summary: string;
  stage: Stage;
  category: string;
  tags: string[];
  accent: string;
  /** Shown on the landing page. The validator caps this at 6. */
  featured: boolean;
  /**
   * Whether the project appears on the public site at all.
   * A project with `publish: false` is carried in the registry but rendered
   * nowhere — used for work that is not yet canonical upstream.
   */
  publish: boolean;
  /** Why publish is false, and what would flip it. Required when publish is false. */
  publishGate?: string;
  /**
   * Whether you can still read this project's code. Set by
   * scripts/archive-removed.mjs from the upstream registry; "historical case
   * study" means the source no longer exists on main.
   */
  sourceState?: SourceState;
  /** Stamped when a project's source disappears from the monorepo. */
  sourceRemoved?: { detectedAt: string; note: string };
  authorship: Authorship;
  repo?: { label: string; href: string; path?: string };
  liveUrl?: string;
  caseStudy: CaseStudy;
};

/** One entry of the generated upstream snapshot. */
export type UpstreamEntry = {
  id: string;
  name: string;
  path?: string;
  repo?: string;
  lifecycle: UpstreamLifecycle;
  kind: string;
  stack?: string;
  description: string;
  workflow?: string;
  site?: string | null;
};

export type UpstreamSnapshot = {
  /** Where this was imported from. */
  source: { repo: string; path: string; ref: string };
  importedAt: string;
  entries: UpstreamEntry[];
};

/** Test and benchmark facts pulled from CI, keyed by upstream id. */
export type CiFacts = Record<
  string,
  {
    workflow: string;
    workflowUrl?: string;
    runUrl?: string;
    conclusion?: string;
    /** Newest completed run, whatever its conclusion. */
    lastRunAt?: string;
    /**
     * The newest successful run — this is the date the code was last verified
     * by CI, and the date the site shows as "last verified".
     */
    lastSuccessfulRunAt?: string;
    lastSuccessRunUrl?: string;
    tests?: { total: number; files?: number };
    benchmarks?: { cases: number; label?: string; sourceUrl?: string };
    /** Where the number came from when CI did not report one directly. */
    derivedFrom?: string;
    /** Set when a transient import failure carried an older fact forward. */
    carriedForward?: boolean;
    carriedReason?: string;
  }
>;

/**
 * Stage is not a free choice. These are the conditions the validator enforces,
 * so the label on the site always means the same thing.
 */
export const stageRequirements: Record<Stage, string> = {
  shipped: "requires a liveUrl and at least one `live` evidence item",
  beta: "requires at least one `ci` evidence item",
  prototype: "requires at least one `repo` evidence item",
  research: "requires at least one evidence item of any kind",
  archived: "requires the upstream lifecycle to be archived or superseded",
};
