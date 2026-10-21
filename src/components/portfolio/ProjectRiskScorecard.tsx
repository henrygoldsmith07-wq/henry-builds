import { AlertTriangle, CheckCircle2, ShieldAlert, TrendingDown, XCircle } from "lucide-react";
import { projects, hasRedCi, hasCarriedCi, FRESH_CLAIM_WINDOW_DAYS } from "@/data/registry";
import { useState } from "react";

/**
 * Project Risk Scorecard
 * 
 * Evaluates each project on 7 risk dimensions to give hiring managers transparency
 * about technical debt, reliability concerns, and maintenance burden.
 * 
 * This is the anti-pattern to polished portfolios: it shows WHERE things might break.
 * Demonstrates extreme honesty about engineering trade-offs.
 */
type RiskDimension = {
  name: string;
  description: string;
  weight: number; // 0-1 multiplier for severity
};

const RISK_DIMENSIONS: Record<string, RiskDimension> = {
  "CI Health": {
    name: "CI Health",
    description: "Build/test stability over time. Red CI indicates recent breaks.",
    weight: 0.2,
  },
  "Claim Freshness": {
    name: "Claim Freshness",
    description: "How long since claims were verified by automated testing.",
    weight: 0.15,
  },
  "Evidence Density": {
    name: "Evidence Density",
    description: "Ratio of proven outcomes to total claims.",
    weight: 0.15,
  },
  "Dependency Risk": {
    name: "Dependency Risk",
    description: "Reliance on external APIs or third-party services.",
    weight: 0.1,
  },
  "Offline Capability": {
    name: "Offline Capability",
    description: "Resilience when network connectivity fails.",
    weight: 0.15,
  },
  "Data Persistence": {
    name: "Data Persistence",
    description: "Robustness of local storage strategies.",
    weight: 0.1,
  },
  "Accessibility Coverage": {
    name: "Accessibility Coverage",
    description: "Compliance with WCAG standards.",
    weight: 0.15,
  },
};

type RiskLevel = "low" | "medium" | "high" | "critical";

interface DimensionScore {
  dimension: string;
  score: number; // 0-100 (higher = lower risk)
  level: RiskLevel;
  details: string[];
}

