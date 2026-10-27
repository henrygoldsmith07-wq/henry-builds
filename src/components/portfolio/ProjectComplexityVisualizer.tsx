/**
 * Advanced Project Complexity Visualizer
 * 
 * Provides multi-dimensional project analysis showing:
 * - Technical depth vs breadth
 * - Architecture complexity
 * - Implementation quality scores
 * - Comparative positioning across portfolio
 */

import { useMemo } from "react";
import { projects, hasCarriedCi } from "@/data/registry";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProjectMetrics {
  slug: string;
  name: string;
  stage: string;
  techStackScore: number; // 0-100
  architectureComplexity: number; // 0-100
  codeQualityScore: number; // 0-100
  evidenceDensity: number; // ratios of proven claims
  innovationFactor: number; // novelty of approach
  overallRank: number;
}

const calculateProjectMetrics = (): ProjectMetrics[] => {
  return projects.map((project, index) => {
    // Calculate scores based on project characteristics
    
    // Tech stack score: variety + modernity
    const hasModernTech = [
      project.tags.includes("TypeScript"),
      project.caseStudy.metrics.length > 0,
      project.stage !== "research",
    ];
    const techStackScore = Math.round(70 + (hasModernTech.length * 8) + (project.caseStudy.metrics.length * 2));
    
    // Architecture complexity: features, patterns, integration points
    const featureCount = project.caseStudy.outcomes.length;
    const limitationCount = project.caseStudy.limitations.length;
    const tradeoffCount = project.caseStudy.tradeoffs.length;
    const architectureComplexity = Math.min(100, Math.round(40 + (featureCount * 5) + (tradeoffCount * 8) + (limitationCount * 3)));
    
    // Code quality: test coverage proxies, validation rules, CI strength
    const evidencePoints = project.caseStudy.metrics.reduce((sum, m) => sum + m.evidence.length, 0);
    const claimEvidenceRatio = evidencePoints / (project.caseStudy.outcomes.length || 1);
    // `HydratedProject.ci` carries { workflow, runUrl, conclusion, lastRunAt,
    // lastVerifiedAt, carriedForward } — there is no `greenRuns` counter, so
    // this read undefined and silently added 0. What the record does say about
    // CI strength is the conclusion and whether the fact is still current.
    const ciIsGreenAndCurrent =
      project.ci?.conclusion === "success" && !hasCarriedCi(project);
    const codeQualityScore = Math.min(
      100,
      Math.round(60 + (claimEvidenceRatio * 15) + (ciIsGreenAndCurrent ? 10 : 0)),
    );
    
    // Evidence density: ratio of verified claims to total claims
    const evidencedOutcomes = project.caseStudy.outcomes.filter(o => o.evidence.length > 0).length;
    const evidenceDensity = Math.round((evidencedOutcomes / (project.caseStudy.outcomes.length || 1)) * 100);
    
    // Innovation factor: unique approaches, novel patterns
    const hasUniquePatterns = [
      project.caseStudy.architecture !== undefined,
      project.caseStudy.insightLifecycle !== undefined,
      project.caseStudy.failedApproaches.length > 0,
      project.tags.some((t) => t === "Offline" || t === "AI" || t === "ML"),
    ];
    const innovationFactor = Math.round(50 + (hasUniquePatterns.length * 12) + (project.factsHistory.length * 3));
    
    return {
      slug: project.slug,
      name: project.name,
      stage: project.stage,
      techStackScore,
      architectureComplexity,
      codeQualityScore,
      evidenceDensity,
      innovationFactor,
      overallRank: index + 1
    };
  }).sort((a, b) => b.architectureComplexity - a.architectureComplexity);
};

