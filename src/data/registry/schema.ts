/**
 * Portfolio registry types.
 *
 * The registry is the single source of truth for what appears on this site.
 * It has five layers, three of them generated:
 *
 *   registry/upstream.json         imported from the monorepo's apps/registry.json (generated)
 *   registry/evidence-ledger.json  imported from the monorepo's evidence/registry.json (generated)
 *   registry/ci-facts.json         workflow conclusions + test counts pulled from CI (generated)
 *   registry/source-status.json    current vs archived-source per project, with the commit
 *                                  SHA each source sits at (generated)
 *   registry/case-studies/*.json   hand-authored narrative + evidence (edited by a human)
 *
 * Generated layers are never edited by hand; `bun run registry:import` rewrites them.
 * `bun run registry:validate` enforces every rule described in these types, so a claim
 * that cannot point at evidence fails CI rather than reaching the site.
 */

/** How far along a project actually is. Ordered weakest to strongest. */
export type Stage = "research" | "prototype" | "beta" | "shipped" | "archived";

export const stageOrder: Stage[] = ["research", "prototype", "beta", "shipped", "archived"];

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
 * What exists behind a case study today. Distinct from `stage`, which says how
 * far the work got; this says what you would find if you followed the source
 * links right now. `current` and `archived-source` are derived from the live
 * monorepo registry by the importer; `concept` and `historical` are human
 * declarations the derivation never overwrites.
 */
export type SourceStatus = "current" | "archived-source" | "concept" | "historical";

