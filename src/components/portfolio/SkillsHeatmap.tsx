/**
 * Interactive Skills Heatmap Visualization
 * 
 * Displays portfolio capabilities as an interactive heatmap showing:
 * - Technical depth (proficiency levels)
 * - Project application frequency
 * - Evidence strength per skill
 * - Comparative positioning
 */

import { useState } from "react";
import { Info, TrendingUp, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface SkillMetric {
  name: string;
  category: "technical" | "process" | "domain";
  proficiency: number; // 0-100
  evidenceCount: number;
  projects: string[];
  trend: "up" | "stable" | "down";
  trendValue: number;
}

const SKILL_METRICS: SkillMetric[] = [
  {
    name: "TypeScript/JavaScript",
    category: "technical",
    proficiency: 95,
    evidenceCount: 47,
    projects: ["arise", "pulse", "rapport", "reflect", "revise"],
    trend: "up",
    trendValue: 12
  },
  {
    name: "React Ecosystem",
    category: "technical",
    proficiency: 92,
    evidenceCount: 53,
    projects: ["all"],
    trend: "stable",
    trendValue: 2
  },
  {
    name: "Performance Optimization",
    category: "technical",
    proficiency: 88,
    evidenceCount: 23,
    projects: ["arise", "rtk", "forq"],
    trend: "up",
    trendValue: 8
  },
  {
    name: "Accessibility Engineering",
    category: "technical",
    proficiency: 94,
    evidenceCount: 31,
    projects: ["all"],
    trend: "up",
    trendValue: 15
  },
  {
    name: "Offline-First Architecture",
    category: "technical",
    proficiency: 87,
    evidenceCount: 18,
    projects: ["arise", "daily-debate"],
    trend: "up",
    trendValue: 20
  },
  {
    name: "Data Visualization",
    category: "technical",
    proficiency: 85,
    evidenceCount: 27,
    projects: ["pulse", "world-news"],
    trend: "stable",
    trendValue: 3
  },
  {
    name: "CI/CD Pipelines",
    category: "process",
    proficiency: 91,
    evidenceCount: 38,
    projects: ["all"],
    trend: "stable",
    trendValue: 1
  },
  {
    name: "Testing & Validation",
    category: "process",
    proficiency: 93,
    evidenceCount: 42,
    projects: ["all"],
    trend: "up",
    trendValue: 18
  },
  {
    name: "Evidence-Based Development",
    category: "process",
    proficiency: 96,
    evidenceCount: 67,
    projects: ["all"],
    trend: "up",
    trendValue: 25
  },
  {
    name: "Registry Architecture",
    category: "process",
    proficiency: 89,
    evidenceCount: 15,
    projects: ["arise", "pulse"],
    trend: "up",
    trendValue: 10
  },
  {
    name: "Statistical Analysis",
    category: "domain",
    proficiency: 84,
    evidenceCount: 21,
    projects: ["pulse", "report"],
    trend: "stable",
    trendValue: 4
  },
  {
    name: "Personal Analytics",
    category: "domain",
    proficiency: 92,
    evidenceCount: 29,
    projects: ["pulse", "reflect"],
    trend: "up",
    trendValue: 14
  },
  {
    name: "Learning Systems",
    category: "domain",
    proficiency: 86,
    evidenceCount: 24,
    projects: ["le-studio-french", "habit-tracker"],
    trend: "stable",
    trendValue: 5
  },
  {
    name: "AI/ML Integration",
    category: "domain",
    proficiency: 78,
    evidenceCount: 12,
    projects: ["daily-debate", "rapport"],
    trend: "up",
    trendValue: 30
  }
];

export function SkillsHeatmap() {
  const [selectedCategory, setSelectedCategory] = useState<"all" | "technical" | "process" | "domain">("all");
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

  const filteredSkills = selectedCategory === "all" 
    ? SKILL_METRICS 
    : SKILL_METRICS.filter(s => s.category === selectedCategory);

  const categories = [
    { id: "all", label: "All", count: SKILL_METRICS.length },
    { id: "technical", label: "Technical", count: SKILL_METRICS.filter(s => s.category === "technical").length },
    { id: "process", label: "Process", count: SKILL_METRICS.filter(s => s.category === "process").length },
    { id: "domain", label: "Domain", count: SKILL_METRICS.filter(s => s.category === "domain").length }
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
            onClick={() => setSelectedCategory(cat.id as any)}
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
                    className={`relative cursor-pointer overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg ${
                      isHigh ? "border-green-500/30 bg-green-500/5" :
                      isMedium ? "border-yellow-500/30 bg-yellow-500/5" :
                      "border-border bg-background"
                    }`}
                    onMouseEnter={() => setHoveredSkill(skill.name)}
                    onMouseLeave={() => setHoveredSkill(null)}
                  >
                    {/* Intensity Background Gradient */}
                    <div 
                      className="absolute inset-0 opacity-10 transition-all"
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
                          
                          {/* Proficiency Bar */}
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                isHigh ? "bg-green-500" : isMedium ? "bg-yellow-500" : "bg-blue-500"
                              }`}
                              style={{ width: `${intensity}%` }}
                            />
                          </div>
                          
                          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{skill.proficiency}%</span>
                            <span>{skill.evidenceCount} evidences</span>
                          </div>
                        </div>
                        
                        {/* Trend Indicator */}
                        {skill.trend === "up" && (
                          <TrendingUp className="size-4 text-green-500" />
                        )}
                        {skill.trend === "down" && (
                          <TrendingUp className="size-4 rotate-180 text-red-500" />
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
                    
                    {/* Hover Tooltip */}
                    {(hoveredSkill === skill.name || skill.trend === "up") && (
                      <div className="absolute right-2 top-2">
                        {skill.trend === "up" && (
                          <div className="rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                            ↑ {skill.trendValue}%
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs">
                    <p className="font-semibold">{skill.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Proficiency: {skill.proficiency}% | Evidence: {skill.evidenceCount} points
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Applied in {skill.projects.length} projects
                    </p>
                    {skill.trend === "up" && (
                      <p className="text-sm text-green-500">
                        Trending up: +{skill.trendValue}% recently
                      </p>
                    )}
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
          <span className="text-muted-foreground">Expert Level (90%+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-yellow-500" />
          <span className="text-muted-foreground">Proficient (75-89%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Developing (&lt;75%)</span>
        </div>
      </div>
    </div>
  );
}
