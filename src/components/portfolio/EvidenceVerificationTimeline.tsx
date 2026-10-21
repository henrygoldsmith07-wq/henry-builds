import { Calendar, CheckCircle, Clock, TrendingUp, TriangleAlert } from "lucide-react";
import { projects, registryMeta, FRESH_CLAIM_WINDOW_DAYS, hasRedCi, hasCarriedCi } from "@/data/registry";

/**
 * Evidence Verification Timeline
 * 
 * Shows when each project's claims were last verified by CI, with visual indicators for:
 * - Fresh verifications (within window)
 * - Stale verifications (expired)
 * - Carried CI (no fresh check possible)
 * - Failed CI (latest run broke)
 * 
 * Demonstrates commitment to proof-first approach through temporal transparency.
 */
export function EvidenceVerificationTimeline() {
  const today = new Date();
  
  const timelineData = projects.map(project => {
    const verifiedAt = project.sourceCheckedAt;
    const daysSinceVerified = verifiedAt ? Math.floor((today.getTime() - new Date(verifiedAt).getTime()) / (1000 * 60 * 60 * 24)) : null;
    
    let status: "fresh" | "stale" | "carried" | "failed" | "unknown" = "unknown";
    let statusLabel = "Unknown";
    let statusColor = "bg-slate-500";
    
    if (hasRedCi(project)) {
      status = "failed";
      statusLabel = "CI Failed";
      statusColor = "bg-red-500";
    } else if (hasCarriedCi(project)) {
      status = "carried";
      statusLabel = "Carried Forward";
      statusColor = "bg-yellow-500";
    } else if (daysSinceVerified !== null) {
      if (daysSinceVerified <= FRESH_CLAIM_WINDOW_DAYS) {
        status = "fresh";
        statusLabel = `${daysSinceVerified}d ago`;
        statusColor = "bg-emerald-500";
      } else {
        status = "stale";
        statusLabel = `${daysSinceVerified}d ago`;
        statusColor = "bg-orange-500";
      }
    }
    
    return {
      ...project,
      verifiedAt,
      daysSinceVerified,
      status,
      statusLabel,
      statusColor,
    };
  }).filter(p => p.status !== "unknown").sort((a, b) => {
    // Sort by most recently verified first
    if (!a.verifiedAt || !b.verifiedAt) return 0;
    return new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime();
  });

  const stats = {
    total: timelineData.length,
    fresh: timelineData.filter(p => p.status === "fresh").length,
    stale: timelineData.filter(p => p.status === "stale").length,
    carried: timelineData.filter(p => p.status === "carried").length,
    failed: timelineData.filter(p => p.status === "failed").length,
    avgDaysSinceVerified: Math.round(
      timelineData.reduce((sum, p) => sum + (p.daysSinceVerified ?? 0), 0) / timelineData.length
    ),
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "fresh":
        return <CheckCircle className="size-4 text-white" aria-hidden="true" />;
      case "stale":
        return <Clock className="size-4 text-white" aria-hidden="true" />;
      case "carried":
        return <TrendingUp className="size-4 text-black" aria-hidden="true" />;
      case "failed":
        return <TriangleAlert className="size-4 text-white" aria-hidden="true" />;
      default:
        return <Calendar className="size-4" aria-hidden="true" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total Projects", value: stats.total },
          { label: "Fresh Verifications", value: stats.fresh },
          { label: "Stale Claims", value: stats.stale },
          { label: "Carried CI", value: stats.carried },
          { label: "Failed CI", value: stats.failed },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-border p-4">
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-2xl font-bold tracking-tight">{value}</dd>
          </div>
        ))}
        <div className="rounded-xl border border-border bg-border p-4 sm:col-span-2 lg:col-span-1">
          <dt className="text-xs font-medium text-muted-foreground">Avg. Days Since Verified</dt>
          <dd className="mt-1 text-2xl font-bold tracking-tight">{stats.avgDaysSinceVerified}d</dd>
        </div>
      </dl>

      {/* Timeline */}
      <div className="overflow-hidden rounded-2xl border border-border bg-border">
        <ol className="divide-y divide-border">
          {timelineData.map((project) => (
            <li key={project.slug} className="group transition-colors hover:bg-foreground/5">
              <div className="flex items-center gap-4 p-5 sm:p-6">
                <div className={`shrink-0 rounded-full ${project.statusColor}`}>
                  {getStatusIcon(project.status)}
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold tracking-tight">{project.name}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      project.status === "fresh" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                      project.status === "stale" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                      project.status === "carried" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                      project.status === "failed" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    }`}>
                      {project.statusLabel}
                    </span>
                  </div>
                  
                  {project.verifiedAt && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Last verified:{" "}
                      {new Date(project.verifiedAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                      {" "}
                      ({project.daysSinceVerified} days ago)
                    </p>
                  )}
                  
                  <a
                    href={`/projects/${project.slug}`}
                    className="mt-2 inline-flex items-center text-xs font-semibold text-foreground/60 group-hover:text-foreground transition-colors"
                  >
                    View case study →
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Legend */}
      <div className="rounded-2xl border border-border bg-border p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-foreground/40">
          Status Legend
        </h3>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Fresh", desc: "Verified within last 90 days", color: "bg-emerald-500" },
            { label: "Stale", desc: "No verification in 90+ days", color: "bg-orange-500" },
            { label: "Carried", desc: "CI data unavailable; using latest import", color: "bg-yellow-500" },
            { label: "Failed", desc: "Latest CI run did not pass", color: "bg-red-500" },
          ].map(({ label, desc, color }) => (
            <div key={label} className="flex items-start gap-3">
              <span className={`mt-0.5 size-2 shrink-0 rounded-full ${color}`} />
              <div>
                <dt className="font-semibold">{label}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{desc}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>

      {/* Strategic Insight */}
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Calendar className="size-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          Why This Matters
        </h3>
        <p className="mt-3 text-sm leading-6 text-foreground/85">
          Static portfolios can claim things once and never verify them again. The evidence-first approach
          requires <strong>ongoing verification</strong>. This timeline shows exactly when each project's
          claims were last validated by CI — transparently exposing what's current vs. what may have changed.
          Fresh verifications demonstrate living code; stale ones warrant closer inspection before making hiring decisions.
        </p>
      </div>
    </div>
  );
}
