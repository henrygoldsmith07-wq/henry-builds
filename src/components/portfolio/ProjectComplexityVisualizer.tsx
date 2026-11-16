import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { projects } from "@/data/registry";

/**
 * Case-study shape, without invented scores.
 *
 * This tab used to turn tag names and guessed complexity into 0-100 numbers
 * ("architecture complexity", "innovation factor"). The formulas were
 * arbitrary and one of them spread a boolean into an array, which threw on
 * render and took the whole tab down. Everything below is a count of fields
 * that actually exist in a case study, so a reader can open the study and
 * check each cell.
 */

interface ProjectShape {
  slug: string;
  name: string;
  stage: string;
  outcomes: number;
  evidenced: number;
  limitations: number;
  tradeoffs: number;
  failedApproaches: number;
  layers: number;
}

const shapes: ProjectShape[] = projects
  .map((project) => {
    const study = project.caseStudy;
    return {
      slug: project.slug,
      name: project.name,
      stage: project.stage,
      outcomes: study.outcomes.length,
      evidenced: study.outcomes.filter((outcome) => outcome.evidence.length > 0).length,
      limitations: study.limitations.length,
      tradeoffs: study.tradeoffs.length,
      failedApproaches: study.failedApproaches.length,
      layers: study.architecture?.layers.length ?? 0,
    };
  })
  .sort((a, b) => b.evidenced - a.evidenced);

export function ProjectComplexityVisualizer() {
  const totals = shapes.reduce(
    (sum, shape) => ({
      outcomes: sum.outcomes + shape.outcomes,
      evidenced: sum.evidenced + shape.evidenced,
      limitations: sum.limitations + shape.limitations,
    }),
    { outcomes: 0, evidenced: 0, limitations: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-background p-8">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight">Case-study shape</h2>
          <Badge variant="outline">{shapes.length} projects</Badge>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Counts taken directly from the case studies. There is no composite
          score here: a number is only shown when it is a count of something an
          author wrote down and a reader can open.
        </p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <dt className="text-sm text-muted-foreground">Outcomes stated</dt>
            <dd className="mt-1 text-2xl font-bold">{totals.outcomes}</dd>
          </Card>
          <Card className="p-4">
            <dt className="text-sm text-muted-foreground">Outcomes with evidence</dt>
            <dd className="mt-1 text-2xl font-bold">{totals.evidenced}</dd>
          </Card>
          <Card className="p-4">
            <dt className="text-sm text-muted-foreground">Stated limitations</dt>
            <dd className="mt-1 text-2xl font-bold">{totals.limitations}</dd>
          </Card>
        </dl>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-border bg-foreground/5 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Outcomes</th>
              <th className="px-4 py-3">Evidenced</th>
              <th className="px-4 py-3">Limits</th>
              <th className="px-4 py-3">Trade-offs</th>
              <th className="px-4 py-3">Dead ends</th>
              <th className="px-4 py-3">Layers</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shapes.map((shape) => (
              <tr key={shape.slug} className="align-top">
                <td className="px-4 py-3">
                  <Link to={`/projects/${shape.slug}`} className="font-medium underline">
                    {shape.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{shape.stage}</td>
                <td className="px-4 py-3">{shape.outcomes}</td>
                <td className="px-4 py-3">{shape.evidenced}</td>
                <td className="px-4 py-3">{shape.limitations}</td>
                <td className="px-4 py-3">{shape.tradeoffs}</td>
                <td className="px-4 py-3">{shape.failedApproaches}</td>
                <td className="px-4 py-3">{shape.layers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted-foreground">
        A low count can mean a thinner case study, not a weaker product. Open a
        study and read what is actually claimed before drawing a conclusion.
      </p>
    </div>
  );
}