export const sourceStatusCopy: Record<SourceStatus, { label: string; meaning: string }> = {
  current: {
    label: "Current source",
    meaning:
      "The source linked here exists right now and is where development happens. Checked on every import.",
  },
  "archived-source": {
    label: "Archived source",
    meaning:
      "The source behind this case study no longer exists — removed or renamed upstream. The write-up stays as provenance.",
  },
  concept: {
    label: "Concept",
    meaning: "A written exploration. No implementation ever backed it.",
  },
  historical: {
    label: "Historical case study",
    meaning: "Kept deliberately as a record of past work. The source state is irrelevant by declaration.",
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
  /**
   * When this evidence was captured (ISO date). Required over time for
   * captures that rot: screenshots, videos and benchmarks.
   */
  capturedAt?: string;
  /**
   * After this date (ISO) the evidence is stale and the validator refuses it.
   * Set explicitly when a capture has a known shelf life.
   */
  expiresAt?: string;
};

/**
 * One graded claim from the monorepo's evidence/registry.json — the durable
 * ledger that says what the ecosystem has actually measured. A case-study
 * outcome can point at one with `ledgerClaimId`; the site then renders the
 * grade, sample size and last-validated date straight from the ledger, and
 * the validator refuses any capability whose grade is `insufficient-evidence`.
 */
export type LedgerClaim = {
  id: string;
  /** Matches an upstream registry id, e.g. "revise". */
  product: string;
  claim: string;
  status: string;
  evidenceSource?: string;
  sampleSize?: number;
  benchmark?: string;
  lastUpdated?: string;
  limitations?: string;
};

/** The grades the ledger uses, weakest to strongest. */
export const ledgerStatusOrder = [
  "insufficient-evidence",
  "infrastructure-only",
  "internally-benchmarked",
  "partially-demonstrated",
  "demonstrated",
  "externally-validated",
] as const;

export type LedgerStatus = (typeof ledgerStatusOrder)[number];

export const ledgerStatusCopy: Record<LedgerStatus, { label: string; meaning: string }> = {
  "insufficient-evidence": {
    label: "Insufficient evidence",
    meaning: "Claimed somewhere in copy but never measured. The site refuses to repeat such claims.",
  },
  "infrastructure-only": {
    label: "Infrastructure only",
    meaning: "The plumbing exists but no user-facing behaviour has been exercised.",
  },
  "internally-benchmarked": {
    label: "Internally benchmarked",
    meaning: "Measured on curated or synthetic data. Not tested with real users or third parties.",
  },
  "partially-demonstrated": {
    label: "Partially demonstrated",
    meaning: "Core path shown; edge cases, scale or replication not yet covered.",
  },
  demonstrated: {
    label: "Demonstrated",
    meaning: "End-to-end behaviour shown with a cited benchmark and sample.",
  },
  "externally-validated": {
    label: "Externally validated",
    meaning: "Independent replication or audit confirms it.",
  },
};

/**
 * A statement about a project that is only rendered if it carries evidence.
 * The validator rejects any claim with an empty `evidence` array.
 */
export type Claim = {
  statement: string;
  evidence: Evidence[];
  /**
   * Links the statement to a graded claim in the monorepo's evidence ledger.
   * When set, the grade, sample size and last-validated date render with the
   * claim — and if that grade is `insufficient-evidence`, the validator
   * refuses the page entirely.
   */
  ledgerClaimId?: string;
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
  /**
   * Include this metric in the benchmark chart on the case study page.
   * Only set it when the value is a genuine benchmark result with evidence —
   * the chart exists to compare measured things, not to decorate.
   */
  chart?: number;
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
  /** Receipts: where the failure was recorded or measured, when one exists. */
  evidence?: Evidence[];
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
   * Known limits, stated up front rather than discovered by the reader.
   * Rendered prominently next to the claims they bound.
   */
  limitations: string[];
  /** When the claims in this study were last checked against the actual code (ISO date). */
  lastVerifiedAt?: string;
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
  authorship: Authorship;
  repo?: { label: string; href: string; path?: string };
  liveUrl?: string;
  /**
   * Human-only source-status declaration. Only `concept` and `historical` are
   * meaningful here — `current` and `archived-source` are derived from what
   * actually exists on every import and cannot be claimed by hand.
   */
  sourceStatus?: "concept" | "historical";
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

/** One project's derived source state, from the generated source-status.json. */
export type SourceStatusEntry = {
  derived: SourceStatus;
  reason: string;
  repo?: string;
  ref?: string;
  /** Commit SHA the source sits at as of the last import. */
  sha?: string;
  shaUrl?: string;
  /** Whether the source repository is publicly readable. */
  access?: "public" | "private" | "unknown";
};

export type SourceStatusSnapshot = {
  checkedAt: string;
  projects: Record<string, SourceStatusEntry>;
};

/** Test and benchmark counts pulled from CI, keyed by upstream id. */
export type CiFacts = Record<
  string,
  {
    workflow: string;
    workflowUrl?: string;
    repo?: string;
    runUrl?: string;
    conclusion?: string;
    completedAt?: string;
    /** The most recent run that actually passed — the date the site shows. */
    lastSuccessAt?: string;
    greenRunUrl?: string;
    greenSha?: string;
    tests?: { total: number; files?: number };
    benchmarks?: { cases: number; artifact?: string };
    /** Where the number came from when CI did not report one directly. */
    derivedFrom?: string;
  }
>;

/** The whole generated ci-facts.json wrapper. */
export type CiFactsFile = {
  importedAt: string;
  mode: "authenticated" | "anonymous";
  facts: CiFacts;
};

/** The whole generated evidence-ledger.json wrapper. */
export type EvidenceLedgerFile = {
  source: { repo: string; path: string; ref: string };
  importedAt: string;
  statusValues: Record<string, string>;
  claims: LedgerClaim[];
};

/** Where this project is deployed right now, from its repo's deployments API. */
export type DeployFact = {
  state?: string;
  environment?: string;
  /** Short SHA of what is actually deployed. */
  sha?: string;
  url?: string;
  createdAt?: string;
  /** True when the deployed commit equals the repository HEAD at collection time. */
  upToDate?: boolean;
};

export type ReleaseFact = {
  tag: string;
  url?: string;
  publishedAt?: string;
};

export type VulnerabilityFact = {
  open?: number;
  unavailable?: string;
};

/** One dated observation of a project's operational state. */
export type FactsSnapshot = {
  date: string;
  sha?: string;
  ci?: {
    conclusion?: string;
    tests?: number;
    lastGreenAt?: string;
  };
  deploy?: DeployFact;
  release?: ReleaseFact;
  vulnerabilities?: VulnerabilityFact;
};

/** The whole generated facts-history.json wrapper. */
export type FactsHistoryFile = {
  generatedAt?: string;
  latest: Record<string, FactsSnapshot>;
  history: Record<string, FactsSnapshot[]>;
};

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