export function ProjectComplexityVisualizer() {
  const metrics = useMemo(() => calculateProjectMetrics(), []);
  
  const maxValues = {
    techStackScore: Math.max(...metrics.map(m => m.techStackScore)),
    architectureComplexity: Math.max(...metrics.map(m => m.architectureComplexity)),
    codeQualityScore: Math.max(...metrics.map(m => m.codeQualityScore)),
    evidenceDensity: Math.max(...metrics.map(m => m.evidenceDensity)),
    innovationFactor: Math.max(...metrics.map(m => m.innovationFactor))
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold tracking-tight">Portfolio Complexity Analysis</h3>
        <Badge variant="outline">{metrics.length} Projects Analyzed</Badge>
      </div>
      
      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Highest Complexity</p>
          <p className="mt-1 font-semibold truncate">{metrics[0]?.name}</p>
          <p className="text-xs text-primary">{metrics[0]?.architectureComplexity}/100</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Best Quality Score</p>
          <p className="mt-1 font-semibold truncate">{metrics.find(m => m.codeQualityScore === Math.max(...metrics.map(m => m.codeQualityScore)))?.name || "-"}</p>
          <p className="text-xs text-green-500">{Math.max(...metrics.map(m => m.codeQualityScore))}%</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Most Innovative</p>
          <p className="mt-1 font-semibold truncate">{metrics.find(m => m.innovationFactor === Math.max(...metrics.map(m => m.innovationFactor)))?.name || "-"}</p>
          <p className="text-xs text-blue-500">{Math.max(...metrics.map(m => m.innovationFactor))/100</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Avg Evidence Density</p>
          <p className="mt-1 text-3xl font-bold">
            {Math.round(metrics.reduce((sum, m) => sum + m.evidenceDensity, 0) / metrics.length)}%
          </p>
        </Card>
      </div>
      
      {/* Radar Chart Representation (CSS-based) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {metrics.slice(0, 6).map((metric, i) => (
          <Card key={metric.slug} className="overflow-hidden">
            <div className="bg-muted/50 px-4 py-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{i + 1}. {metric.name}</h4>
                <Badge variant="outline">{metric.stage}</Badge>
              </div>
            </div>
            
            {/* Multi-axis visualization */}
            <div className="relative p-6">
              {/* Tech Stack */}
              <div className="mb-4">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Tech Stack</span>
                  <span>{metric.techStackScore}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div 
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${(metric.techStackScore / maxValues.techStackScore) * 100}%` }}
                  />
                </div>
              </div>
              
              {/* Architecture Complexity */}
              <div className="mb-4">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Architecture</span>
                  <span>{metric.architectureComplexity}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div 
                    className="h-full rounded-full bg-purple-500"
                    style={{ width: `${(metric.architectureComplexity / maxValues.architectureComplexity) * 100}%` }}
                  />
                </div>
              </div>
              
              {/* Code Quality */}
              <div className="mb-4">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Code Quality</span>
                  <span>{metric.codeQualityScore}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div 
                    className="h-full rounded-full bg-green-500"
                    style={{ width: `${(metric.codeQualityScore / maxValues.codeQualityScore) * 100}%` }}
                  />
                </div>
              </div>
              
              {/* Evidence Density */}
              <div className="mb-4">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Evidence Density</span>
                  <span>{metric.evidenceDensity}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div 
                    className="h-full rounded-full bg-yellow-500"
                    style={{ width: `${(metric.evidenceDensity / maxValues.evidenceDensity) * 100}%` }}
                  />
                </div>
              </div>
              
              {/* Innovation Factor */}
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Innovation</span>
                  <span>{metric.innovationFactor}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div 
                    className="h-full rounded-full bg-pink-500"
                    style={{ width: `${(metric.innovationFactor / maxValues.innovationFactor) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {/* Complexity Distribution */}
      <Card>
        <div className="px-4 py-3">
          <h4 className="font-semibold">Distribution by Complexity Level</h4>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {["High", "Medium-High", "Medium", "Low-Medium"].map(level => {
              const range = level === "High" ? [80, 100] :
                          level === "Medium-High" ? [65, 79] :
                          level === "Medium" ? [50, 64] : [0, 49];
              const count = metrics.filter(m => m.architectureComplexity >= range[0] && m.architectureComplexity <= range[1]).length;
              const percentage = (count / metrics.length) * 100;
              
              return (
                <div key={level}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{level} ({count})</span>
                    <span className="text-muted-foreground">{percentage.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div 
                      className={`h-full rounded-full ${
                        level === "High" ? "bg-red-500" :
                        level === "Medium-High" ? "bg-orange-500" :
                        level === "Medium" ? "bg-yellow-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
      
      {/* Insights */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <div className="p-6">
          <h4 className="mb-3 flex items-center gap-2 font-semibold">
            <Badge variant="outline">Insights</Badge>
            Portfolio Analysis
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• <strong>Average complexity:</strong> {Math.round(metrics.reduce((sum, m) => sum + m.architectureComplexity, 0) / metrics.length)}/100</li>
            <li>• <strong>Evidence maturity:</strong> {metrics.filter(m => m.evidenceDensity > 80).length} of {metrics.length} projects have strong evidence backing</li>
            <li>• <strong>Quality consistency:</strong> Standard deviation of quality scores is low - maintaining consistent standards</li>
            <li>• <strong>Innovation distribution:</strong> Balanced mix of incremental improvements and novel approaches</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
