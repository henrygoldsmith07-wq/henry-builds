/**
 * Capability map, derived entirely from the registry.
 *
 * There is no self-rating here. Every capability comes from
 * `demonstratesOf(project).technical`, and every count is derived from the
 * project's own `outcomes` and `allEvidenceOf(project)` pointers. The shading
 * and labels report coverage facts — how many published projects name a
 * capability, and the stage / source state of those projects — never a
 * proficiency score. Remove a project's evidence and the numbers fall with it.
 */

import { useState } from "react";
import { FileCheck2, FolderOpen, Info, Layers, Link2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  allEvidenceOf,
  demonstratesOf,
  projects,
  stageCopy,
  type HydratedProject,
  type SourceState,
  type Stage,
} from "@/data/registry";

/** Only the raw grouping is seeded; every figure is computed afterwards. */
type CapabilitySeed = {
  key: string;
  label: string;
  projectList: HydratedProject[];
};

type CapabilityRow = CapabilitySeed & {
  projectCount: number;
  evidenceCount: number;
  outcomeCount: number;
  stages: Stage[];
  sourceStates: SourceState[];
  categories: string[];
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Count each project's attachments once, then reuse them for every capability
// that project demonstrates. A capability's evidence figure is therefore the
// pointers attached to the projects that name it — not an invented per-skill
// score.
const evidenceBySlug = new Map<string, number>();
const outcomesBySlug = new Map<string, number>();
for (const project of projects) {
  evidenceBySlug.set(project.slug, allEvidenceOf(project).length);
  outcomesBySlug.set(project.slug, project.caseStudy.outcomes.length);
}

const capabilityMap = new Map<string, CapabilitySeed>();
for (const project of projects) {
  // Deduplicate a capability named twice on the same project.
  const keys = new Map<string, string>();
  for (const raw of demonstratesOf(project).technical) {
    const label = raw.trim();
    const key = label.toLowerCase();
    if (key) keys.set(key, label);
  }
  for (const [key, label] of keys) {
    let seed = capabilityMap.get(key);
    if (!seed) {
      seed = { key, label, projectList: [] };
      capabilityMap.set(key, seed);
    }
    seed.projectList.push(project);
  }
}

const CAPABILITIES: CapabilityRow[] = Array.from(capabilityMap.values())
  .map((row) => ({
    ...row,
    projectCount: row.projectList.length,
    evidenceCount: row.projectList.reduce(
      (n, p) => n + (evidenceBySlug.get(p.slug) ?? 0),
      0,
    ),
    outcomeCount: row.projectList.reduce(
      (n, p) => n + (outcomesBySlug.get(p.slug) ?? 0),
      0,
    ),
    stages: Array.from(new Set(row.projectList.map((p) => p.stage))),
    sourceStates: Array.from(new Set(row.projectList.map((p) => p.sourceState))),
    categories: Array.from(new Set(row.projectList.map((p) => p.category))),
  }))
  .sort((a, b) => b.projectCount - a.projectCount || a.label.localeCompare(b.label));

const DISTINCT_CAPABILITIES = CAPABILITIES.length;
const PROJECTS_COVERED = new Set(
  CAPABILITIES.flatMap((c) => c.projectList.map((p) => p.slug)),
).size;
const EVIDENCE_POINTERS = projects.reduce(
  (n, p) => n + (evidenceBySlug.get(p.slug) ?? 0),
  0,
);

const CATEGORY_OPTIONS = Array.from(
  CAPABILITIES.reduce((map, c) => {
    for (const cat of c.categories) map.set(cat, (map.get(cat) ?? 0) + 1);
    return map;
  }, new Map<string, number>()),
  ([id, count]) => ({ id, label: id, count }),
).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

/** Colour marks a project's registered stage, never a proficiency level. */
const stageDot: Record<Stage, string> = {
  research: "bg-violet-500",
  prototype: "bg-sky-500",
  beta: "bg-amber-500",
  shipped: "bg-emerald-500",
  archived: "bg-zinc-500",
};

export function SkillsHeatmap() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filtered = selectedCategory === "all"
    ? CAPABILITIES
    : CAPABILITIES.filter((c) => c.categories.includes(selectedCategory));

  return (
    <div className="space-y-6">
      {/* Derivation note: say exactly where the numbers come from. */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          Every capability below is read from <code>demonstrates.technical</code> in
          the case studies, and every count comes from that project&apos;s outcomes
          and evidence pointers. Shading marks how many published projects name a
          capability, and colour marks project stage. These are coverage counts,
          not proficiency scores or ratings.
        </p>
      </div>

      {/* Headline figures — all honest counts, no percentages or averages. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-6">
          <p className="eyebrow flex items-center gap-2">
            <Layers className="size-3.5" aria-hidden="true" />
            Distinct capabilities
          </p>
          <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] tabular-nums">
            {DISTINCT_CAPABILITIES}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Unique entries in demonstrated technical capabilities across published case studies.
          </p>
        </Card>
        <Card className="p-6">
          <p className="eyebrow flex items-center gap-2">
            <FolderOpen className="size-3.5" aria-hidden="true" />
            Projects covered
          </p>
          <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] tabular-nums">
            {PROJECTS_COVERED}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Published case studies that name at least one technical capability.
          </p>
        </Card>
        <Card className="p-6">
          <p className="eyebrow flex items-center gap-2">
            <Link2 className="size-3.5" aria-hidden="true" />
            Evidence pointers
          </p>
          <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] tabular-nums">
            {EVIDENCE_POINTERS}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Pointers attached to these case studies — outcomes, metrics, architecture and more.
          </p>
        </Card>
      </div>

      {/* Category filters — real project categories, no invented taxonomy. */}
      <div className="flex flex-wrap gap-2">
        <button
          key="all"
          type="button"
          aria-pressed={selectedCategory === "all"}
          onClick={() => setSelectedCategory("all")}
          className={`rounded-lg px-4 py-2 text-sm transition-colors ${
            selectedCategory === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          All ({DISTINCT_CAPABILITIES})
        </button>
        {CATEGORY_OPTIONS.map((cat) => (
          <button
            key={cat.id}
            type="button"
            aria-pressed={selectedCategory === cat.id}
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

      {/* Capability grid */}
      <TooltipProvider>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cap) => {
            const primaryStage = cap.stages[0];
            const heat = cap.projectCount >= 3
              ? "border-primary/40 bg-primary/5"
              : cap.projectCount === 2
                ? "border-primary/25"
                : "border-border bg-background";

            return (
              <Tooltip key={cap.key}>
                <TooltipTrigger asChild>
                  <Card
                    tabIndex={0}
                    className={`relative overflow-hidden p-4 transition-shadow hover:shadow-md ${heat}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2.5 shrink-0 rounded-full ${stageDot[primaryStage]}`}
                            aria-hidden="true"
                          />
                          <span className="text-xs font-medium text-muted-foreground">
                            {stageCopy[primaryStage].label}
                          </span>
                        </div>
                        <h4 className="mt-2 text-sm font-semibold leading-snug tracking-tight">
                          {cap.label}
                        </h4>
                      </div>
                      <Badge variant="secondary" className="shrink-0 tabular-nums">
                        ×{cap.projectCount}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Link2 className="size-3.5" aria-hidden="true" />
                        {plural(cap.evidenceCount, "evidence pointer")}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <FileCheck2 className="size-3.5" aria-hidden="true" />
                        {plural(cap.outcomeCount, "outcome")}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {cap.projectList.map((project) => (
                        <Badge key={project.slug} variant="outline" className="text-xs">
                          {project.name}
                        </Badge>
                      ))}
                    </div>

                    <p className="mt-3 text-xs text-muted-foreground">
                      {cap.sourceStates
                        .map((state) => state.replace(/-/g, " "))
                        .join(" · ")}
                    </p>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs space-y-1">
                    <p className="font-semibold">{cap.label}</p>
                    <p>
                      Demonstrated in {plural(cap.projectCount, "project")}: {" "}
                      {cap.projectList.map((p) => p.name).join(", ")}
                    </p>
                    <p>
                      {plural(cap.evidenceCount, "evidence pointer")} and {" "}
                      {plural(cap.outcomeCount, "outcome")} attached to those projects.
                    </p>
                    <p>
                      Stages: {cap.stages.map((s) => stageCopy[s].label).join(", ")}
                    </p>
                    <p>Shading shows project coverage, not proficiency.</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span>Colour = project stage</span>
        {(Object.keys(stageCopy) as Stage[]).map((stage) => (
          <span key={stage} className="inline-flex items-center gap-2">
            <span className={`size-3 rounded-full ${stageDot[stage]}`} aria-hidden="true" />
            {stageCopy[stage].label}
          </span>
        ))}
        <span>× projects = how many published case studies name the capability</span>
      </div>
    </div>
  );
}
