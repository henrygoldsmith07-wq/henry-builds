import { Link } from "react-router";
import {
  FRESH_CLAIM_WINDOW_DAYS,
  allEvidenceOf,
  daysSinceVerified,
  demonstratesOf,
  hasCarriedCi,
  hasRedCi,
  projects,
} from "@/data/registry";

/**
 * The inputs behind the proof summary, shown without a verdict.
 *
 * An earlier version of this tab awarded a 0-100 "technical competence" score
 * and a "Strong Hire / Hire / Consider" recommendation. Those numbers were not
 * measurements: several were constants with comments like "Assumed moderate".
 * This view keeps only facts the registry already publishes, so a reader can
 * check each cell and reach the case study behind it.
 */

function ciLabel(project: (typeof projects)[number]): string {
  if (!project.ci) return "No CI fact imported";
  if (hasCarriedCi(project)) return `Carried forward: ${project.ci.conclusion ?? "unknown"}`;
  if (hasRedCi(project)) return `Newest run red (last green: ${project.ci.lastVerifiedAt ?? "none"})`;
  return project.ci.conclusion ?? "Unknown";
}

function ageLabel(project: (typeof projects)[number]): string {
  const age = daysSinceVerified(project);
  if (age === null) return "No verification date";
  if (age > FRESH_CLAIM_WINDOW_DAYS) return `${age} days ago — stale`;
  return `${age} days ago`;
}

export function EvidenceReview() {
  const evidenceCount = projects.reduce(
    (total, project) => total + allEvidenceOf(project).length,
    0,
  );
  const capabilityCount = new Set(
    projects.flatMap((project) => demonstratesOf(project).technical),
  ).size;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-background p-8">
        <h2 className="text-2xl font-bold tracking-tight">Evidence review</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          The raw inputs the site already publishes. No composite score is shown:
          none of these facts has an agreed weighting, so adding one would be an
          opinion wearing a number. Every row links to the case study where the
          underlying fact is displayed.
        </p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border p-4">
            <dt className="text-sm text-muted-foreground">Projects</dt>
            <dd className="mt-1 text-2xl font-bold">{projects.length}</dd>
          </div>
          <div className="rounded-xl border border-border p-4">
            <dt className="text-sm text-muted-foreground">Evidence items</dt>
            <dd className="mt-1 text-2xl font-bold">{evidenceCount}</dd>
          </div>
          <div className="rounded-xl border border-border p-4">
            <dt className="text-sm text-muted-foreground">Distinct capabilities</dt>
            <dd className="mt-1 text-2xl font-bold">{capabilityCount}</dd>
          </div>
        </dl>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-border bg-foreground/5 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">CI</th>
              <th className="px-4 py-3">Last verified</th>
              <th className="px-4 py-3">Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {projects.map((project) => (
              <tr key={project.slug} className="align-top">
                <td className="px-4 py-3">
                  <Link to={`/projects/${project.slug}`} className="font-medium underline">
                    {project.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{project.stage}</td>
                <td className="px-4 py-3">{project.sourceState}</td>
                <td className="px-4 py-3">{ciLabel(project)}</td>
                <td className="px-4 py-3">{ageLabel(project)}</td>
                <td className="px-4 py-3">{allEvidenceOf(project).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
