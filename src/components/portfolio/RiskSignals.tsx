import { useState } from "react";
import { Link } from "react-router";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  FRESH_CLAIM_WINDOW_DAYS,
  daysSinceVerified,
  hasCarriedCi,
  hasRedCi,
  projects,
  type HydratedProject,
} from "@/data/registry";

/**
 * Plain-language risk signals, derived only from facts the registry already
 * publishes. The previous version scored seven "risk dimensions" including
 * "Dependency Risk" and "Data Persistence" from tag-name guesses and an assumed
 * complexity of 65. Those numbers could not be checked, so they are gone.
 */

function signalsFor(project: HydratedProject): string[] {
  const signals: string[] = [];

  if (hasRedCi(project)) signals.push("The newest CI run failed.");
  if (hasCarriedCi(project)) signals.push("The CI fact was carried forward from an earlier import.");

  const age = daysSinceVerified(project);
  if (age !== null && age > FRESH_CLAIM_WINDOW_DAYS) {
    signals.push(`The last human verification was ${age} days ago.`);
  }
  if (age === null) signals.push("No human verification date is recorded.");

  if (project.sourceState !== "current-source") {
    signals.push(`Source state is ${project.sourceState}, not a current source.`);
  }
  if (!project.caseStudy.visuals.some((visual) => visual.kind === "screenshot")) {
    signals.push("No current product screenshot is attached.");
  }

  return signals;
}

export function RiskSignals() {
  const [slug, setSlug] = useState(projects[0]?.slug ?? "");
  const assessed = projects.map((project) => ({
    project,
    signals: signalsFor(project),
  }));
  const selected = assessed.find((entry) => entry.project.slug === slug) ?? assessed[0];
  const withSignals = assessed.filter((entry) => entry.signals.length > 0).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-background p-8">
        <h2 className="text-2xl font-bold tracking-tight">Risk signals</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          {withSignals} of {projects.length} projects have at least one signal.
          Each signal is a fact already shown on the case study — a failed CI
          run, a stale verification date, a missing source or no current
          screenshot. There is no score: the facts are the point.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="rounded-xl border border-border bg-background p-4">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Select a project
          </h3>
          <div className="space-y-1">
            {assessed.map(({ project, signals }) => (
              <button
                key={project.slug}
                type="button"
                aria-pressed={selected?.project.slug === project.slug}
                onClick={() => setSlug(project.slug)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                  selected?.project.slug === project.slug
                    ? "bg-foreground/10"
                    : "hover:bg-foreground/5"
                }`}
              >
                <span className="truncate font-medium">{project.name}</span>
                {signals.length === 0 ? (
                  <CheckCircle2 className="size-4 text-emerald-600" aria-label="No signals" />
                ) : (
                  <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    {signals.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {selected && (
          <div className="space-y-4 rounded-2xl border border-border bg-background p-6">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">
                {selected.project.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {selected.project.stage} ·{" "}
                <Link to={`/projects/${selected.project.slug}`} className="underline">
                  Open case study
                </Link>
              </p>
            </div>
            {selected.signals.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                No risk signals from the facts this site publishes.
              </p>
            ) : (
              <ul className="space-y-3">
                {selected.signals.map((signal) => (
                  <li key={signal} className="flex items-start gap-3 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
                    {signal}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
