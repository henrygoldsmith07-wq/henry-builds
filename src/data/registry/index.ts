import type {
  CiFacts,
  CiFactsFile,
  Demonstrates,
  Evidence,
  EvidenceLedgerFile,
  FactsHistoryFile,
  FactsSnapshot,
  LedgerClaim,
  LedgerStatus,
  Metric,
  Project,
  ProofSummary,
  SourceState,
  SourceStatusEntry,
  SourceStatusSnapshot,
  Stage,
  UpstreamEntry,
  UpstreamSnapshot,
} from "./schema";
import {
  buildRouteManifest,
  buildRoutePaths,
  isPublishedCaseStudy,
  needsHistoricalDisclosure,
} from "./publication.mjs";
import upstreamRaw from "../../../registry/upstream.json";
import ciFactsRaw from "../../../registry/ci-facts.json";
import evidenceLedgerRaw from "../../../registry/evidence-ledger.json";
import sourceStatusRaw from "../../../registry/source-status.json";
import factsHistoryRaw from "../../../registry/facts-history.json";

/**
 * Case studies are hand-authored, one file per project. Loading them by glob
 * means adding a project is adding a file — there is no index to forget to update.
 */
const caseStudyModules = import.meta.glob<{ default: Project }>(
  "../../../registry/case-studies/*.json",
  { eager: true },
);

const upstream = upstreamRaw as unknown as UpstreamSnapshot & {
  lifecycleStates: Record<string, string>;
};
const ciFactsFile = ciFactsRaw as unknown as CiFactsFile;
const evidenceLedger = evidenceLedgerRaw as unknown as EvidenceLedgerFile;
const sourceStatuses = sourceStatusRaw as unknown as SourceStatusSnapshot;
const factsFile = factsHistoryRaw as unknown as FactsHistoryFile;

const ciFacts: CiFacts = ciFactsFile.facts ?? {};

const upstreamById = new Map<string, UpstreamEntry>(
  upstream.entries.map((entry) => [entry.id, entry]),
);

const statusBySlug = sourceStatuses.projects ?? {};
const claimsByProduct = new Map<string, LedgerClaim[]>();
for (const claim of evidenceLedger.claims ?? []) {
  const list = claimsByProduct.get(claim.product) ?? [];
  list.push(claim);
  claimsByProduct.set(claim.product, list);
}

/**
 * A `publish: false` project publishes itself once the upstream lifecycle
 * promotes it out of `incubating`. This is how Pulse reaches the site: when
 * its upstream lifecycle becomes `active`, the gate opens on the next import.
 *
 * The rule is not restated here. It lives in `./publication.mjs`, a plain ESM
 * module with no `node:` imports, which means Vite and the Node scripts load
 * the identical file. Every consumer — sitemap, route HTML, link checks, the
 * deploy probe and this page — reads one definition, so they cannot disagree
 * about which projects are published.
 */
const isPublished = isPublishedCaseStudy;

/** Local-only shim: the importer is plain JS and this module runs in Vite. */
const basename = (p: string) => p.split("/").pop() ?? p;

/**
 * CI is the better source for a test count than a README that can drift.
 * Where the importer captured a real figure from a green run, it replaces the
 * authored one and says so; where the run failed, no number is invented — the
 * authored number stands with its own evidence.
 */
function withCiMetrics(project: Project, facts: CiFacts[string] | undefined): Metric[] {
  const metrics = project.caseStudy.metrics ?? [];
  if (!facts?.tests || facts.conclusion !== "success") return metrics;

  const when = facts.lastSuccessfulRunAt;
  const ciMetric: Metric = {
    label: "Automated tests",
    value: facts.tests.files
      ? `${facts.tests.total} across ${facts.tests.files} files`
      : `${facts.tests.total}`,
    method: `Read from the latest successful ${basename(facts.workflow)} run${
      when ? ` (${when.slice(0, 10)})` : ""
    }.`,
    source: "ci",
    evidence: [
      {
        kind: "ci",
        label: facts.runUrl ? "Workflow run" : basename(facts.workflow),
        href: facts.lastSuccessRunUrl ?? facts.runUrl ?? facts.workflowUrl,
        path: facts.workflow,
      },
    ],
  };

  // Replace the authored test count rather than showing two of them.
  const rest = metrics.filter((metric) => !/^automated tests$/i.test(metric.label));
  return [ciMetric, ...rest];
}

/**
 * What exists behind a case study right now. A human may declare `concept` or
 * `historical-case-study`; everything else is derived by the importer from
 * what actually exists, and cannot be claimed by hand.
 */
