import type {
  CiFacts,
  Metric,
  Project,
  Stage,
  UpstreamEntry,
  UpstreamSnapshot,
} from "./schema";
import upstreamRaw from "../../../registry/upstream.json";
import ciFactsRaw from "../../../registry/ci-facts.json";

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
const ciFacts = (ciFactsRaw as { facts?: CiFacts }).facts ?? {};

const upstreamById = new Map<string, UpstreamEntry>(
  upstream.entries.map((entry) => [entry.id, entry]),
);

/**
 * A `publish: false` project publishes itself once the monorepo registry
 * promotes it out of `incubating`. This is how Pulse reaches the site: when
 * its upstream lifecycle becomes `active`, the gate opens on the next import.
 */
function isPublished(project: Project): boolean {
  if (project.publish) return true;
  const lifecycle = upstreamById.get(project.upstreamId)?.lifecycle;
  return lifecycle === "active" || lifecycle === "maintenance";
}

/**
 * CI is the better source for a test count than a README that can drift.
 * Where the importer captured a real figure, it replaces the authored one and
 * says so; where it did not, the authored number stands with its own evidence.
 */
function withCiMetrics(project: Project): Metric[] {
  const facts = ciFacts[project.upstreamId];
  const metrics = project.caseStudy.metrics ?? [];
  if (!facts?.tests) return metrics;

  const ciMetric: Metric = {
    label: "Automated tests",
    value: facts.tests.files
      ? `${facts.tests.total} across ${facts.tests.files} files`
      : `${facts.tests.total}`,
    method: `Read from the latest ${facts.workflow} run on main${
      facts.lastSuccessfulRunAt ? ` (${facts.lastSuccessfulRunAt.slice(0, 10)})` : ""
    }.`,
    source: "ci",
    evidence: [
      {
        kind: "ci",
        label: facts.runUrl ? "Workflow run" : facts.workflow,
        href: facts.runUrl ?? facts.workflowUrl,
        path: facts.workflow,
      },
    ],
  };

  // Replace the authored test count rather than showing two of them.
  const rest = metrics.filter((metric) => !/^automated tests$/i.test(metric.label));
  return [ciMetric, ...rest];
}

function hydrate(project: Project) {
  const entry = upstreamById.get(project.upstreamId);
  const facts = ciFacts[project.upstreamId];

  return {
    ...project,
    caseStudy: {
      ...project.caseStudy,
      metrics: withCiMetrics(project),
    },
    upstream: entry
      ? {
          lifecycle: entry.lifecycle,
          lifecycleMeaning: upstream.lifecycleStates[entry.lifecycle] ?? "",
          stack: entry.stack,
          description: entry.description,
          path: entry.path,
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
    registryImportedAt: upstream.importedAt,
  };
}

export type HydratedProject = ReturnType<typeof hydrate>;

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
};

export * from "./schema";
