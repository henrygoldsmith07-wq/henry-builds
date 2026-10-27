/**
 * Claim freshness monitor.
 * 
 * Visualizes evidence age across all projects and identifies stale claims
 * approaching the expiration window. Helps maintain the proof-first integrity
 * of the portfolio.
 */

import { AlertTriangle, CheckCircle2, Clock, TriangleAlert } from "lucide-react";
import { projects } from "@/data/registry";
import {
  daysSinceVerified,
  deploySnapshotAgeDays,
  DEPLOY_SNAPSHOT_WINDOW_DAYS,
  FRESH_CLAIM_WINDOW_DAYS,
} from "@/data/registry";
import type { HydratedProject } from "@/data/registry";

interface FreshnessMetrics {
  projectSlug: string;
  projectName: string;
  stage: string;
  verifiedAgeDays: number;
  deployAgeDays: number;
  needsRefresh: boolean;
  warnings: Array<{ type: "evidence" | "deployment" | "verification"; message: string }>;
}

/**
 * Calculate freshness metrics for a project.
 */
function calculateFreshnessMetrics(project: HydratedProject): FreshnessMetrics | null {
  const verifiedAgeDays = daysSinceVerified(project);

  // `daysSinceVerified` returns null when the case study carries no usable
  // date. Reading null through `>` made the comparison always false, so any
  // project without a stamp silently counted as fresh. It belongs in the
  // "stale" bucket instead: unknown age is not the same as verified now.
  if (verifiedAgeDays === null) return null;

  const isStale = verifiedAgeDays > FRESH_CLAIM_WINDOW_DAYS;

  // The deployment snapshot is stamped once for the whole file
  // (`facts-history.json` -> `generatedAt`), falling back to the deployment's
  // own creation date. Reading `deploySnapshot.date` read a field that does
  // not exist on `FactsSnapshot`, producing `new Date(undefined)` -> NaN, and
  // `deployAgeDays: NaN` sorted the report to the bottom and broke the
  // average. `deploySnapshotAgeDays` in the registry module owns this rule.
  const deployAgeDays = deploySnapshotAgeDays(project) ?? 0;

  // Generate warnings
  const warnings: Array<{ type: "evidence" | "deployment" | "verification"; message: string }> = [];

  if (isStale) {
    warnings.push({
      type: "evidence",
      message: `Case study last verified ${verifiedAgeDays} days ago (${FRESH_CLAIM_WINDOW_DAYS} day threshold)`,
    });
  }

  if (deployAgeDays > DEPLOY_SNAPSHOT_WINDOW_DAYS) {
    warnings.push({
      type: "deployment",
      message: `Deployment snapshot unchecked for ${deployAgeDays} days (window: ${DEPLOY_SNAPSHOT_WINDOW_DAYS} days)`,
    });
  }

  // Count unverified outcomes
  const unverifiedOutcomes = project.caseStudy.outcomes.filter(
    (outcome) => outcome.evidence.length === 0
  ).length;

  if (unverifiedOutcomes > 0) {
    warnings.push({
      type: "verification",
      message: `${unverifiedOutcomes} outcome${unverifiedOutcomes > 1 ? "s" : ""} without evidence`,
    });
  }

  return {
    projectSlug: project.slug,
    projectName: project.name,
    stage: project.stage,
    verifiedAgeDays,
    deployAgeDays,
    needsRefresh: isStale || warnings.length > 0,
    warnings,
  };
}

/**
 * Aggregated freshness report across all projects.
 */