function sourceStateOf(project: Project): SourceState {
  if (project.sourceState === "concept" || project.sourceState === "historical-case-study") {
    return project.sourceState;
  }
  const derived = statusBySlug[project.slug]?.derived;
  if (derived === "archived-source") return "archived-source";
  return "current-source";
}

function hydrate(project: Project): HydratedProject {
  const entry = upstreamById.get(project.upstreamId);
  const facts = ciFacts[project.upstreamId];
  const statusEntry: SourceStatusEntry | undefined = statusBySlug[project.slug];
  const sourceState = sourceStateOf(project);

  return {
    ...project,
    // An archived source never leads the landing page, whatever the file says.
    featured: sourceState === "current-source" ? project.featured : false,
    caseStudy: {
      ...project.caseStudy,
      metrics: withCiMetrics(project, facts),
    },
    upstream: entry
      ? {
          lifecycle: entry.lifecycle,
          lifecycleMeaning: upstream.lifecycleStates[entry.lifecycle] ?? "",
          stack: entry.stack,
          description: entry.description,
          path: entry.path,
          repo: entry.repo,
        }
      : undefined,
    ci: facts
      ? {
          workflow: facts.workflow,
          runUrl: facts.runUrl,
          conclusion: facts.conclusion,
          lastRunAt: facts.lastRunAt,
          /** The date of the newest green run — what "last verified" means. */
          lastVerifiedAt:
            facts.lastSuccessfulRunAt ??
            (facts.conclusion === "success" ? facts.lastRunAt : undefined),
          carriedForward: facts.carriedForward === true,
        }
      : undefined,
    sourceState,
    sourceReason: statusEntry?.reason,
    sourceRepo: statusEntry?.repo,
    sourceRef: statusEntry?.ref,
    sourceAccess: statusEntry?.access,
    sourceSha: statusEntry?.sha,
    sourceShaUrl: statusEntry?.shaUrl,
    sourceCheckedAt: statusEntry ? sourceStatuses.checkedAt : undefined,
    ledgerClaims: claimsByProduct.get(project.upstreamId) ?? [],
    ledgerImportedAt: evidenceLedger.importedAt,
    facts: factsFile.latest?.[project.upstreamId],
    factsHistory: factsFile.history?.[project.upstreamId] ?? [],
    factsGeneratedAt: factsFile.generatedAt,
    registryImportedAt: upstream.importedAt,
  };
}

export type HydratedProject = Project & {
  /** Authored declarations (`concept`/`historical`) merged with derived reality. */
  sourceState: SourceState;
  featured: boolean;
  upstream?:
    | {
        lifecycle: string;
        lifecycleMeaning: string;
        stack?: string;
        description: string;
        path?: string;
        repo?: string;
      }
    | undefined;
  ci?:
    | {
        workflow: string;
        runUrl?: string;
        conclusion?: string;
        lastRunAt?: string;
        lastVerifiedAt?: string;
        carriedForward?: boolean;
      }
    | undefined;
  sourceReason?: string;
  sourceRepo?: string;
  sourceRef?: string;
  sourceAccess?: "public" | "private";
  sourceSha?: string;
  sourceShaUrl?: string;
  sourceCheckedAt?: string;
  /** Graded claims for this product from the monorepo's evidence ledger. */
  ledgerClaims: LedgerClaim[];
  ledgerImportedAt?: string;
  /** Latest operational snapshot (CI, deployment, release, vulnerabilities). */
  facts?: FactsSnapshot;
  /** Dated snapshots powering trend charts. */
  factsHistory: FactsSnapshot[];
  factsGeneratedAt?: string;
  registryImportedAt: string;
};

/** Look up the ledger grading behind a claim's `ledgerClaimId`, if any. */
export function ledgerClaimOf(
  project: HydratedProject,
  claimId: string | undefined,
): LedgerClaim | undefined {
  return claimId ? project.ledgerClaims.find((claim) => claim.id === claimId) : undefined;
}

/** Where a ledger grade sits on the weak → strong ordering; -1 when unknown. */
export function ledgerGradeRank(status: string): number {
  const order: LedgerStatus[] = [
    "insufficient-evidence",
    "infrastructure-only",
    "internally-benchmarked",
    "partially-demonstrated",
    "demonstrated",
    "externally-validated",
  ];
  const index = order.indexOf(status as LedgerStatus);
  return index === -1 ? -1 : index;
}

/** The pre-migration monorepo. A fallback, not the default owner of any path. */
export const MONOREPO_BASE = "https://github.com/henrygoldsmith07-wq/Claude-Code";

/**
 * Resolve a repo-relative path to a URL in whichever repository owns it today.
 *
 * The portfolio migrated out of the `Claude-Code` monorepo in August 2026; each
 * project now lives in its own standalone repository. `source-status.json` is
 * the generated record of where each one went, so it — not a hardcoded base —
 * decides which repository a bare `path` resolves against. Falling back to the
 * monorepo only when the importer found no entry keeps a visible link for the
 * handful of projects with no resolvable source instead of a silent blank.
 */
