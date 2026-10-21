import { BarChart3, FileText, GitBranch, Grid, TrendingUp, Calendar } from "lucide-react";
import { Link } from "react-router";
import { SiteFooter, SiteHeader } from "@/components/portfolio/SiteChrome";
import { SiteMetadata } from "@/components/portfolio/SiteMetadata";
import { PROJECT_ANALYTICS_TITLE, PROJECT_ANALYTICS_DESCRIPTION, collectionGraph } from "@/data/registry/structured-data.mjs";
import { ResumeAnalyzer } from "@/components/portfolio/ResumeAnalyzer";
import { SkillsHeatmap } from "@/components/portfolio/SkillsHeatmap";
import { ProjectComplexityVisualizer } from "@/components/portfolio/ProjectComplexityVisualizer";
import { EvidenceVerificationTimeline } from "@/components/portfolio/EvidenceVerificationTimeline";
import { CapabilityEvolutionTimeline } from "@/components/portfolio/CapabilityEvolutionTimeline";
import { projects, registryMeta, demonstratesOf } from "@/data/registry";
import { useState } from "react";

/**
 * Portfolio Intelligence Hub - Advanced analytics and insights
 * 
 * Aggregates all advanced portfolio features into a single destination
 * for deeper engagement with hiring managers and technical evaluators.
 */
const portfolioAnalytics = {
  buildStructuredData: ({ origin }: { origin: string }) =>
    collectionGraph({
      origin,
      route: "/analytics",
      title: PROJECT_ANALYTICS_TITLE,
      description: PROJECT_ANALYTICS_DESCRIPTION,
    }),
};