export function ClaimFreshnessReport() {
  const metrics = projects
    .map(calculateFreshnessMetrics)
    .filter((m): m is FreshnessMetrics => m !== null);
  
  // Sort by age (oldest first)
  metrics.sort((a, b) => b.verifiedAgeDays - a.verifiedAgeDays);
  
  // Calculate summary statistics
  const staleProjects = metrics.filter((m) => m.needsRefresh);
  const healthyProjects = metrics.filter((m) => !m.needsRefresh);
  // `metrics` is non-empty whenever any case study is published, so the mean
  // cannot divide by zero in practice; `Number.isFinite` keeps a hypothetical
  // empty registry from rendering `NaN` as the headline average.
  const averageAgeRaw =
    metrics.reduce((sum, m) => sum + m.verifiedAgeDays, 0) / metrics.length;
  const averageAge = Number.isFinite(averageAgeRaw) ? Math.round(averageAgeRaw) : 0;
  
  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div className="rounded-xl border border-border bg-background p-6">
        <h2 className="text-lg font-semibold">Evidence Freshness Overview</h2>
        
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle2 className="size-5" />
              <span className="font-medium">Healthy</span>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{healthyProjects.length}</p>
            <p className="text-xs text-muted-foreground">Within verification window</p>
          </div>
          
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
            <div className="flex items-center gap-2 text-red-500">
              <TriangleAlert className="size-5" />
              <span className="font-medium">Stale Evidence</span>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{staleProjects.length}</p>
            <p className="text-xs text-muted-foreground">Needs verification refresh</p>
          </div>
          
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
            <div className="flex items-center gap-2 text-yellow-500">
              <Clock className="size-5" />
              <span className="font-medium">Average Age</span>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{averageAge}d</p>
            <p className="text-xs text-muted-foreground">{FRESH_CLAIM_WINDOW_DAYS} day threshold</p>
          </div>
          
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="size-5" />
              <span className="font-medium">Threshold</span>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{FRESH_CLAIM_WINDOW_DAYS}d</p>
            <p className="text-xs text-muted-foreground">Auto-expire point</p>
          </div>
        </div>
      </div>
      
      {/* Detailed list */}
      <div className="space-y-4">
        <h3 className="font-medium">Project-by-Project Breakdown</h3>
        
        {metrics.map((metric) => (
          <div
            key={metric.projectSlug}
            className={`overflow-hidden rounded-xl border ${
              metric.needsRefresh ? "border-red-500/30 bg-red-500/5" : "border-border bg-background"
            }`}
          >
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              {/* Project info */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h4 className="font-semibold">{metric.projectName}</h4>
                  <span className="pill">{metric.stage}</span>
                </div>
                
                <div className="mt-3 flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Last verified:</span>{" "}
                    <span className="font-medium">
                      {metric.verifiedAgeDays} days ago
                    </span>
                  </div>
                  
                  {metric.deployAgeDays > 0 && (
                    <div>
                      <span className="text-muted-foreground">Deploy age:</span>{" "}
                      <span className="font-medium">
                        {metric.deployAgeDays} days
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Status indicators */}
              <div className="flex flex-wrap gap-2 self-start sm:self-center">
                {metric.needsRefresh ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500">
                    <TriangleAlert className="size-3.5" />
                    Needs attention
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-500">
                    <CheckCircle2 className="size-3.5" />
                    Fresh
                  </span>
                )}
              </div>
            </div>
            
            {/* Warnings */}
            {metric.warnings.length > 0 && (
              <div className="border-t border-red-500/20 bg-red-500/5 p-4">
                <p className="text-xs font-medium text-red-500 mb-2">Warnings:</p>
                <ul className="space-y-1">
                  {metric.warnings.map((warning, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-red-500/80">
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-red-500" />
                      <span>{warning.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Action items */}
      {staleProjects.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-500">Action Required</h3>
              <p className="mt-1 text-sm text-amber-500/80">
                {staleProjects.length} project{staleProjects.length > 1 ? "s" : ""} require evidence refresh. 
                Run <code className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-500">bun run registry:refresh</code> to update case studies, 
                or manually review outdated claims at{" "}
                <a href="/compare" className="underline hover:text-amber-500">/compare</a>.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Help text */}
      <div className="rounded-xl border border-border bg-muted p-4 text-xs text-muted-foreground">
        <p>
          Evidence freshness is tracked automatically via case study metadata. Claims older than{" "}
          <strong>{FRESH_CLAIM_WINDOW_DAYS} days</strong> are marked as stale and may expire. 
          The CI validation pipeline enforces this policy before publishing updates.
          Each project shows when its last verification occurred and any associated risks.
        </p>
      </div>
    </div>
  );
}

/**
 * Individual freshness indicator component for use on project pages.
 */
export function ClaimFreshnessIndicator({ project }: { project: HydratedProject }) {
  const verifiedAgeDays = daysSinceVerified(project);

  // No usable verification date: say so rather than rendering "NaN" or
  // pretending the claim was checked today (a null date used to satisfy the
  // `=== 0` shortcut below and show "Just verified").
  if (verifiedAgeDays === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <TriangleAlert className="size-3.5" />
        Verification date missing
      </span>
    );
  }

  const isStale = verifiedAgeDays > FRESH_CLAIM_WINDOW_DAYS;
  const isApproachingStale = verifiedAgeDays > FRESH_CLAIM_WINDOW_DAYS * 0.75;

  if (verifiedAgeDays <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-500">
        <CheckCircle2 className="size-3.5" />
        Just verified
      </span>
    );
  }
  
  if (isStale) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500">
        <TriangleAlert className="size-3.5" />
        Stale ({verifiedAgeDays}d)
      </span>
    );
  }
  
  if (isApproachingStale) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-500">
        <Clock className="size-3.5" />
        Approaching stale ({verifiedAgeDays}/{FRESH_CLAIM_WINDOW_DAYS}d)
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-500">
      <CheckCircle2 className="size-3.5" />
      Verified ({verifiedAgeDays}d)
    </span>
  );
}
