import { ArrowRight, BarChart3, Briefcase, Calendar, CheckCircle2, FileText, Globe, GitBranch, Grid, Hash, LayoutTemplate, ShieldAlert, ShieldCheck, TrendingUp } from "lucide-react";
import { Link } from "react-router";
import { SiteFooter, SiteHeader } from "@/components/portfolio/SiteChrome";
import { SiteMetadata } from "@/components/portfolio/SiteMetadata";
import { PROJECT_ANALYTICS_TITLE, PROJECT_ANALYTICS_DESCRIPTION, collectionGraph } from "@/data/registry/structured-data.mjs";
import { ResumeAnalyzer } from "@/components/portfolio/ResumeAnalyzer";
import { SkillsHeatmap } from "@/components/portfolio/SkillsHeatmap";
import { ProjectComplexityVisualizer } from "@/components/portfolio/ProjectComplexityVisualizer";
import { EvidenceVerificationTimeline } from "@/components/portfolio/EvidenceVerificationTimeline";
import { CapabilityEvolutionTimeline } from "@/components/portfolio/CapabilityEvolutionTimeline";
import { InteractivePortfolioSimulator } from "@/components/portfolio/InteractivePortfolioSimulator";
import { ProjectRiskScorecard } from "@/components/portfolio/ProjectRiskScorecard";
import { HiringDecisionScorecard } from "@/components/portfolio/HiringDecisionScorecard";
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
  const [activeTab, setActiveTab] = useState<"overview" | "resume" | "skills" | "complexity" | "verification" | "evolution" | "simulator" | "risk" | "hiring">("overview");

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
        {/* Hero Section */}
        <section className="mx-auto max-w-[1380px] px-5 pb-24 pt-36 sm:px-8 lg:px-12">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-emerald-600/5 p-10 sm:p-14 lg:p-16 backdrop-blur-sm">
            {/* Animated Gradient Orbs */}
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              <div className="absolute left-0 top-0 -z-10 h-full w-full">
                <div className="absolute -left-20 -top-20 h-96 w-96 animate-pulse rounded-full bg-blue-400/10 blur-3xl" />
                <div className="absolute -bottom-20 -right-20 h-96 w-96 animate-pulse rounded-full bg-purple-400/10 blur-3xl [animation-delay:1000ms]" />
                <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-emerald-400/10 blur-3xl [animation-delay:2000ms]" />
              </div>
            </div>
            
            <h1 className="text-center text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent">
              Portfolio Intelligence Platform
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-muted-foreground">
              Advanced analytics on engineering work — capability distribution, project complexity scoring,
              evidence density metrics, and automated hiring recommendations. Everything derived from proven claims.
            </p>
          
            
            {/* Quick Stats */}
            <dl className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Projects", value: portfolioMetrics.totalProjects.toString(), icon: Hash },
                { label: "Verified Claims", value: portfolioMetrics.verifiedClaims.toString(), icon: CheckCircle2 },
                { label: "Skills Tracked", value: portfolioMetrics.techStackSize.toString(), icon: Briefcase },
                { label: "Live Deployments", value: `${portfolioMetrics.stageDistribution.production}`, icon: Globe },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-xl bg-white/5 p-6 backdrop-blur-sm">
                  <dt className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Icon className="size-4" aria-hidden="true" /> {label}
                  </dt>
                  <dd className="mt-2 text-center text-3xl font-bold tracking-tight">{value}</dd>
                </div>
              ))}
            </dl>
            
            {/* Featured Features */}
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Resume Analysis", desc: "Instant skill compatibility scoring", link: "/analytics/resume", icon: FileText },
                { title: "Complexity Matrix", desc: "Multi-axis architectural depth scoring", link: "/analytics/complexity", icon: TrendingUp },
                { title: "Hiring Assessment", desc: "Data-driven candidate evaluation", link: "/analytics/hiring", icon: ShieldCheck },
              ].map(({ title, desc, link, icon: Icon }) => (
                <a
                  key={title}
                  href={link}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-purple-500/40 hover:bg-white/10 hover:shadow-lg"
                >
                  <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-emerald-500/10 blur-2xl transition-all duration-700 group-hover:scale-150 group-hover:opacity-100" />
                  <Icon className="relative z-10 size-8 text-purple-600 dark:text-purple-400 transition-colors group-hover:text-purple-500" aria-hidden="true" />
                  <h3 className="relative z-10 mt-4 text-lg font-semibold transition-colors group-hover:text-purple-600 dark:group-hover:text-purple-400">{title}</h3>
                  <p className="relative z-10 mt-2 text-sm text-foreground/70">{desc}</p>
                  <div className="relative z-10 mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-400 opacity-0 transition-all duration-300 group-hover:translate-x-2 group-hover:opacity-100">
                    Explore Feature <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </a>
              ))}
            </div>
          </div>
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
                { id: "simulator", label: "Challenge Simulator", icon: LayoutTemplate },
                { id: "risk", label: "Risk Scorecard", icon: ShieldAlert },
                { id: "hiring", label: "Hiring Scorecard", icon: ShieldCheck },
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
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    { label: "Total Projects", value: portfolioMetrics.totalProjects.toString(), icon: Hash },
                    { label: "Verified Claims", value: portfolioMetrics.verifiedClaims.toString(), icon: CheckCircle2 },
                    { label: "Unique Skills", value: portfolioMetrics.techStackSize.toString(), icon: Briefcase },
                    { label: "Avg Evidence/Project", value: portfolioMetrics.avgEvidencePerProject.toFixed(1), icon: FileText },
                    { label: "Live Deployments", value: `${portfolioMetrics.stageDistribution.production}`, icon: Globe },
                  ].map(({ label, value, icon: Icon }) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-border bg-border p-6"
                    >
                      <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Icon className="size-4" aria-hidden="true" /> {label}
                      </dt>
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
                    {
                      title: "Challenge Simulator",
                      description: "Walk through real engineering decisions made during development",
                      link: "/analytics/simulator",
                      icon: LayoutTemplate,
                    },
                    {
                      title: "Risk Scorecard",
                      description: "Where projects might fail - transparency about technical debt",
                      link: "/analytics/risk",
                      icon: ShieldAlert,
                    },
                    {
                      title: "Featured Projects",
                      description: "Production-ready work with proven impact and fresh verification",
                      link: "/projects?featured=true",
                      icon: Grid,
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

              {/* For Hiring Managers */}
              <div>
                <h2 className="mb-8 text-2xl font-semibold tracking-tight">For Hiring Managers & Evaluators</h2>
                <div className="rounded-2xl border border-border bg-gradient-to-r from-emerald-500/5 via-blue-500/5 to-purple-500/5 p-8">
                  <p className="mb-6 text-lg leading-7 text-muted-foreground">
                    Use this platform to evaluate technical competence through actual shipped work, not resumes. Every metric is derived from verified evidence.
                  </p>
                  <ol className="space-y-4">
                    {[
                      { step: "Review Skills Heatmap", desc: "Proficiency levels backed by shipped projects" },
                      { step: "Check Complexity Scores", desc: "Architectural depth across all deliverables" },
                      { step: "Analyze Evidence Timeline", desc: "Verify what's current vs. stale claims" },
                      { step: "Study Growth Trajectory", desc: "Skill evolution through shipping pressure" },
                      { step: "Walk Challenge Simulator", desc: "Experience real engineering decision-making" },
                      { step: "Evaluate Risk Factors", desc: "Understand where projects might need maintenance" },
                      { step: "Review Hire Recommendation", desc: "Data-driven candidate assessment scorecard" }
                    ].map(({ step, desc }, i) => (
                      <li key={step} className="flex items-start gap-4 rounded-xl bg-background/50 p-4 transition-colors hover:bg-foreground/5">
                        <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          i < 3 ? "bg-emerald-500 text-white" :
                          i < 6 ? "bg-blue-500 text-white" :
                          "bg-purple-500 text-white"
                        }`}>
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-semibold">{step}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  
                  {/* Quick Action Cards */}
                  <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      { title: "Start Assessment", link: "/analytics/hiring", icon: ShieldCheck, color: "from-emerald-500 to-emerald-600" },
                      { title: "Compare Projects", link: "/compare", icon: Grid, color: "from-blue-500 to-blue-600" },
                      { title: "View Live Work", link: "/projects?featured=true", icon: Globe, color: "from-purple-500 to-purple-600" },
                    ].map(({ title, link, icon: Icon, color }) => (
                      <a
                        key={title}
                        href={link}
                        className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${color} p-6 text-white transition-all hover:shadow-lg`}
                      >
                        <Icon className="size-6 opacity-90" aria-hidden="true" />
                        <h4 className="mt-3 text-lg font-semibold">{title}</h4>
                        <p className="mt-1 text-sm opacity-90">Open in new tab →</p>
                      </a>
                    ))}
                  </div>
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

          {activeTab === "simulator" && (
            <div className="max-w-6xl">
              <InteractivePortfolioSimulator />
            </div>
          )}

          {activeTab === "risk" && (
            <div className="max-w-6xl">
              <ProjectRiskScorecard />
            </div>
          )}

          {activeTab === "hiring" && (
            <div className="max-w-6xl">
              <HiringDecisionScorecard />
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