interface ProjectRiskAssessment {
  project: typeof projects[0];
  overallScore: number;
  overallLevel: RiskLevel;
  dimensions: DimensionScore[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export function ProjectRiskScorecard() {
  const [selectedProject, setSelectedProject] = useState<string>(projects[0].slug);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState<boolean>(false);

  const assessProjectRisks = (project: typeof projects[0]): ProjectRiskAssessment => {
    const dimensions: DimensionScore[] = [];

    // 1. CI Health
    let ciScore = 100;
    let ciDetails: string[] = [];
    if (hasRedCi(project)) {
      ciScore -= 40;
      ciDetails.push("Latest CI run failed - build instability");
    } else if (hasCarriedCi(project)) {
      ciScore -= 20;
      ciDetails.push("CI data not recently verified - carried forward");
    } else {
      ciDetails.push("CI runs passing consistently");
    }
    ciScore = Math.max(0, ciScore);
    dimensions.push({
      dimension: "CI Health",
      score: ciScore,
      level: getRiskLevel(ciScore),
      details: ciDetails,
    });

    // 2. Claim Freshness
    const daysSinceVerified = project.sourceCheckedAt
      ? Math.floor((Date.now() - new Date(project.sourceCheckedAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    let freshnessScore = 100;
    let freshnessDetails: string[] = [];
    if (daysSinceVerified !== null) {
      if (daysSinceVerified > FRESH_CLAIM_WINDOW_DAYS * 2) {
        freshnessScore -= 50;
        freshnessDetails.push(`Claims unverified for ${daysSinceVerified} days`);
      } else if (daysSinceVerified > FRESH_CLAIM_WINDOW_DAYS) {
        freshnessScore -= 25;
        freshnessDetails.push(`Claims unverified for ${daysSinceVerified} days`);
      } else {
        freshnessDetails.push(`Claims verified ${daysSinceVerified} days ago`);
      }
    } else {
      freshnessScore -= 30;
      freshnessDetails.push("No verification timestamp recorded");
    }
    dimensions.push({
      dimension: "Claim Freshness",
      score: Math.max(0, freshnessScore),
      level: getRiskLevel(freshnessScore),
      details: freshnessDetails,
    });

    // 3. Evidence Density
    const outcomesWithEvidence = project.caseStudy.outcomes.filter(o => o.evidence.length > 0).length;
    const totalOutcomes = project.caseStudy.outcomes.length;
    const evidenceDensity = totalOutcomes > 0 ? (outcomesWithEvidence / totalOutcomes) * 100 : 0;
    let densityScore = evidenceDensity;
    let densityDetails: string[] = [];
    if (evidenceDensity < 30) {
      densityDetails.push(`Only ${outcomesWithEvidence}/${totalOutcomes} outcomes have evidence`);
    } else if (evidenceDensity < 70) {
      densityDetails.push(`${outcomesWithEvidence}/${totalOutcomes} outcomes have evidence`);
    } else {
      densityDetails.push(`${Math.round(evidenceDensity)}% of outcomes are evidence-backed`);
    }
    dimensions.push({
      dimension: "Evidence Density",
      score: densityScore,
      level: getRiskLevel(densityScore),
      details: densityDetails,
    });

    // 4. Dependency Risk
    const hasExternalApi = project.tags.some(t => t.includes("API") || t.includes("Cloud"));
    const hasDatabase = project.tags.some(t => t.includes("Database") || t.includes("PostgreSQL"));
    let dependencyScore = 100;
    let dependencyDetails: string[] = [];
    if (hasExternalApi && !hasDatabase) {
      dependencyScore -= 20;
      dependencyDetails.push("Relies on external API without本地 persistence layer");
    } else if (hasExternalApi) {
      dependencyScore -= 10;
      dependencyDetails.push("Uses external API but has offline fallback");
    } else if (hasDatabase) {
      dependencyScore -= 5;
      dependencyDetails.push("Self-hosted data storage reduces dependency risk");
    } else {
      dependencyDetails.push("Minimal external dependencies");
    }
    dimensions.push({
      dimension: "Dependency Risk",
      score: Math.max(0, dependencyScore),
      level: getRiskLevel(dependencyScore),
      details: dependencyDetails,
    });

    // 5. Offline Capability
    const isOfflineFirst = project.tags.some(t => t.includes("Offline"));
    let offlineScore = isOfflineFirst ? 100 : 60;
    let offlineDetails: string[] = [];
    if (isOfflineFirst) {
      offlineDetails.push("Offline-first architecture ensures uptime during outages");
    } else {
      offlineDetails.push("Requires network connectivity for core functionality");
      offlineScore -= 20;
    }
    dimensions.push({
      dimension: "Offline Capability",
      score: Math.max(0, offlineScore),
      level: getRiskLevel(offlineScore),
      details: offlineDetails,
    });

    // 6. Data Persistence
    const usesIndexedDB = project.tags.some(t => t.includes("PWA") || t.includes("Offline"));
    const usesLocalStorage = !project.liveUrl?.includes("no-data-persistence"); // Heuristic
    let persistenceScore = 100;
    let persistenceDetails: string[] = [];
    if (usesIndexedDB) {
      persistenceDetails.push("Robust IndexedDB-based persistence");
    } else if (usesLocalStorage) {
      persistenceDetails.push("Basic localStorage persistence");
      persistenceScore -= 10;
    } else {
      persistenceScore -= 30;
      persistenceDetails.push("Limited client-side data persistence");
    }
    dimensions.push({
      dimension: "Data Persistence",
      score: Math.max(0, persistenceScore),
      level: getRiskLevel(persistenceScore),
      details: persistenceDetails,
    });

    // 7. Accessibility Coverage
    const hasA11yTag = project.tags.some(t => t.includes("Accessibility"));
    const a11yScore = hasA11yTag ? 90 : 50;
    const a11yDetails: string[] = hasA11yTag
      ? ["Implemented Radix UI Primitives for accessibility", "Following ARIA best practices"]
      : ["Basic keyboard navigation only", "Missing formal accessibility testing"];
    dimensions.push({
      dimension: "Accessibility Coverage",
      score: a11yScore,
      level: getRiskLevel(a11yScore),
      details: a11yDetails,
    });

    // Calculate weighted overall score
    const weightedScore = dimensions.reduce((sum, d) => {
      return sum + (d.score * RISK_DIMENSIONS[d.dimension].weight);
    }, 0);

    const overallLevel = getRiskLevel(weightedScore);

    // Identify strengths and weaknesses
    const strengths = dimensions
      .filter(d => d.score >= 75)
      .map(d => `${d.dimension}: ${d.details[0]}`);

    const weaknesses = dimensions
      .filter(d => d.score < 75)
      .map(d => `${d.dimension}: ${d.details[0]}`);

    // Generate recommendations
    const recommendations: string[] = [];
    dimensions.forEach(d => {
      if (d.level === "high" || d.level === "critical") {
        if (d.dimension === "CI Health") {
          recommendations.push("Stabilize test suite to ensure consistent green builds");
        } else if (d.dimension === "Claim Freshness") {
          recommendations.push("Implement automated claim verification schedule");
        } else if (d.dimension === "Evidence Density") {
          recommendations.push("Document more outcomes with source-linked evidence");
        } else if (d.dimension === "Offline Capability") {
          recommendations.push("Add offline-first patterns using service workers");
        }
      }
    });

    return {
      project,
      overallScore: Math.round(weightedScore),
      overallLevel,
      dimensions,
      strengths,
      weaknesses,
      recommendations,
    };
  };

  function getRiskLevel(score: number): RiskLevel {
    if (score >= 85) return "low";
    if (score >= 70) return "medium";
    if (score >= 50) return "high";
    return "critical";
  }

  function getScoreColor(score: number): string {
    if (score >= 85) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 50) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  }

  function getDimensionBg(level: RiskLevel): string {
    switch (level) {
      case "low":
        return "bg-emerald-500/10 border-emerald-500/20";
      case "medium":
        return "bg-yellow-500/10 border-yellow-500/20";
      case "high":
        return "bg-orange-500/10 border-orange-500/20";
      case "critical":
        return "bg-red-500/10 border-red-500/20";
    }
  }

  function getRiskIcon(level: RiskLevel) {
    switch (level) {
      case "low":
        return <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />;
      case "medium":
        return <ShieldAlert className="size-5 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />;
      case "high":
        return <AlertTriangle className="size-5 text-orange-600 dark:text-orange-400" aria-hidden="true" />;
      case "critical":
        return <XCircle className="size-5 text-red-600 dark:text-red-400" aria-hidden="true" />;
    }
  }

  // Assess all projects
  const allAssessments = projects.map(assessProjectRisks);
  const selectedAssessment = allAssessments.find(a => a.project.slug === selectedProject)!;
  const sortedByRisk = [...allAssessments].sort((a, b) => a.overallScore - b.overallScore);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-gradient-to-r from-red-500/5 via-orange-500/5 to-emerald-500/5 p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Project Risk Scorecard
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl">
              Transparent evaluation of technical risk across 7 dimensions. Shows where projects
              might need maintenance, what's stable, and which investments carry higher uncertainty.
              This is the honest view most portfolios hide.
            </p>
          </div>
          <ShieldAlert className="size-10 text-foreground/40" aria-hidden="true" />
        </div>
      </div>

      {/* Quick Stats Overview */}
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Avg Overall Score",
            value: Math.round(allAssessments.reduce((sum, a) => sum + a.overallScore, 0) / allAssessments.length),
            suffix: "/100",
            color: "text-foreground"
          },
          {
            label: "Lowest Risk",
            value: sortedByRisk[0]?.project.name.split(" ")[0],
            color: "text-emerald-600 dark:text-emerald-400"
          },
          {
            label: "Highest Risk",
            value: sortedByRisk[sortedByRisk.length - 1]?.project.name.split(" ")[0],
            color: "text-red-600 dark:text-red-400"
          },
          {
            label: "Projects With Issues",
            value: allAssessments.filter(a => a.weaknesses.length > 0).length,
            suffix: `/${projects.length}`,
            color: "text-orange-600 dark:text-orange-400"
          },
        ].map(({ label, value, suffix, color }) => (
          <div key={label} className="rounded-xl border border-border bg-border p-4">
            <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
            <dd className={`mt-1 text-2xl font-bold tracking-tight ${color}`}>
              {value}{suffix}
            </dd>
          </div>
        ))}
      </dl>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Project Selector */}
        <div className="rounded-xl border border-border bg-background p-4">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-foreground/40">
            Select Project
          </h3>
          <div className="space-y-1">
            {allAssessments.map(assessment => {
              const riskIcon = getRiskIcon(assessment.overallLevel);
              const scoreColor = getScoreColor(assessment.overallScore);
              const isActive = selectedProject === assessment.project.slug;

              return (
                <button
                  key={assessment.project.slug}
                  onClick={() => setSelectedProject(assessment.project.slug)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-all ${
                    isActive
                      ? "bg-foreground/10 ring-2 ring-foreground"
                      : "hover:bg-foreground/5"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{assessment.project.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{assessment.project.stage}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {riskIcon}
                    <span className={`text-sm font-bold ${scoreColor}`}>
                      {assessment.overallScore}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Assessment */}
        <div className="space-y-6">
          {/* Overall Risk Level */}
          <div className={`rounded-2xl border-2 p-6 ${
            selectedAssessment.overallLevel === "low" ? "border-emerald-500/40 bg-emerald-500/5" :
            selectedAssessment.overallLevel === "medium" ? "border-yellow-500/40 bg-yellow-500/5" :
            selectedAssessment.overallLevel === "high" ? "border-orange-500/40 bg-orange-500/5" :
            "border-red-500/40 bg-red-500/5"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">{selectedAssessment.project.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedAssessment.project.summary}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`text-center`}>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Risk Level
                  </p>
                  <p className={`text-2xl font-bold capitalize ${getScoreColor(selectedAssessment.overallScore)}`}>
                    {selectedAssessment.overallLevel}
                  </p>
                </div>
                {getRiskIcon(selectedAssessment.overallLevel)}
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Overall Score</span>
                <span className={`text-sm font-bold ${getScoreColor(selectedAssessment.overallScore)}`}>
                  {selectedAssessment.overallScore}/100
                </span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-foreground/10">
                <div
                  className={`h-full rounded-full transition-all ${
                    selectedAssessment.overallScore >= 85 ? "bg-emerald-500" :
                    selectedAssessment.overallScore >= 70 ? "bg-yellow-500" :
                    selectedAssessment.overallScore >= 50 ? "bg-orange-500" :
                    "bg-red-500"
                  }`}
                  style={{ width: `${selectedAssessment.overallScore}%` }}
                  role="progressbar"
                  aria-valuenow={selectedAssessment.overallScore}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          </div>

          {/* Dimension Scores */}
          <div className="rounded-2xl border border-border bg-border p-6">
            <h3 className="mb-6 text-lg font-semibold tracking-tight">Risk Dimensions</h3>
            <div className="space-y-4">
              {selectedAssessment.dimensions.map(dim => (
                <div
                  key={dim.dimension}
                  className={`overflow-hidden rounded-xl border ${getDimensionBg(dim.level)}`}
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{dim.dimension}</h4>
                        {getRiskIcon(dim.level)}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{dim.details[0]}</p>
                    </div>
                    <div className={`ml-4 text-right text-2xl font-bold ${getScoreColor(dim.score)}`}>
                      {dim.score}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
              <h4 className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-4" aria-hidden="true" /> Strengths
              </h4>
              {selectedAssessment.strengths.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {selectedAssessment.strengths.map((strength, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground/85">
                      <ArrowRight className="mt-0.5 size-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      {strength}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">No standout strengths identified</p>
              )}
            </div>

            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
              <h4 className="flex items-center gap-2 font-semibold text-red-700 dark:text-red-400">
                <AlertTriangle className="size-4" aria-hidden="true" /> Weaknesses
              </h4>
              {selectedAssessment.weaknesses.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {selectedAssessment.weaknesses.map((weakness, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground/85">
                      <ArrowRight className="mt-0.5 size-3 text-red-600 dark:text-red-400" aria-hidden="true" />
                      {weakness}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">No significant weaknesses found</p>
              )}
            </div>
          </div>

          {/* Recommendations */}
          {selectedAssessment.recommendations.length > 0 && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <TrendingDown className="size-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                Engineering Recommendations
              </h3>
              <ul className="mt-4 space-y-3">
                {selectedAssessment.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground/85">
                    <div className="mt-0.5 size-2 shrink-0 rounded-full bg-amber-500" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Portfolio-Wide Risk Distribution */}
      <div className="rounded-2xl border border-border bg-border p-6">
        <h3 className="mb-6 text-lg font-semibold tracking-tight">Portfolio Risk Distribution</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Low Risk", filter: (a: ProjectRiskAssessment) => a.overallLevel === "low", color: "bg-emerald-500" },
            { label: "Medium Risk", filter: (a: ProjectRiskAssessment) => a.overallLevel === "medium", color: "bg-yellow-500" },
            { label: "High Risk", filter: (a: ProjectRiskAssessment) => a.overallLevel === "high", color: "bg-orange-500" },
            { label: "Critical Risk", filter: (a: ProjectRiskAssessment) => a.overallLevel === "critical", color: "bg-red-500" },
            { label: "Average Score", filter: () => true, color: "bg-foreground" },
          ].map(({ label, filter, color }) => {
            const count = filter({} as ProjectRiskAssessment)
              ? allAssessments.filter(a => filter(a)).length
              : Math.round(allAssessments.reduce((sum, a) => sum + a.overallScore, 0) / allAssessments.length);
            const isAvg = label === "Average Score";

            return (
              <div key={label} className="rounded-xl border border-border bg-background p-4 text-center">
                <div className={`mx-auto mb-2 size-3 rounded-full ${color}`} />
                <p className="font-semibold">{label}</p>
                <p className={`mt-1 text-3xl font-bold ${isAvg ? "" : "text-foreground/40"}`}>
                  {isAvg ? count : count}
                </p>
                {isAvg && <p className="mt-1 text-xs text-muted-foreground">average</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Strategic Insight */}
      <div className="rounded-2xl border border-border bg-foreground/5 p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ShieldAlert className="size-5 text-foreground/60" aria-hidden="true" />
          Why This Matters
        </h3>
        <p className="mt-3 text-sm leading-6 text-foreground/85">
          Every portfolio shows its strongest work. The Risk Scorecard shows where projects might
          fail, degrade, or require maintenance. For hiring managers evaluating candidates who will
          maintain codebases—this reveals understanding of trade-offs, willingness to document
          weakness, and ability to make sustainable engineering decisions. It demonstrates that
          mature engineering isn't just about shipping features, but about knowing what might break
          and planning accordingly.
        </p>
      </div>
    </div>
  );
}

// Need to import ArrowRight
import { ArrowRight } from "lucide-react";
