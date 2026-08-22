import type {
  CiFacts,
  CiFactsFile,
  EvidenceLedgerFile,
  LedgerClaim,
  LedgerStatus,
  Metric,
  Project,
  SourceStatus,
  SourceStatusEntry,
  SourceStatusSnapshot,
  Stage,
  UpstreamEntry,
  UpstreamSnapshot,
} from "./schema";
import upstreamRaw from "../../../registry/upstream.json";
import ciFactsRaw from "../../../registry/ci-facts.json";
import evidenceLedgerRaw from "../../../registry/evidence-ledger.json";
import sourceStatusRaw from "../../../registry/source-status.json";

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
 * A `publish: false` project publishes itself once the monorepo registry
 * promotes it out of `incubating`. This is how Pulse reaches the site: when
 * its upstream lifecycle becomes `active`, the gate opens on the next import.
 *
 * The same gate runs in scripts/generate-sitemap.mjs and the test helpers —
 * keep the three definitions identical.
 */
export function isPublishedGate(
  publishFlag: boolean,
  lifecycle: string | undefined,
): boolean {
  if (!publishFlag && (lifecycle === "active" || lifecycle === "maintenance")) return true;
  return publishFlag;
}

function isPublished(project: Project): boolean {
  return isPublishedGate(project.publish, upstreamById.get(project.upstreamId)?.lifecycle);
}

/**
 * What exists behind a case study right now. A human may declare `concept` or
 * `historical`; everything else is derived by the importer from what actually
 * exists, and cannot be claimed by hand.
 */
function sourceStatusOf(project: Project): SourceStatus & string {
  if (project.sourceStatus === "concept" || project.sourceStatus === "historical") {
    return project.sourceStatus;
  }
  const derived = statusBySlug[project.slug]?.derived;
  if (derived === "current" || derived === "archived-source") return derived;
  // Unknown slug in the generated layer — treat as current but the validator
  // will flag the mismatch against source-status.json.
  return "current";
}

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

  const when = facts.lastSuccessAt ?? facts.completedAt;
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
        href: facts.greenRunUrl ?? facts.runUrl ?? facts.workflowUrl,
        path: facts.workflow,
      },
    ],
  };

  // Replace the authored test count rather than showing two of them.
  const rest = metrics.filter((metric) => !/^automated tests$/i.test(metric.label));
  return [ciMetric, ...rest];
}

function hydrate(project: Project): HydratedProject {
  const entry = upstreamById.get(project.upstreamId);
  const facts = ciFacts[project.upstreamId];
  const statusEntry: SourceStatusEntry | undefined = statusBySlug[project.slug];
  const sourceStatus = sourceStatusOf(project);

  return {
    ...project,
    // An archived source never leads the landing page, whatever the file says.
    featured: sourceStatus === "current" ? project.featured : false,
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
          completedAt: facts.completedAt,
          lastSuccessAt: facts.lastSuccessAt,
          greenRunUrl: facts.greenRunUrl,
          tests: facts.tests,
        }
      : undefined,
    sourceStatus,
    sourceReason: statusEntry?.reason,
    sourceRepo: statusEntry?.repo,
    sourceRef: statusEntry?.ref,
    sourceSha: statusEntry?.sha,
    sourceShaUrl: statusEntry?.shaUrl,
    sourceCheckedAt: statusBySlug[project.slug]
      ? sourceStatuses.checkedAt
      : undefined,
    ledgerClaims: claimsByProduct.get(project.upstreamId) ?? [],
    ledgerImportedAt: evidenceLedger.importedAt,
  };
}

export type HydratedProject = Omit<Project, "sourceStatus"> & {
  /** Authored declarations (`concept`/`historical`) merged with derived reality. */
  sourceStatus: SourceStatus;
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
        completedAt?: string;
        lastSuccessAt?: string;
        greenRunUrl?: string;
        tests?: { total: number; files?: number };
      }
    | undefined;
  sourceReason?: string;
  sourceRepo?: string;
  sourceRef?: string;
  sourceSha?: string;
  sourceShaUrl?: string;
  sourceCheckedAt?: string;
  /** Graded claims for this product from the monorepo's evidence ledger. */
  ledgerClaims: LedgerClaim[];
  ledgerImportedAt?: string;
};

export function ledgerClaimOf(
  project: HydratedProject,
  claimId: string | undefined,
): LedgerClaim | undefined {
  return claimId ? project.ledgerClaims.find((c) => c.id === claimId) : undefined;
}

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

const stageRank: Record<Stage, number> = {
  shipped: 0,
  beta: 1,
  prototype: 2,
  research: 3,
  archived: 4,
};

const allProjects: HydratedProject[] = Object.values(caseStudyModules)
  .map((module) => module.default)
  .filter(isPublished)
  .map(hydrate)
  .sort((a, b) => {
    // Dead sources go to the bottom of every list, whatever their stage says.
    const deadA = a.sourceStatus === "current" ? 0 : 1;
    const deadB = b.sourceStatus === "current" ? 0 : 1;
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
  currentCount: allProjects.filter((p) => p.sourceStatus === "current").length,
  archivedSourceCount: allProjects.filter((p) => p.sourceStatus !== "current").length,
  ciMode: ciFactsFile.mode,
  ciImportedAt: ciFactsFile.importedAt,
  ledgerImportedAt: evidenceLedger.importedAt,
  ledgerClaimCount: evidenceLedger.claims?.length ?? 0,
  sourcesCheckedAt: sourceStatuses.checkedAt,
};

export * from "./schema";
