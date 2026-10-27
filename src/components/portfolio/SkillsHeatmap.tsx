/**
 * Interactive Skills Heatmap Visualization
 *
 * Every row below is counted from the registry at load time rather than
 * hand-typed: `proficiency` is how many published case studies demonstrate the
 * skill, `evidenceCount` is the number of evidence pointers behind those
 * demonstrations, and `projects` is the slug list the numbers were counted
 * from. The previous hand-authored table drifted — it claimed proficiency
 * levels and evidence counts nothing in the registry supported, which is
 * exactly the kind of unbacked number this site exists to refuse.
 */

import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { projects, demonstratesOf, allEvidenceOf } from "@/data/registry";
import type { HydratedProject } from "@/data/registry";

interface SkillMetric {
  name: string;
  category: "technical" | "process" | "domain";
  /** 0-100: the share of published projects whose registry entry cites this skill. */
  proficiency: number;
  /** Evidence pointers across the projects that cite this skill. */
  evidenceCount: number;
  projects: string[];
}

/**
 * Skill vocabulary, in display order. The names are matched case-insensitively
 * against a project's `demonstrates.technical` entries (falling back to tags),
 * so renaming a skill here without renaming it in a case study shows up as a
 * zero instead of silently keeping an invented score.
 */
const SKILL_TERMS: { name: string; category: SkillMetric["category"]; match: RegExp }[] = [
  { name: "TypeScript/JavaScript", category: "technical", match: /typescript|javascript/i },
  { name: "React Ecosystem", category: "technical", match: /react|radix|hook form|tailwind/i },
  { name: "Performance Optimization", category: "technical", match: /performance|bundle|latency|optimi[sz]ation/i },
  { name: "Accessibility Engineering", category: "technical", match: /accessib|a11y|wcag|aria/i },
  { name: "Offline-First Architecture", category: "technical", match: /offline|pwa|service worker|local-first/i },
  { name: "Data Visualization", category: "technical", match: /visuali[sz]ation|chart|graph|recharts|d3/i },
  { name: "CI/CD Pipelines", category: "process", match: /\bci\b|continuous integration|workflow|pipeline/i },
  { name: "Testing & Validation", category: "process", match: /test|playwright|vitest|regression/i },
  { name: "Evidence-Based Development", category: "process", match: /evidence|verif|audit|provenance/i },
  { name: "Registry Architecture", category: "process", match: /registry|schema|importer|provenance/i },
  { name: "Statistical Analysis", category: "domain", match: /statistic|benchmark|percentile|distribution/i },
  { name: "Personal Analytics", category: "domain", match: /personal analytics|telemetry|tracking|habit/i },
  { name: "Learning Systems", category: "domain", match: /learning|tutor|spaced repetition|curriculum/i },
  { name: "AI/ML Integration", category: "domain", match: /\bai\b|\bml\b|llm|model|inference/i },
];

/** Which projects demonstrate a skill, and how much evidence stands behind it. */
function countSkill(term: { name: string; match: RegExp }, bySlug: Map<string, HydratedProject>): SkillMetric {
  const matches = projects.filter((project) => {
    const demonstrates = demonstratesOf(project);
    const haystack = [...demonstrates.technical, ...project.tags].join(" · ");
    return term.match.test(haystack);
  });

  const evidenceCount = matches.reduce(
    (sum, project) => sum + allEvidenceOf(project).length,
    0,
  );

  const published = bySlug.size || 1;
  return {
    name: term.name,
    category: term.category,
    proficiency: Math.round((matches.length / published) * 100),
    evidenceCount,
    projects: matches.map((project) => project.slug),
  };
}

const SKILL_METRICS: SkillMetric[] = (() => {
  // Computed once at module scope from the published registry, so the numbers
  // can never disagree with the case studies they describe.
  const bySlug = new Map(projects.map((project) => [project.slug, project]));
  return SKILL_TERMS.map((term) => countSkill(term, bySlug));
})();

