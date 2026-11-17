import { ArrowRight, FileCode, GitBranch, Lightbulb, TrendingUp } from "lucide-react";
import { projects, demonstratesOf } from "@/data/registry";

/**
 * Capability Coverage Timeline
 *
 * Reports the distinct technical capabilities demonstrated across published
 * projects. Projects are walked in registry check/import order and the running
 * total counts the capabilities seen so far. This is coverage, not a chronology
 * of learning: the ordering comes from importer timestamps, not from when any
 * capability was acquired, so it supports no claim about the rate or timing of
 * learning.
 */
export function CapabilityEvolutionTimeline() {
  // Walk projects in registry check/import order (most recent check/import
  // first). These are importer timestamps, not dates when work happened.
  const sortedProjects = [...projects]
    .sort((a, b) => {
      const dateA = a.sourceCheckedAt || a.registryImportedAt;
      const dateB = b.sourceCheckedAt || b.registryImportedAt;
      return new Date(dateB!).getTime() - new Date(dateA!).getTime();
    });

  // Extract all unique capabilities across all projects
  const allCapabilities = new Set<string>();
  sortedProjects.forEach(project => {
    demonstratesOf(project).technical.forEach(cap => allCapabilities.add(cap));
  });
  const capabilityList = Array.from(allCapabilities).sort();

  // Group capabilities by category for display
  const capabilityCategories: Record<string, string[]> = {
    "Architecture & Systems": [
      "Offline-first architecture", "PWA development", "Type safety patterns",
      "State management", "Performance optimization", "Accessibility engineering",
      "CI/CD implementation", "Monorepo patterns"
    ],
    "Frontend & UI": [
      "React 19", "Vite", "Tailwind CSS 4", "Radix UI Primitives",
      "SVG graphics", "WebGL rendering", "Responsive design", "CSS custom properties",
      "Animation systems"
    ],
    "Backend & Data": [
      "TypeScript", "Node.js", "PostgreSQL", "Docker containerization",
      "API design", "Database modeling", "Data validation schemas", "Batch processing"
    ],
    "AI & Intelligence": [
      "Machine learning integration", "Claude API orchestration", "Agent-based workflows",
      "RAG systems", "Structured output generation"
    ],
    "Developer Experience": [
      "Testing frameworks", "Playwright E2E", "Lighthouse CI", "TypeScript configuration",
      "Build tooling", "Component libraries"
    ],
    "Domain Expertise": [
      "Statistical analysis", "Health informatics", "Fitness tracking", "Natural language processing",
      "Educational technology", "Personal analytics"
    ]
  };

  // Per-project coverage snapshot: capabilities first seen at this point in the
  // check/import ordering, plus the running total as it stood here.
  type CoverageSnapshot = {
    project: typeof projects[0];
    newCapabilities: string[];
    date: string;
    cumulativeCount: number;
  };

  const coverageByProject: CoverageSnapshot[] = [];
  const acquiredSoFar = new Set<string>();

  sortedProjects.forEach(project => {
    const newCaps = demonstratesOf(project).technical.filter(cap => !acquiredSoFar.has(cap));
    if (newCaps.length > 0) {
      // Add this project's capabilities to the running set *before* snapshotting
      // its size, so each point records the total as it stood at that project.
      // Previously the set was only fully populated after all snapshots existed,
      // which made every point read the same final number and flattened the chart.
      newCaps.forEach(cap => acquiredSoFar.add(cap));
      coverageByProject.push({
        project,
        newCapabilities: newCaps,
        date: project.sourceCheckedAt || project.registryImportedAt,
        cumulativeCount: acquiredSoFar.size,
      });
    }
  });

  // Cumulative count is baked into each snapshot at its point in the ordering.
  const timelinePoints = coverageByProject.map((m, i) => ({
    index: i,
    date: m.date,
    projectName: m.project.name,
    cumulativeCount: m.cumulativeCount,
    newCount: m.newCapabilities.length,
  }));

  // Running set size at the last snapshot; 0 when there are none.
  const totalCapabilities = timelinePoints[timelinePoints.length - 1]?.cumulativeCount ?? 0;

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="rounded-2xl border border-border bg-border p-6">
        <h2 className="text-2xl font-bold tracking-tight">Capability Coverage</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tracking {totalCapabilities} unique capabilities demonstrated across {sortedProjects.length} projects
        </p>
        <p className="mt-4 max-w-3xl border-l-2 border-border pl-4 text-xs leading-5 text-muted-foreground">
          Ordering follows each project&apos;s last registry check/import date, not a
          project timeline. It reflects when records were checked or imported,
          not when work happened or when a capability was learned.
        </p>
      </div>

      {/* Cumulative Coverage Chart */}
      <div className="rounded-2xl border border-border bg-border p-6">
        <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold tracking-tight">
          <TrendingUp className="size-5 text-foreground/60" aria-hidden="true" />
          Cumulative Capability Coverage by Project
        </h3>

        <div className="relative h-64 w-full">
          {/* Simple ASCII-style visualization since we can't use external chart libs */}
          <div className="flex h-full items-end gap-4 pb-8">
            {timelinePoints.map((point, i) => {
              const heightPercent = (point.cumulativeCount / totalCapabilities) * 100;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t bg-foreground/70 transition-all hover:bg-foreground"
                    style={{ height: `${heightPercent}%` }}
                    role="img"
                    aria-label={`${point.projectName}: ${point.cumulativeCount} distinct capabilities covered up to this point in registry check/import order`}
                  />
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">{point.index + 1}</p>
                    <p className="text-xs font-semibold">{point.cumulativeCount}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-axis labels */}
          <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-[10px] text-muted-foreground">
            <span>Project 1</span>
            <span>Project {coverageByProject.length}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded bg-foreground/70" />
            <span>Running count of distinct capabilities covered</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-3 rounded bg-foreground" />
            <span>Hover for per-project detail</span>
          </div>
        </div>
      </div>

      {/* Project-by-project capability coverage */}
      <div className="space-y-0 overflow-hidden rounded-2xl border border-border bg-border">
        <h3 className="bg-muted px-6 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-foreground/60">
          Capability Coverage by Project
        </h3>

        <ol className="divide-y divide-border">
          {coverageByProject.map((snapshot, i) => (
            <li key={i} className="group">
              <div className="flex items-start gap-4 p-6">
                {/* Connector line */}
                {i < coverageByProject.length - 1 && (
                  <div className="absolute left-[3.5rem] top-12 h-full w-0.5 bg-foreground/10 group-last:hidden" />
                )}

                {/* Icon */}
                <div className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full bg-foreground/10 transition-colors group-hover:bg-foreground/20">
                  {snapshot.newCapabilities.length === 1 ? (
                    <Lightbulb className="size-5" aria-hidden="true" />
                  ) : (
                    <FileCode className="size-5" aria-hidden="true" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <a
                        href={`/projects/${snapshot.project.slug}`}
                        className="inline-flex items-center gap-2 font-semibold hover:underline"
                      >
                        {snapshot.project.name}
                        <ArrowRight className="size-3 opacity-50" aria-hidden="true" />
                      </a>
                      {snapshot.date && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Last checked/imported:{" "}
                          {new Date(snapshot.date).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                    <span
                      title="First counted at this point in registry check/import order"
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        snapshot.newCapabilities.length === 1
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                      }`}
                    >
                      {snapshot.newCapabilities.length === 1
                        ? "1 capability"
                        : `${snapshot.newCapabilities.length} capabilities`}
                    </span>
                  </div>

                  {/* Capabilities first counted for this project */}
                  <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Capabilities first counted here
                  </p>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {snapshot.newCapabilities.map(cap => (
                      <li key={cap} className="flex items-start gap-2 text-sm">
                        <ArrowRight className="mt-0.5 size-3 text-muted-foreground" aria-hidden="true" />
                        <span className="text-foreground/85">{cap}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Project Tags */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {snapshot.project.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="pill">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Capability Distribution */}
      <div className="rounded-2xl border border-border bg-border p-6">
        <h3 className="mb-6 text-lg font-semibold tracking-tight">Capability Distribution by Category</h3>

        <div className="space-y-4">
          {Object.entries(capabilityCategories).map(([category, caps]) => {
            const shown = caps.filter(cap => capabilityList.includes(cap)).length;
            if (shown === 0) return null;

            return (
              <div key={category}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{category}</p>
                  <p className="text-sm text-muted-foreground">{shown}/{caps.length}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {caps.filter(cap => capabilityList.includes(cap)).map(cap => (
                    <span
                      key={cap}
                      className="rounded bg-foreground/5 px-2 py-0.5 text-xs font-medium text-foreground/70"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* How to read this */}
      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <GitBranch className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          How to Read This
        </h3>
        <p className="mt-3 text-sm leading-6 text-foreground/85">
          This view reports capability coverage across the published case studies. Every
          capability shown is declared in a project&apos;s demonstrates block, and the running
          total simply counts distinct capabilities as projects are walked in registry
          check/import order. Because that total is cumulative by construction, the bars
          rise monotonically and say nothing about how quickly any capability was learned.
          Ordering comes from the last registry check/import date, not from when work
          happened. For evaluators: this is a breadth-of-coverage view, with its ordering
          and limits stated rather than implied.
        </p>
      </div>
    </div>
  );
}