export default function PortfolioAnalytics() {
  const [activeTab, setActiveTab] = useState<"overview" | "resume" | "skills" | "complexity" | "verification" | "evolution">("overview");

  // Calculate portfolio-wide metrics
  const portfolioMetrics = {
    totalProjects: projects.length,
    totalEvidence: projects.reduce((acc, p) => acc + (p.caseStudy.outcomes.filter(o => o.evidence.length > 0).length), 0),
    verifiedClaims: projects.reduce((acc, p) => acc + p.caseStudy.metrics.filter(m => m.evidence?.length ?? 0 > 0).length, 0),
    techStackSize: Array.from(new Set(projects.flatMap(p => demonstratesOf(p).technical))).length,
    avgEvidencePerProject: projects.reduce((acc, p) => acc + p.caseStudy.outcomes.filter(o => o.evidence.length > 0).length, 0) / projects.length,
    stageDistribution: {
      production: projects.filter(p => p.stage === "production").length,
      beta: projects.filter(p => p.stage === "beta").length,
      alpha: projects.filter(p => p.stage === "alpha").length,
      historical: projects.filter(p => p.sourceState === "historical-case-study").length,
    },
  };

  return (
    <div className="portfolio-shell">
      <SiteMetadata
        title={PROJECT_ANALYTICS_TITLE}
        description={PROJECT_ANALYTICS_DESCRIPTION}
        path="/analytics"
        image="/og/analytics.png"
        buildStructuredData={portfolioAnalytics.buildStructuredData}
      />
      <SiteHeader />
      <main id="main">
        <section className="mx-auto max-w-[1380px] px-5 pb-24 pt-36 sm:px-8 lg:px-12">
          <h1 className="section-title max-w-4xl">
            Portfolio <span className="text-muted-foreground">Intelligence.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground">
            Deep analytics on my engineering work — capability distribution, project complexity,
            and evidence density. Upload your resume for personalized matching, or explore the
            data directly. Everything here is calculated from proven claims.
          </p>
        </section>

        {/* Tabs */}
        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-[1380px] px-5 sm:px-8 lg:px-12">
            <nav className="-mb-px flex gap-6" aria-label="Analytics sections">
              {[
                { id: "overview", label: "Overview", icon: Grid },
                { id: "resume", label: "Resume Matcher", icon: FileText },
                { id: "skills", label: "Skills Heatmap", icon: BarChart3 },
                { id: "complexity", label: "Complexity Matrix", icon: TrendingUp },
                { id: "verification", label: "Evidence Timeline", icon: Calendar },
                { id: "evolution", label: "Capability Growth", icon: GitBranch },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as typeof activeTab)}
                  className={`group flex items-center gap-2 border-b-2 px-3 py-4 text-sm font-semibold transition-colors ${
                    activeTab === id
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </section>

        {/* Tab Content */}
        <section className="mx-auto max-w-[1380px] px-5 pb-24 sm:px-8 lg:px-12">
          {activeTab === "overview" && (
            <div className="space-y-16">
              {/* Portfolio Summary Cards */}
              <div>
                <h2 className="mb-8 text-2xl font-semibold tracking-tight">At a Glance</h2>
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Total Projects", value: portfolioMetrics.totalProjects.toString() },
                    { label: "Verified Claims", value: portfolioMetrics.verifiedClaims.toString() },
                    { label: "Unique Skills", value: portfolioMetrics.techStackSize.toString() },
                    { label: "Avg Evidence/project", value: portfolioMetrics.avgEvidencePerProject.toFixed(1) },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-border bg-border p-6"
                    >
                      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
                      <dd className="mt-2 text-4xl font-bold tracking-tight">{value}</dd>
                    </div>
                  ))}
                </dl>

                {/* Stage Distribution */}
                <div className="mt-8 rounded-2xl border border-border bg-border p-6">
                  <h3 className="mb-4 text-lg font-semibold tracking-tight">Project Stages</h3>
                  <div className="flex flex-wrap gap-4">
                    {[
                      { label: "Production", count: portfolioMetrics.stageDistribution.production, color: "bg-emerald-500" },
                      { label: "Beta", count: portfolioMetrics.stageDistribution.beta, color: "bg-blue-500" },
                      { label: "Alpha", count: portfolioMetrics.stageDistribution.alpha, color: "bg-yellow-500" },
                      { label: "Historical", count: portfolioMetrics.stageDistribution.historical, color: "bg-slate-500" },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className={`size-3 rounded-full ${color}`} />
                        <span className="text-sm font-medium">{label}</span>
                        <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Access Links */}
              <div>
                <h2 className="mb-8 text-2xl font-semibold tracking-tight">Explore Deeply</h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    {
                      title: "Analyze Your Resume",
                      description: "Upload to see how your skills align with demonstrated capabilities",
                      link: "/analytics/resume",
                      icon: FileText,
                    },
                    {
                      title: "Skill Proficiency Map",
                      description: "Interactive visualization of expertise levels across 14 tracked skills",
                      link: "/analytics/skills",
                      icon: BarChart3,
                    },
                    {
                      title: "Project Complexity Analysis",
                      description: "Multi-dimensional scoring: architecture, innovation, evidence density",
                      link: "/analytics/complexity",
                      icon: TrendingUp,
                    },
                    {
                      title: "Evidence Verification Timeline",
                      description: "When each claim was last verified by CI - transparent proof tracking",
                      link: "/analytics/verification",
                      icon: Calendar,
                    },
                    {
                      title: "Capability Evolution",
                      description: "How technical skills grew over time through shipped projects",
                      link: "/analytics/evolution",
                      icon: GitBranch,
                    },
                  ].map(({ title, description, link, icon: Icon }) => (
                    <Link
                      key={title}
                      to={link}
                      className="group block rounded-2xl border border-border bg-border p-6 transition-all hover:border-foreground/40 hover:bg-foreground/5"
                    >
                      <Icon className="size-5 text-muted-foreground transition-colors group-hover:text-foreground" />
                      <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                      <span className="mt-4 inline-flex items-center text-sm font-semibold text-foreground/80 group-hover:text-foreground">
                        Explore →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* How to Use This Data */}
              <div>
                <h2 className="mb-8 text-2xl font-semibold tracking-tight">For Hiring Managers & Evaluators</h2>
                <div className="rounded-2xl border border-border bg-border p-8">
                  <ol className="space-y-6">
                    {[
                      {
                        step: "Review Skills Heatmap",
                        description: "See proficiency levels backed by actual shipped projects, not just buzzwords."
                      },
                      {
                        step: "Check Project Complexity",
                        description: "Understand architectural decisions and innovation factor for each deliverable."
                      },
                      {
                        step: "Analyze Evidence Timeline",
                        description: "When claims were verified - transparent proof tracking shows current vs. stale assertions."
                      },
                      {
                        step: "Upload Candidate Resume",
                        description: "Get instant skill gap analysis showing matches and missing competencies."
                      },
                      {
                        step: "Study Capability Evolution",
                        description: "How skills grew through real-world shipping pressure, not tutorial consumption."
                      }
                    ].map(({ step, description }) => (
                      <li key={step} className="flex gap-4">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-sm font-bold text-foreground">
                          {step.split(" ")[0]}
                        </span>
                        <div>
                          <p className="font-semibold">{step}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          )}

          {activeTab === "resume" && (
            <div className="max-w-4xl">
              <ResumeAnalyzer />
            </div>
          )}

          {activeTab === "skills" && (
            <div className="max-w-6xl">
              <SkillsHeatmap />
            </div>
          )}

          {activeTab === "complexity" && (
            <div className="max-w-6xl">
              <ProjectComplexityVisualizer />
            </div>
          )}

          {activeTab === "verification" && (
            <div className="max-w-6xl">
              <EvidenceVerificationTimeline />
            </div>
          )}

          {activeTab === "evolution" && (
            <div className="max-w-6xl">
              <CapabilityEvolutionTimeline />
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