export function repoBaseFor(project: HydratedProject): string {
  const repo = project.sourceRepo;
  if (repo) return `https://github.com/${repo}`;
  return MONOREPO_BASE;
}

/** Same resolution for a directory-style path (architecture layers). */
export function repoTreeHrefFor(project: HydratedProject, path: string): string {
  return `${repoBaseFor(project)}/tree/main/${path}`;
}

/**
 * Turn one evidence item into the URL a reader should actually follow. An
 * explicit `href` always wins — it was authored against a known repository.
 * A bare `path` is resolved against the project that owns it today.
 */
export function evidenceHrefFor(project: HydratedProject, item: Evidence): string | undefined {
  if (item.href) return item.href;
  if (item.path) return `${repoBaseFor(project)}/blob/main/${item.path}`;
  return item.src;
}

/**
 * The `demonstrates` block, falling back to the project's tags so the
 * comparison view always has two axes to sort by. The fallback is a single
 * generic string rather than a silent copy of the tags, because a tag list is
 * a topic index, not a claim about what the work demonstrates.
 */
export function demonstratesOf(project: HydratedProject): Demonstrates {
  const declared = project.caseStudy.demonstrates;
  if (declared) return declared;
  return {
    technical: project.tags.filter(Boolean),
    product: [project.category].filter(Boolean),
  };
}

/** Every evidence pointer a case study carries, for counting and density. */
export function allEvidenceOf(project: HydratedProject): Evidence[] {
  const cs = project.caseStudy;
  const fromClaims = cs.outcomes.flatMap((o) => o.evidence);
  const fromMetrics = cs.metrics.flatMap((m) => m.evidence);
  const fromArchitecture = cs.architecture?.evidence ?? [];
  const fromLifecycle = cs.insightLifecycle?.evidence ?? [];
  const fromBenchmark = cs.benchmarkChart?.evidence ?? [];
  return [
    ...fromClaims,
    ...fromMetrics,
    ...fromArchitecture,
    ...fromLifecycle,
    ...fromBenchmark,
  ];
}

/** Evidence pointers that are not just the local repository's own README. */
export function evidenceDensityOf(project: HydratedProject): number {
  const all = allEvidenceOf(project);
  // Deduplicate on the resolved target, so three chips pointing at one README
  // count once rather than inflating the portfolio's apparent evidence base.
  const unique = new Set(
    all
      .map((item) => evidenceHrefFor(project, item) ?? `${item.kind}:${item.label}`)
      .filter(Boolean),
  );
  return unique.size;
}

/** True when the newest tracked CI run for this project is not green. */
export function hasRedCi(project: HydratedProject): boolean {
  return project.ci?.conclusion === "failure";
}

/** True when CI facts for this project were carried forward rather than refreshed. */
export function hasCarriedCi(project: HydratedProject): boolean {
  return project.ci?.carriedForward === true;
}