export function SkillsHeatmap() {
  const [selectedCategory, setSelectedCategory] = useState<"all" | "technical" | "process" | "domain">("all");

  const filteredSkills = useMemo(
    () =>
      selectedCategory === "all"
        ? SKILL_METRICS
        : SKILL_METRICS.filter((s) => s.category === selectedCategory),
    [selectedCategory],
  );

  const categories: { id: typeof selectedCategory; label: string; count: number }[] = [
    { id: "all", label: "All", count: SKILL_METRICS.length },
    { id: "technical", label: "Technical", count: SKILL_METRICS.filter(s => s.category === "technical").length },
    { id: "process", label: "Process", count: SKILL_METRICS.filter(s => s.category === "process").length },
    { id: "domain", label: "Domain", count: SKILL_METRICS.filter(s => s.category === "domain").length },
  ];

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 text-center">
          <p className="text-sm font-medium text-muted-foreground">Total Skills Tracked</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{SKILL_METRICS.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm font-medium text-muted-foreground">Average Proficiency</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-primary">
            {Math.round(SKILL_METRICS.reduce((sum, s) => sum + s.proficiency, 0) / SKILL_METRICS.length)}%
          </p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm font-medium text-muted-foreground">Total Evidence Points</p>
          <p className="mt-1 text-3xl font-bold tracking-tint">{SKILL_METRICS.reduce((sum, s) => sum + s.evidenceCount, 0)}</p>
        </Card>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${
              selectedCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat.label} ({cat.count})
          </button>
        ))}
      </div>

      {/* Heatmap Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSkills.map((skill) => {
          const intensity = Math.min(100, skill.proficiency);
          const isHigh = intensity >= 90;
          const isMedium = intensity >= 75 && intensity < 90;

          return (
            <TooltipProvider key={skill.name}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card
                    className={`relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg ${
                      isHigh ? "border-green-500/30 bg-green-500/5" :
                      isMedium ? "border-yellow-500/30 bg-yellow-500/5" :
                      "border-border bg-background"
                    }`}
                  >
                    {/* Intensity Background Gradient */}
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{
                        background: `linear-gradient(135deg, ${
                          isHigh ? "#22c55e" : isMedium ? "#eab308" : "#94a3b8"
                        } 0%, transparent 100%)`
                      }}
                    />

                    <div className="relative p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold leading-tight">{skill.name}</h4>

                          {/* Coverage bar: the share of published projects citing this skill */}
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${
                                isHigh ? "bg-green-500" : isMedium ? "bg-yellow-500" : "bg-blue-500"
                              }`}
                              style={{ width: `${intensity}%` }}
                            />
                          </div>

                          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{skill.proficiency}% of projects</span>
                            <span>{skill.evidenceCount} evidence pointers</span>
                          </div>
                        </div>

                        {/* Trend Indicator */}
                        {skill.proficiency >= 75 && (
                          <TrendingUp className="size-4 shrink-0 text-green-500" aria-hidden="true" />
                        )}
                      </div>

                      {/* Projects Tag */}
                      {skill.projects.slice(0, 3).map(project => (
                        <Badge key={project} variant="secondary" className="mt-3 text-xs">
                          {project}
                        </Badge>
                      ))}
                      {skill.projects.length > 3 && (
                        <span className="ml-1 text-xs text-muted-foreground">+{skill.projects.length - 3} more</span>
                      )}
                    </div>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs">
                    <p className="font-semibold">{skill.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Cited by {skill.projects.length} of {projects.length} published projects
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {skill.evidenceCount} evidence pointers behind those demonstrations
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-green-500" />
          <span className="text-muted-foreground">Widely demonstrated (90%+ of projects)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-yellow-500" />
          <span className="text-muted-foreground">Recurring (75–89%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Focused (&lt;75%)</span>
        </div>
      </div>
    </div>
  );
}
