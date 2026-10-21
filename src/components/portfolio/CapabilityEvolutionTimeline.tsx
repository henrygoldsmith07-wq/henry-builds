import { ArrowRight, BookOpen, Calendar, Cpu, FileCode, GitBranch, Lightbulb, Users } from "lucide-react";
import { projects, registryMeta, demonstratesOf } from "@/data/registry";

/**
 * Capability Evolution Timeline
 * 
 * Visualizes how demonstrated technical capabilities expanded across projects chronologically.
 * Each project marks a milestone in capability acquisition and deployment.
 * Shows not just WHAT was built, but HOW the builder's capabilities evolved through the work.
 */
export function CapabilityEvolutionTimeline() {
  // Sort projects by date (most recent first) based on sourceCheckedAt or import timestamp
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

  // Track capability milestones
  type Milestone = {
    project: typeof projects[0];
    newCapabilities: string[];
    date: string;
  };

  const milestones: Milestone[] = [];
  const acquiredSoFar = new Set<string>();

  sortedProjects.forEach(project => {
    const newCaps = demonstratesOf(project).technical.filter(cap => !acquiredSoFar.has(cap));
    if (newCaps.length > 0) {
      milestones.push({
        project,
        newCapabilities: newCaps,
        date: project.sourceCheckedAt || project.registryImportedAt,
      });
      newCaps.forEach(cap => acquiredSoFar.add(cap));
    }
  });

  // Calculate cumulative capability count over time
  const timelinePoints = milestones.map((m, i) => ({
    index: i,
    date: m.date,
    cumulativeCount: acquiredSoFar.size,
    newCount: m.newCapabilities.length,
  }));

  const totalCapabilities = accumulatedCapabilities(timelinePoints[timelinePoints.length - 1].index);

  function accumulatedCapabilities(endIndex: number): number {
    const seen = new Set<string>();
    for (let i = 0; i <= endIndex; i++) {
      milestones[i]?.newCapabilities.forEach(c => seen.add(c));
    }
    return seen.size;
  }

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="rounded-2xl border border-border bg-border p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Capability Growth</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tracking {totalCapabilities} unique capabilities across {sortedProjects.length} projects
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">First project:</span>
            <span className="font-semibold">{sortedProjects[sortedProjects.length - 1]?.name}</span>
          </div>
        </div>
      </div>

      {/* Cumulative Growth Chart */}
      <div className="rounded-2xl border border-border bg-border p-6">
        <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold tracking-tight">
          <TrendingUp className="size-5 text-foreground/60" aria-hidden="true" />
          Cumulative Capabilities Over Time
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
                    aria-label={`At ${point.date?.slice(0, 10)}, ${point.cumulativeCount} capabilities acquired`}
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
            <span>Milestone 1</span>
            <span>Milestone {milestones.length}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded bg-foreground/70" />
            <span>Cumulative capability count increases</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-3 rounded bg-foreground" />
            <span>Hover for detailed data</span>
          </div>
        </div>
      </div>

      {/* Timeline of Milestones */}
      <div className="space-y-0 overflow-hidden rounded-2xl border border-border bg-border">
        <h3 className="bg-muted px-6 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-foreground/60">
          Capability Acquisition Milestones
        </h3>
        
        <ol className="divide-y divide-border">
          {milestones.map((milestone, i) => (
            <li key={i} className="group">
              <div className="flex items-start gap-4 p-6">
                {/* Connector line */}
                {i < milestones.length - 1 && (
                  <div className="absolute left-[3.5rem] top-12 h-full w-0.5 bg-foreground/10 group-last:hidden" />
                )}
                
                {/* Icon */}
                <div className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full bg-foreground/10 transition-colors group-hover:bg-foreground/20">
                  {milestone.newCapabilities.length === 1 ? (
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
                        href={`/projects/${milestone.project.slug}`}
                        className="inline-flex items-center gap-2 font-semibold hover:underline"
                      >
                        {milestone.project.name}
                        <ArrowRight className="size-3 opacity-50" aria-hidden="true" />
                      </a>
                      {milestone.date && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Verified:{" "}
                          {new Date(milestone.date).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      milestone.newCapabilities.length === 1
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                    }`}>
                      {milestone.newCapabilities.length === 1 ? "New skill" : `${milestone.newCapabilities.length} new capabilities`}
                    </span>
                  </div>

                  {/* New Capabilities */}
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {milestone.newCapabilities.map(cap => (
                      <li key={cap} className="flex items-start gap-2 text-sm">
                        <ArrowRight className="mt-0.5 size-3 text-muted-foreground" aria-hidden="true" />
                        <span className="text-foreground/85">{cap}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Project Tags */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {milestone.project.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="pill">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Current Capability Distribution */}
      <div className="rounded-2xl border border-border bg-border p-6">
        <h3 className="mb-6 text-lg font-semibold tracking-tight">Current Capability Distribution</h3>
        
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
                      {cap.split(" ")[0]}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strategic Insight */}
      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <GitBranch className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          What This Shows
        </h3>
        <p className="mt-3 text-sm leading-6 text-foreground/85">
          Unlike static portfolios that list skills once, this evolution timeline reveals <strong>how capabilities were acquired through actual shipped work</strong>. Each milestone represents real-world deployment pressure that forced capability growth. The cumulative chart demonstrates consistent learning velocity — not just accumulating tools, but integrating them into cohesive systems. For evaluators: this shows someone who learns by building, not by tutorials.
        </p>
      </div>
    </div>
  );
}