/** Days since the human last checked these claims, or null when unknown. */
export function daysSinceVerified(project: HydratedProject): number | null {
  const stamp = project.caseStudy.lastVerifiedAt;
  if (!stamp) return null;
  const then = new Date(stamp).getTime();
  if (!Number.isFinite(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

/**
 * Whether the recorded deployment snapshot is old enough that the site should
 * stop presenting it as the current state of the world.
 *
 * `facts-history.json` is generated from a token-authenticated probe and is
 * never hand-edited, so when that probe stops running the snapshot silently
 * ages. A URL in it can return 410 Gone for months while the site still calls
 * the deployment "success". Rather than restate a snapshot nobody has checked
 * recently as fact, this marks it stale so the verification strip can say so.
 *
 * Returns the age in days, or null when there is no usable deployment record.
 */
export function deploySnapshotAgeDays(project: HydratedProject): number | null {
  const deploy = project.facts?.deploy;
  if (!deploy || deploy.state === "none" || !deploy.url) return null;
  // The snapshot as a whole is timestamped once; fall back to the deployment's
  // own creation date when the file-level stamp is absent.
  const stamped =
    factsFile.generatedAt ?? factsFile.latest?.[project.upstreamId]?.deploy?.createdAt;
  if (!stamped) return null;
  const then = new Date(stamped).getTime();
  if (!Number.isFinite(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

/** Deploy records older than this are shown as an unchecked snapshot. */
export const DEPLOY_SNAPSHOT_WINDOW_DAYS = 14;

const stageRank: Record<Stage, number> = {
  shipped: 0,
  beta: 1,
  prototype: 2,
  research: 3,
  archived: 4,
};

const allProjects: HydratedProject[] = Object.values(caseStudyModules)
  .map((module) => module.default)
  .filter((project) => isPublished(project, upstreamById))
  .map(hydrate)
  .sort((a, b) => {
    // Dead sources go to the bottom of every list, whatever their stage says.
    const deadA = a.sourceState === "current-source" ? 0 : 1;
    const deadB = b.sourceState === "current-source" ? 0 : 1;
    if (deadA !== deadB) return deadA - deadB;
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (stageRank[a.stage] !== stageRank[b.stage]) {
      return stageRank[a.stage] - stageRank[b.stage];
    }
    return a.name.localeCompare(b.name);
  });

export const projects = allProjects;

/** Shown on the landing page. Capped at 6 — the validator enforces 5 or 6. */
export const featuredProjects = allProjects.filter((project) => project.featured);

/** Everything else, for the /projects archive. */
export const archivedProjects = allProjects.filter((project) => !project.featured);

export function getProject(slug: string): HydratedProject | undefined {
  return allProjects.find((project) => project.slug === slug);
}

export const registryMeta = {
  source: upstream.source,
  importedAt: upstream.importedAt,
  upstreamCount: upstream.entries.length,
  publishedCount: allProjects.length,
  currentCount: allProjects.filter((p) => p.sourceState === "current-source").length,
  archivedSourceCount: allProjects.filter((p) => p.sourceState !== "current-source").length,
  ciImportedAt: ciFactsFile.importedAt,
  ledgerImportedAt: evidenceLedger.importedAt,
  ledgerClaimCount: evidenceLedger.claims?.length ?? 0,
  sourcesCheckedAt: sourceStatuses.checkedAt,
  factsGeneratedAt: factsFile.generatedAt,
};

/** How recently a claim check still counts as current, in days. */
export const FRESH_CLAIM_WINDOW_DAYS = 180;

/**
 * Count the site's own evidence base at load time.
 *
 * This is deliberately computed rather than written down. A scoreboard typed
 * into a component would drift the moment a case study changed; counted here,
 * it cannot flatter the work — remove a project's evidence and the number falls
 * with it. It is the one statistic on the site that audits the site.
 */
export function buildProofSummary(list: HydratedProject[] = allProjects): ProofSummary {
  const technical = new Set<string>();
  const product = new Set<string>();
  let evidenceLinks = 0;
  let measuredMetrics = 0;
  let evidencedClaims = 0;
  let ledgerGradedClaims = 0;
  let strongestGrade: LedgerStatus | undefined;
  let ciGreen = 0;
  let ciTracked = 0;
  let recentlyVerified = 0;
  let statedLimitations = 0;

  for (const project of list) {
    const cs = project.caseStudy;
    const shows = demonstratesOf(project);
    for (const item of shows.technical) technical.add(item.trim().toLowerCase());
    for (const item of shows.product) product.add(item.trim().toLowerCase());

    evidenceLinks += evidenceDensityOf(project);
    measuredMetrics += cs.metrics.length;
    evidencedClaims += cs.outcomes.filter((o) => o.evidence.length > 0).length;
    statedLimitations += cs.limitations.length;

    for (const claim of project.ledgerClaims) {
      ledgerGradedClaims++;
      if (ledgerGradeRank(claim.status) > ledgerGradeRank(strongestGrade ?? "")) {
        strongestGrade = claim.status;
      }
    }

    if (project.ci) {
      ciTracked++;
      if (project.ci.conclusion === "success") ciGreen++;
    }

    const age = daysSinceVerified(project);
    if (age !== null && age <= FRESH_CLAIM_WINDOW_DAYS) recentlyVerified++;
  }

  return {
    projects: list.length,
    evidenceLinks,
    measuredMetrics,
    evidencedClaims,
    ledgerGradedClaims,
    strongestGrade,
    technicalCapabilities: technical.size,
    productCapabilities: product.size,
    ciGreen,
    ciTracked,
    recentlyVerified,
    freshWithinDays: FRESH_CLAIM_WINDOW_DAYS,
    statedLimitations,
  };
}

/** The portfolio's own arithmetic, computed once. */
export const proofSummary = buildProofSummary();

/**
 * Whether every cited repository is private. The landing page once asserted the
 * source was public; this is the generated truth that has to agree with any
 * claim the copy makes about access.
 */
export const allSourcesPrivate =
  allProjects.length > 0 &&
  allProjects.every((p) => p.sourceRepo && p.sourceAccess === "private");

/** Whether at least one cited repository is publicly readable. */
export const anySourcePublic = allProjects.some((p) => p.sourceAccess === "public");

export * from "./schema";
