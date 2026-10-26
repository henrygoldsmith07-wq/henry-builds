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
import { useState, useEffect } from "react";

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
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isMouseDown, setIsMouseDown] = useState(false);

  // Track cursor position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseDown = () => setIsMouseDown(true);
    const handleMouseUp = () => setIsMouseDown(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

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
      {/* Cursor follower */}
      <div 
        className="pointer-events-none fixed inset-0 -z-50"
        style={{ zIndex: -1 }}
      >
        {/* Multi-layer glow effect */}
        {[...Array(3)].map((_, layer) => (
          <div
            key={`glow-${layer}`}
            className="absolute rounded-full transition-all duration-75 ease-out"
            style={{
              width: `${96 - layer * 32}px`,
              height: `${96 - layer * 32}px`,
              left: cursorPosition.x - 48 + layer * 16,
              top: cursorPosition.y - 48 + layer * 16,
              transform: `translate(-50%, -50%) scale(${isMouseDown ? 1.8 : 1}) rotate(${cursorPosition.x * (0.05 - layer * 0.01)}deg)`,
              background: `radial-gradient(circle, ${['rgba(59,130,246,0.3)', 'rgba(168,85,247,0.25)', 'rgba(16,185,129,0.2)'][layer]} 0%, transparent 70%)`,
              filter: `blur(${36 - layer * 8}px)`,
              opacity: isMouseDown ? 0.6 : 0.4,
              animation: `pulse-${layer === 0 ? 'fast' : layer === 1 ? 'medium' : 'slow'}_${Date.now()}_infinite`,
            }}
          />
        ))}
        
        {/* Core cursor marker */}
        <div
          className="fixed pointer-events-none z-[9999]"
          style={{
            left: cursorPosition.x,
            top: cursorPosition.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Inner core dot */}
          <div
            className="h-2 w-2 rounded-full bg-white animate-pulse shadow-[0_0_20px_rgba(255,255,255,0.8)]"
          />
          
          {/* Outer ring */}
          <div
            className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-purple-500/50"
            style={{
              animation: 'ring-expand_1.5s_ease-out_infinite',
            }}
          />
          
          {/* Secondary rotating ring */}
          <div
            className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-transparent border-t-purple-500/70 border-b-blue-500/70"
            style={{
              animation: 'ring-spin_2s_linear_infinite',
            }}
          />
        </div>
        
        {/* Extended particle trail system */}
        {[...Array(20)].map((_, i) => {
          const angle = (i / 20) * Math.PI * 4;
          const distance = 20 + i * 8;
          return (
            <div
              key={`trail-${i}`}
              className="fixed pointer-events-none"
              style={{
                left: cursorPosition.x + Math.cos(angle) * distance,
                top: cursorPosition.y + Math.sin(angle) * distance,
                width: `${3 - i * 0.1}px`,
                height: `${3 - i * 0.1}px`,
                backgroundColor: ['rgba(59,130,246,0.5)', 'rgba(168,85,247,0.5)', 'rgba(16,185,129,0.5)'][i % 3],
                borderRadius: i % 3 === 0 ? '50%' : i % 3 === 1 ? '3px' : 'clip-path-polygon(50% 0%, 0% 100%, 100% 100%)',
                opacity: 1 - i * 0.05,
                transform: `scale(${1 - i * 0.04})`,
                filter: 'blur(1px)',
                animationDelay: `${i * 0.05}s`,
                transition: 'all 0.1s ease-out',
              }}
            />
          );
        })}
        
        {/* Magnetic attraction field lines */}
        {[...Array(8)].map((_, i) => (
          <div
            key={`field-${i}`}
            className="fixed pointer-events-none"
            style={{
              left: cursorPosition.x,
              top: cursorPosition.y,
              width: `${100 + i * 25}px`,
              height: `${2}px`,
              transform: `translate(-50%, -50%) rotate(${i * 22.5}deg)`,
              backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.3) 50%, transparent 100%)',
              opacity: isMouseDown ? 0.5 : 0.3,
              animation: 'field-wobble_2s_ease-in-out_infinite',
              animationDelay: `${i * 0.25}s`,
            }}
          />
        ))}
        
        {/* Ripple effect on clicks */}
        {isMouseDown && (
          <div
            className="fixed pointer-events-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999]"
            style={{
              animation: 'ripple-click_0.8s_ease-out_forwards',
            }}
          >
            {[...Array(3)].map((_, r) => (
              <div
                key={r}
                className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                style={{
                  borderColor: ['rgba(59,130,246,0.6)', 'rgba(168,85,247,0.6)', 'rgba(16,185,129,0.6)'][r],
                  animation: `ripple-expand_${r}_0.8s_ease-out_forwards`,
                  width: `${64 + r * 32}px`,
                  height: `${64 + r * 32}px`,
                }}
              />
            ))}
          </div>
        )}
        
        {/* Spark burst on click */}
        {isMouseDown && (
          <div
            className="fixed pointer-events-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999]"
          >
            {[...Array(12)].map((_, s) => (
              <div
                key={`spark-${s}`}
                className="absolute h-1.5 w-1.5"
                style={{
                  left: '50%',
                  top: '50%',
                  backgroundColor: ['#3b82f6', '#a855f7', '#10b981'][s % 3],
                  transformOrigin: 'center',
                  transform: `rotate(${s * 30}deg) translateX(40px)`,
                  borderRadius: '50%',
                  opacity: 0,
                  animation: `spark-explode_${s * 0.05}_0.6s_cubic-bezier(0.4, 0, 0.2, 1)_forwards`,
                }}
              />
            ))}
          </div>
        )}
      </div>
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
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-emerald-600/5 p-10 sm:p-14 lg:p-16 backdrop-blur-sm ring-1 ring-white/10 shadow-xl">
            {/* Animated Gradient Orbs with Enhanced Motion */}
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              <div className="absolute left-0 top-0 -z-10 h-full w-full">
                {/* Primary large orbs with chromatic aberration */}
                <div className="absolute -left-20 -top-20 h-96 w-96 animate-pulse rounded-full bg-blue-400/10 blur-3xl [animation-delay:0ms]">
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 via-transparent to-purple-500/20 blur-sm" />
                </div>
                <div className="absolute -bottom-20 -right-20 h-96 w-96 animate-pulse rounded-full bg-purple-400/10 blur-3xl [animation-delay:750ms]">
                  <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 via-transparent to-emerald-500/20 blur-sm" />
                </div>
                <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-emerald-400/10 blur-3xl [animation-delay:1500ms]">
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 via-transparent to-blue-500/20 blur-sm" />
                </div>
                
                {/* Secondary medium orbs with bloom */}
                <div className="absolute bottom-1/4 left-1/4 h-64 w-64 animate-pulse rounded-full bg-blue-300/5 blur-2xl [animation-delay:500ms] shadow-[0_0_40px_rgba(59,130,246,0.3)]" />
                <div className="absolute top-1/4 right-1/4 h-64 w-64 animate-pulse rounded-full bg-purple-300/5 blur-2xl [animation-delay:1250ms] shadow-[0_0_40px_rgba(168,85,247,0.3)]" />
                
                {/* Tertiary small sparkles with pulse intensity */}
                <div className="absolute left-1/3 top-1/3 h-32 w-32 animate-pulse rounded-full bg-emerald-300/5 blur-xl [animation-delay:250ms]" />
                <div className="absolute right-1/3 bottom-1/3 h-32 w-32 animate-pulse rounded-full bg-blue-300/5 blur-xl [animation-delay:1000ms]" />
                
                {/* Dynamic sparkle particles with twinkle effect */}
                {['sparkle-1', 'sparkle-2', 'sparkle-3', 'sparkle-4', 'sparkle-5'].map((id) => (
                  <div
                    key={id}
                    id={id}
                    className="absolute h-1.5 w-1.5 rotate-45 rounded-full bg-white/30 animate-[twinkle_2s_ease-in-out_infinite]"
                    style={{
                      left: `${[15, 45, 70, 25, 85][parseInt(id.split('-')[1])]}%`,
                      top: `${[20, 55, 35, 75, 60][parseInt(id.split('-')[1])]}%`,
                      opacity: Math.random() * 0.5 + 0.3,
                    }}
                  />
                ))}
                
                {/* Shooting stars */}
                {[...Array(3)].map((_, i) => (
                  <div
                    key={`star-${i}`}
                    className="absolute h-40 w-1 rotate-[-45deg] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0"
                    style={{
                      left: `${20 + i * 25}%`,
                      top: '-10%',
                      animation: `shooting-star ${8 + i * 2}s linear infinite`,
                      animationDelay: `${i * 2.5}s`,
                    }}
                  />
                ))}
                
                {/* Subtle grid overlay pattern */}
                <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
                
                {/* Radial gradient spotlight with flicker */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_rgba(168,85,247,0.1)_0%,transparent_75%)] animate-[pulse_4s_ease-in-out_infinite]" />
                
                {/* Atmospheric haze layers */}
                <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 via-transparent to-purple-500/5 animate-[float-haze_10s_ease-in-out_infinite]" />
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-blue-500/5 animate-[float-haze_10s_ease-in-out_infinite_reverse]" />
              </div>
              
              {/* Floating glass orbs with depth perception */}
              <div className="absolute inset-0 -z-10 overflow-hidden">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md transition-opacity duration-500 hover:opacity-100"
                    style={{
                      width: `${8 + Math.random() * 12}px`,
                      height: `${8 + Math.random() * 12}px`,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animation: `float-orb ${4 + Math.random() * 5}s ease-in-out infinite`,
                      animationDelay: `${Math.random() * 4}s`,
                      filter: `blur(${Math.random() * 2}px)`,
                      transform: `translateZ(${Math.random() * 50 - 25}px)`,
                    }}
                  />
                ))}
              </div>
              
              {/* Magnetic field lines */}
              {[...Array(5)].map((_, i) => (
                <div
                  key={`field-${i}`}
                  className="absolute h-px w-full bg-gradient-to-r from-transparent via-purple-500/5 to-transparent"
                  style={{
                    top: `${20 + i * 15}%`,
                    animation: `field-wave ${6 + i}s ease-in-out infinite`,
                    animationDelay: `${i * 1.2}s`,
                  }}
                />
              ))}
            </div>
            
            {/* Wave pattern overlay */}
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              <svg className="absolute left-0 top-0 h-full w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(168,85,247,0)" />
                    <stop offset="50%" stopColor="rgba(168,85,247,0.1)" />
                    <stop offset="100%" stopColor="rgba(168,85,247,0)" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,30 Q25,60 50,30 T100,30 T150,30 T200,30 V150 H0 Z"
                  fill="url(#wave-gradient)"
                  className="animate-[move-wave_15s_linear_infinite]"
                />
                <path
                  d="M0,60 Q25,90 50,60 T100,60 T150,60 T200,60 V150 H0 Z"
                  fill="url(#wave-gradient)"
                  style={{ animationDelay: '-7.5s' }}
                  className="animate-[move-wave_15s_linear_infinite]"
                />
              </svg>
            </div>
            
            <h1 className="text-center text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent animate-[fade-in-up_0.6s_ease-out]">
              Portfolio Intelligence Platform
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-muted-foreground animate-[fade-in-up_0.8s_ease-out]">
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
              ].map(({ label, value, icon: Icon }, index) => (
                <div key={label} className="group relative overflow-hidden rounded-xl bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:shadow-lg hover:scale-[1.02] animate-[fade-in-up_1s_ease-out_forwards] opacity-0" style={{ animationDelay: `${1 + index * 0.15}s` }}>
                  {/* Subtle gradient overlay on hover */}
                  <div className="absolute inset-0 -z-10 bg-gradient-to-br from-transparent to-white/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  
                  {/* Inner glow ring that expands on hover */}
                  <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:scale-150">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-emerald-500/10 blur-lg shadow-[0_0_60px_rgba(168,85,247,0.4)]" />
                  </div>
                  
                  {/* Animated border gradient with intensity pulse */}
                  <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-blue-500/0 via-purple-500/20 to-emerald-500/0 opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:animate-[shimmer-border_2s_linear_infinite]" style={{ backgroundSize: '200% 100%' }} />
                  
                  {/* Gradient intensity pulsing on active state */}
                  <div className="absolute inset-0 -z-10 animate-[pulse-gradient_4s_ease-in-out_infinite] bg-gradient-to-br from-blue-500/3 via-purple-500/3 to-emerald-500/3 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ mixBlendMode: 'overlay' }} />
                  
                  <dt className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                    <Icon className="size-4 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" aria-hidden="true" /> {label}
                  </dt>
                  <dd className="mt-2 text-center text-3xl font-bold tracking-tight transition-all duration-300 group-hover:text-purple-600 dark:group-hover:text-purple-400">{value}</dd>
                  
                  {/* Ripple effect on hover with decay */}
                  <div className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    <div className="absolute inset-0 animate-[spin_3s_linear_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent rotate-45" />
                    <div className="absolute inset-0 animate-[ripple_2s_ease-out_forwards] scale-150 border border-white/20 rounded-xl" />
                  </div>
                  
                  {/* Corner glows with rotation */}
                  <div className="absolute -left-4 -top-4 h-8 w-8 rounded-full bg-blue-500/10 blur-md opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-150 group-hover:-rotate-12" />
                  <div className="absolute -bottom-4 -right-4 h-8 w-8 rounded-full bg-purple-500/10 blur-md opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-150 group-hover:rotate-12" />
                  
                  {/* Sparkle burst on hover */}
                  <div className="pointer-events-none absolute inset-0 -z-10">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute h-1.5 w-1.5 rotate-45 rounded-full bg-purple-500/40 opacity-0 transition-all duration-500 group-hover:opacity-100"
                        style={{
                          left: `${[25, 50, 75, 50][i]}%`,
                          top: `${[25, 25, 25, 75][i]}%`,
                          transform: `translate(-50%, -50%) rotate(${index * 90 + i * 45}deg)`,
                          animation: `sparkle-burst ${0.8 + (i * 0.1)}s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                          animationDelay: `${0.3 + (i * 0.1)}s`,
                        }}
                      />
                    ))}
                  </div>
                  
                  {/* Magnetic attraction effect */}
                  <div className="pointer-events-none absolute inset-0 -z-10">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={`mag-${i}`}
                        className="absolute h-12 w-12 rounded-full border border-purple-500/10 opacity-0 transition-all duration-300 group-hover:opacity-100"
                        style={{
                          animation: `magnetic-pulse ${2 + i * 0.5}s ease-in-out infinite`,
                          animationDelay: `${i * 0.3}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </dl>
            
            {/* Featured Features */}
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Resume Analysis", desc: "Instant skill compatibility scoring", link: "/analytics/resume", icon: FileText },
                { title: "Complexity Matrix", desc: "Multi-axis architectural depth scoring", link: "/analytics/complexity", icon: TrendingUp },
                { title: "Hiring Assessment", desc: "Data-driven candidate evaluation", link: "/analytics/hiring", icon: ShieldCheck },
              ].map(({ title, desc, link, icon: Icon }, index) => (
                <a
                  key={title}
                  href={link}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:border-purple-500/40 hover:bg-white/10 hover:shadow-lg hover:scale-[1.02] animate-[fade-in-up_1.2s_ease-out_forwards] opacity-0"
                  style={{ animationDelay: `${1.2 + index * 0.2}s`, transformStyle: 'preserve-3d' }}
                >
                  {/* Animated gradient background on hover with bloom */}
                  <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-emerald-500/10 blur-2xl shadow-[0_0_60px_rgba(168,85,247,0.3)] transition-all duration-700 group-hover:scale-150 group-hover:opacity-100" />
                  
                  {/* Subtle shine effect */}
                  <div className="pointer-events-none absolute -left-20 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-white/5 blur-2xl transition-all duration-700 group-hover:opacity-0" />
                  
                  {/* Gradient border reveal on mount */}
                  <div className="absolute inset-0 -z-10 scale-95 opacity-0 transition-all duration-500 group-hover:scale-100 group-hover:opacity-100 bg-gradient-to-br from-transparent via-purple-500/5 to-transparent" />
                  
                  {/* Animated border shimmer with gradient pulse */}
                  <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-blue-500/0 via-purple-500/15 to-emerald-500/0 opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:animate-[shimmer-border_2s_linear_infinite]" style={{ backgroundSize: '200% 100%' }} />
                  
                  {/* Gradient intensity pulsing */}
                  <div className="absolute inset-0 -z-10 animate-[pulse-gradient_4s_ease-in-out_infinite] bg-gradient-to-br from-blue-500/3 via-purple-500/3 to-emerald-500/3 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ mixBlendMode: 'overlay' }} />
                  
                  {/* 3D perspective effect container */}
                  <div className="relative z-10 transition-all duration-500 group-hover:[transform:rotateX(5deg)_rotateY(-5deg)_rotateZ(2deg)_perspective(1000px)]">
                    {/* Icon with chromatic aberration effect */}
                    <div className="relative flex justify-center">
                      <Icon className="relative z-10 size-8 text-purple-600 dark:text-purple-400 transition-all duration-300 group-hover:text-purple-500 group-hover:scale-110 group-hover:-rotate-6 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" aria-hidden="true" />
                    </div>
                    <h3 className="relative z-10 mt-4 text-lg font-semibold transition-colors duration-300 group-hover:text-purple-600 dark:group-hover:text-purple-400">{title}</h3>
                    <p className="relative z-10 mt-2 text-sm text-foreground/70 transition-colors duration-300 group-hover:text-foreground">{desc}</p>
                    <div className="relative z-10 mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-400 opacity-0 transition-all duration-300 group-hover:translate-x-2 group-hover:opacity-100">
                      Explore Feature <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:rotate-12 drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]" />
                    </div>
                  </div>
                  
                  {/* Shimmer sweep across card on hover */}
                  <div className="pointer-events-none absolute inset-0 -z-10 translate-x-[-150%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[150%]" />
                  
                  {/* Floating particles on hover */}
                  {index === 0 && (
                    <>
                      <div className="absolute left-4 top-4 h-1.5 w-1.5 rounded-full bg-blue-500/40 opacity-0 transition-all duration-300 group-hover:opacity-100 animate-[float_3s_ease-in-out_infinite]" />
                      <div className="absolute right-6 bottom-6 h-1.5 w-1.5 rounded-full bg-purple-500/40 opacity-0 transition-all duration-300 group-hover:opacity-100 animate-[float_3s_ease-in-out_infinite_0.5s_delay]" />
                    </>
                  )}
                  
                  {/* Starburst effect on hover */}
                  <div className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-all duration-500 group-hover:opacity-100">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`absolute h-1.5 w-1.5 rounded-full bg-gradient-to-r from-${['blue', 'purple', 'emerald', 'blue', 'purple'][i]}-500/40`}
                        style={{
                          left: '50%',
                          top: '50%',
                          width: ['3px', '4px', '3px', '5px', '3px'][i],
                          height: ['3px', '4px', '3px', '5px', '3px'][i],
                          transformOrigin: 'center',
                          animation: `starburst ${0.6 + (i * 0.1)}s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                          animationDelay: `${0.2 + (i * 0.08)}s`,
                        }}
                      />
                    ))}
                  </div>
                  
                  {/* Magnetic field rings */}
                  <div className="pointer-events-none absolute inset-0 -z-10">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={`field-ring-${i}`}
                        className="absolute inset-0 rounded-2xl border border-purple-500/10 opacity-0 transition-all duration-500 group-hover:opacity-100"
                        style={{
                          animation: `magnetic-rings ${2.5 + i}s ease-in-out infinite`,
                          animationDelay: `${i * 0.4}s`,
                        }}
                      />
                    ))}
                  </div>
                  
                  {/* Vortex particle effect */}
                  <div className="pointer-events-none absolute inset-0 -z-10">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={`vortex-${i}`}
                        className="absolute h-1 w-1 rounded-full bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-emerald-500/40 opacity-0 transition-all duration-500 group-hover:opacity-100"
                        style={{
                          left: '50%',
                          top: '50%',
                          animation: `vortex-particle ${1.2 + (i * 0.2)}s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                          animationDelay: `${0.4 + (i * 0.1)}s`,
                        }}
                      />
                    ))}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section className="border-b border-border bg-background/50 backdrop-blur-sm">
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
              ].map(({ id, label, icon: Icon }, index) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as typeof activeTab)}
                  className={`group relative flex items-center gap-2 border-b-2 px-3 py-4 text-sm font-semibold transition-all duration-300 animate-[fade-in_0.5s_ease-out_forwards] opacity-0`}
                  style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                >
                  {/* Tab indicator glow effect */}
                  {activeTab === id && (
                    <>
                      <span className="absolute inset-x-0 -bottom-px mx-auto w-1/2 rounded-full bg-gradient-to-r from-transparent via-purple-500/20 to-transparent blur-sm shadow-[0_0_20px_rgba(168,85,247,0.3)]" />
                      <span className="absolute -inset-px -z-10 animate-[pulse-circular_2s_ease-infinite] rounded-full bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-emerald-500/10 opacity-0 shadow-[0_0_40px_rgba(168,85,247,0.2)]" />
                      
                      {/* Particle emission trail when active */}
                      {[...Array(3)].map((_, i) => (
                        <span
                          key={`trail-${i}`}
                          className="absolute -inset-px -z-10 animate-[particle-trail_1.5s_ease-out_infinite]"
                          style={{
                            background: `radial-gradient(circle, rgba(168,85,247,${0.3 - i * 0.1}) 0%, transparent 70%)`,
                            animationDelay: `${i * 0.4}s`,
                          }}
                        />
                      ))}
                    </>
                  )}
                  
                  {/* Magnetic hover effect on icon container */}
                  <span className={`relative inline-flex items-center justify-center overflow-hidden ${activeTab === id ? '' : 'group-hover:[transform:rotate(-6deg)_scale(1.15)]'}`}>
                    {/* Glow halo behind icon */}
                    <span className={`absolute inset-0 m-auto h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-emerald-500/20 opacity-0 transition-all duration-300 group-hover:opacity-100 ${activeTab === id ? '!opacity-100' : ''} blur-md`} />
                    
                    <Icon className={`relative z-10 size-4 transition-all duration-300 ${activeTab === id ? "scale-110 rotate-3" : "group-hover:scale-110"} ${activeTab === id ? "text-foreground drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" : "text-muted-foreground"}`} aria-hidden="true" />
                    
                    {/* Icon sparkle burst on hover */}
                    {!activeTab === id && (
                      <div className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        {[...Array(4)].map((_, i) => (
                          <span
                            key={`icon-sparkle-${i}`}
                            className="absolute h-1 w-1 rotate-45 rounded-full bg-white/60"
                            style={{
                              left: `${[25, 50, 75, 50][i]}%`,
                              top: `${[25, 25, 25, 75][i]}%`,
                              animation: `icon-sparkle ${0.6 + (i * 0.15)}s ease-out forwards`,
                              animationDelay: `${0.2 + (i * 0.1)}s`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </span>
                  
                  <span className={`transition-all duration-300 ${activeTab === id ? "tracking-wide" : ""}`}>{label}</span>
                  
                  {/* Hover underline slide-in with gradient flow */}
                  <span className={`absolute bottom-0 left-0 right-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 transition-transform duration-300 group-hover:scale-x-100 ${activeTab === id ? 'scale-x-100' : ''} animate-gradient-shift`} style={{ animationDuration: '3s' }} />
                  
                  {/* Corner markers */}
                  {index === 0 && (
                    <span className="absolute left-0 top-0 h-2 w-2 border-l border-t border-purple-500/30" />
                  )}
                  {index === 8 && (
                    <span className="absolute right-0 top-0 h-2 w-2 border-r border-t border-purple-500/30" />
                  )}
                </button>
              ))}
            </nav>
            
            {/* Tab content gradient line with subtle pulse */}
            <div className="mt-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent animate-pulse" />
            
            {/* Decorative corner accents */}
            <div className="absolute left-0 top-0 h-8 w-8 pointer-events-none">
              <svg viewBox="0 0 32 32" className="h-full w-full">
                <path d="M0,32 L0,8 Q0,0 8,0 L32,0" fill="none" stroke="url(#corner-gradient)" strokeWidth="2" strokeLinecap="round" />
                <defs>
                  <linearGradient id="corner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(59,130,246,0)" />
                    <stop offset="50%" stopColor="rgba(168,85,247,0.3)" />
                    <stop offset="100%" stopColor="rgba(16,185,129,0)" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="absolute right-0 top-0 h-8 w-8 pointer-events-none">
              <svg viewBox="0 0 32 32" className="h-full w-full">
                <path d="M32,32 L24,32 Q16,32 16,24 L0,24" fill="none" stroke="url(#corner-gradient-2)" strokeWidth="2" strokeLinecap="round" />
                <defs>
                  <linearGradient id="corner-gradient-2" x1="100%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="rgba(16,185,129,0)" />
                    <stop offset="50%" stopColor="rgba(168,85,247,0.3)" />
                    <stop offset="100%" stopColor="rgba(59,130,246,0)" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </section>

        {/* Tab Content */}
        <section className="mx-auto max-w-[1380px] px-5 pb-24 sm:px-8 lg:px-12">
          {activeTab === "overview" && (
            <div className="space-y-16 animate-[fade-in_0.5s_ease-out]">
              {/* Portfolio Summary Cards */}
              <div className="animate-[fade-in-up_0.6s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.5s' }}>
                <h2 className="mb-8 text-2xl font-semibold tracking-tight">At a Glance</h2>
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    { label: "Total Projects", value: portfolioMetrics.totalProjects.toString(), icon: Hash },
                    { label: "Verified Claims", value: portfolioMetrics.verifiedClaims.toString(), icon: CheckCircle2 },
                    { label: "Unique Skills", value: portfolioMetrics.techStackSize.toString(), icon: Briefcase },
                    { label: "Avg Evidence/Project", value: portfolioMetrics.avgEvidencePerProject.toFixed(1), icon: FileText },
                    { label: "Live Deployments", value: `${portfolioMetrics.stageDistribution.production}`, icon: Globe },
                  ].map(({ label, value, icon: Icon }, index) => (
                    <div
                      key={label}
                      className="group relative overflow-hidden rounded-2xl border border-border bg-border p-6 transition-all duration-300 hover:border-purple-500/40 hover:bg-purple-500/5 hover:shadow-lg hover:scale-[1.02]"
                      style={{ animationDelay: `${0.5 + index * 0.15}s` }}
                    >
                      {/* Ambient background glow */}
                      <div className="absolute -right-8 -top-8 size-24 rounded-full bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-transparent blur-xl opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:scale-150" />
                      
                      {/* Animated gradient ring on border */}
                      <div className="absolute inset-0 -z-10 scale-95 opacity-0 transition-all duration-500 group-hover:scale-100 group-hover:opacity-100 bg-gradient-to-br from-transparent via-purple-500/3 to-transparent animate-[spin_4s_linear_infinite]" />
                      
                      <div className="relative z-10">
                        <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                          <Icon className="size-4 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" aria-hidden="true" /> {label}
                        </dt>
                        <dd className="mt-2 text-4xl font-bold tracking-tight transition-all duration-300 group-hover:text-purple-600 dark:group-hover:text-purple-400">{value}</dd>
                      </div>
                      
                      {/* Corner sparkle effect */}
                      <div className="absolute right-4 top-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <span className="inline-block h-2 w-2 rotate-45 border-t border-r border-purple-500/50" />
                      </div>
                    </div>
                  ))}
                </dl>

                {/* Stage Distribution */}
                <div className="mt-8 rounded-2xl border border-border bg-border p-6 backdrop-blur-sm animate-[fade-in-up_0.8s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.7s' }}>
                  <h3 className="mb-4 text-lg font-semibold tracking-tight">Project Stages</h3>
                  <div className="flex flex-wrap gap-4">
                    {[
                      { label: "Production", count: portfolioMetrics.stageDistribution.production, color: "bg-emerald-500" },
                      { label: "Beta", count: portfolioMetrics.stageDistribution.beta, color: "bg-blue-500" },
                      { label: "Alpha", count: portfolioMetrics.stageDistribution.alpha, color: "bg-yellow-500" },
                      { label: "Historical", count: portfolioMetrics.stageDistribution.historical, color: "bg-slate-500" },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="group flex cursor-default items-center gap-3 rounded-xl bg-background/50 px-4 py-2.5 transition-all duration-300 hover:shadow-md hover:scale-105 animate-[fade-in-up_0.4s_ease-out_forwards] opacity-0" style={{ animationDelay: `${0.8 + Object.keys({ Production: 0, Beta: 1, Alpha: 2, Historical: 3 }).indexOf(label) * 0.1}s` }}>
                        <span className={`relative size-3 rounded-full ${color} transition-all duration-300 group-hover:animate-pulse`}>
                          <span className={`absolute inline-flex size-full rounded-full opacity-75 animation-ping ${color} animate-ping`} />
                        </span>
                        <span className="text-sm font-medium transition-colors duration-300 group-hover:text-foreground">{label}</span>
                        <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-semibold transition-colors duration-300 group-hover:bg-purple-500/20 group-hover:text-purple-600 dark:group-hover:text-purple-400">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Access Links */}
              <div className="animate-[fade-in-up_0.8s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.9s' }}>
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
                      className="group relative overflow-hidden rounded-2xl border border-border bg-border p-6 transition-all duration-300 hover:border-purple-500/40 hover:bg-purple-500/5 hover:shadow-lg hover:scale-[1.02] animate-[fade-in-up_0.4s_ease-out_forwards] opacity-0"
                      style={{ animationDelay: `${1.0 + index * 0.1}s` }}
                    >
                      {/* Ambient glow effect */}
                      <div className="absolute -right-8 -top-8 size-24 rounded-full bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-emerald-500/10 blur-xl opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:scale-150" />
                      
                      {/* Shimmer sweep across card */}
                      <div className="pointer-events-none absolute inset-0 -z-10 translate-x-[-150%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[150%]" />
                      
                      {/* Gradient border reveal on hover */}
                      <div className="absolute inset-0 -z-10 scale-95 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100 bg-gradient-to-br from-transparent via-purple-500/5 to-transparent" />
                      
                      {/* Corner sparkle */}
                      <div className="absolute right-4 top-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <span className="inline-block h-2 w-2 rotate-45 border-t border-r border-purple-500/50" />
                      </div>
                      
                      <div className="relative z-10">
                        <div className="flex items-center gap-2">
                          <Icon className="size-5 text-muted-foreground transition-all duration-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:rotate-12 group-hover:scale-110" />
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:-translate-y-1">Deep Dive</span>
                        </div>
                        <h3 className="mt-4 text-lg font-semibold tracking-tight transition-colors duration-300 group-hover:text-purple-600 dark:group-hover:text-purple-400">{title}</h3>
                        <p className="mt-2 text-sm text-muted-foreground transition-colors duration-300 group-hover:text-foreground/90">{description}</p>
                        <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-foreground/80 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-all duration-300 group-hover:translate-x-2">
                          Explore →
                          <ArrowRight className="size-3 transition-transform duration-300 group-hover:translate-x-1 group-hover:rotate-12" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* For Hiring Managers */}
              <div className="animate-[fade-in-up_1s_ease-out_forwards] opacity-0" style={{ animationDelay: '1.1s' }}>
                <h2 className="mb-8 text-2xl font-semibold tracking-tight">For Hiring Managers & Evaluators</h2>
                <div className="rounded-2xl border border-border bg-gradient-to-r from-emerald-500/5 via-blue-500/5 to-purple-500/5 p-8 backdrop-blur-sm relative overflow-hidden">
                  {/* Animated shimmer effect with intensity sweep */}
                  <div className="absolute inset-0 -z-10 overflow-hidden">
                    <div className="absolute -inset-full h-full w-full animate-[shimmer_3s_infinite] translate-x-full rotate-45 bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                    
                    {/* Light rays emanating from center */}
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={`ray-${i}`}
                        className="absolute inset-0 animate-[light-ray_4s_ease-in-out_infinite]"
                        style={{
                          transform: `rotate(${i * 72}deg)`,
                          transformOrigin: 'center',
                          opacity: i < 2 ? 0.3 : i < 4 ? 0.2 : 0.1,
                          animationDelay: `${i * 0.8}s`,
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-purple-500/5 to-transparent blur-lg" />
                      </div>
                    ))}
                    
                    {/* Floating geometric particles */}
                    {[...Array(15)].map((_, i) => {
                      const shape = ['circle', 'square', 'triangle'][i % 3];
                      return (
                        <div
                          key={`geo-${i}`}
                          className={`absolute ${shape === 'circle' ? 'rounded-full' : shape === 'square' ? 'rounded-none' : 'clip-path-polygon'}`}
                          style={{
                            width: `${4 + Math.random() * 8}px`,
                            height: `${4 + Math.random() * 8}px`,
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            backgroundColor: ['rgba(59,130,246,0.1)', 'rgba(168,85,247,0.1)', 'rgba(16,185,129,0.1)'][i % 3],
                            animation: `float-shape ${5 + Math.random() * 5}s ease-in-out infinite`,
                            animationDelay: `${Math.random() * 3}s`,
                            clipPath: shape === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
                          }}
                        />
                      );
                    })}
                  </div>
                  
                  <p className="mb-6 text-lg leading-7 text-muted-foreground relative z-10">
                    Use this platform to evaluate technical competence through actual shipped work, not resumes. Every metric is derived from verified evidence.
                  </p>
                  <ol className="space-y-4 relative z-10">
                    {[
                      { step: "Review Skills Heatmap", desc: "Proficiency levels backed by shipped projects" },
                      { step: "Check Complexity Scores", desc: "Architectural depth across all deliverables" },
                      { step: "Analyze Evidence Timeline", desc: "Verify what's current vs. stale claims" },
                      { step: "Study Growth Trajectory", desc: "Skill evolution through shipping pressure" },
                      { step: "Walk Challenge Simulator", desc: "Experience real engineering decision-making" },
                      { step: "Evaluate Risk Factors", desc: "Understand where projects might need maintenance" },
                      { step: "Review Hire Recommendation", desc: "Data-driven candidate assessment scorecard" }
                    ].map(({ step, desc }, i) => (
                      <li key={step} className={`group relative flex items-start gap-4 rounded-xl bg-background/50 p-4 transition-all duration-300 hover:shadow-md hover:scale-[1.02] animate-[fade-in-up_0.4s_ease-out_forwards] opacity-0 ${
                        i < 3 ? "hover:border-emerald-500/30" :
                        i < 6 ? "hover:border-blue-500/30" :
                        "hover:border-purple-500/30"
                      }`} style={{ animationDelay: `${1.2 + i * 0.1}s` }}>
                        {/* Step indicator glow with bloom */}
                        <span className={`pointer-events-none absolute -inset-px -z-10 rounded-xl opacity-0 blur-md transition-all duration-500 group-hover:opacity-20 ${
                          i < 3 ? "bg-gradient-to-br from-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.4)]" :
                          i < 6 ? "bg-gradient-to-br from-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.4)]" :
                          "bg-gradient-to-br from-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                        }`} />
                        
                        {/* Shimmer sweep on left edge */}
                        <span className={`pointer-events-none absolute left-0 top-0 h-full w-1 -translate-x-full bg-gradient-to-b ${
                          i < 3 ? "from-emerald-500/0 via-emerald-500/50 to-emerald-500/0" :
                          i < 6 ? "from-blue-500/0 via-blue-500/50 to-blue-500/0" :
                          "from-purple-500/0 via-purple-500/50 to-purple-500/0"
                        } opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:translate-x-0`} />
                        
                        {/* Corner sparkle */}
                        <div className="absolute right-4 top-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <span className={`inline-block h-1.5 w-1.5 rotate-45 border-t border-r ${
                            i < 3 ? "border-emerald-500/50" :
                            i < 6 ? "border-blue-500/50" :
                            "border-purple-500/50"
                          } drop-shadow-[0_0_4px_currentColor]`} />
                        </div>
                        
                        <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-lg transition-all duration-300 group-hover:scale-110 ${
                          i < 3 ? "bg-emerald-500 text-white group-hover:bg-emerald-400 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.6)]" :
                          i < 6 ? "bg-blue-500 text-white group-hover:bg-blue-400 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]" :
                          "bg-purple-500 text-white group-hover:bg-purple-400 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.6)]"
                        }`}>
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-semibold transition-colors duration-300 group-hover:text-foreground">{step}</p>
                          <p className="mt-1 text-sm text-muted-foreground transition-colors duration-300 group-hover:text-foreground/90">{desc}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  
                  {/* Quick Action Cards with holographic effects */}
                  <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-[fade-in-up_0.8s_ease-out_forwards] opacity-0" style={{ animationDelay: '1.5s' }}>
                    {[
                      { title: "Start Assessment", link: "/analytics/hiring", icon: ShieldCheck, color: "from-emerald-500 to-emerald-600" },
                      { title: "Compare Projects", link: "/compare", icon: Grid, color: "from-blue-500 to-blue-600" },
                      { title: "View Live Work", link: "/projects?featured=true", icon: Globe, color: "from-purple-500 to-purple-600" },
                    ].map(({ title, link, icon: Icon, color }, index) => (
                      <a
                        key={title}
                        href={link}
                        className="group relative overflow-hidden rounded-xl bg-gradient-to-br p-6 text-white transition-all duration-300 hover:shadow-2xl hover:scale-[1.03] animate-[fade-in-up_0.4s_ease-out_forwards] opacity-0"
                        style={{ animationDelay: `${1.6 + index * 0.15}s` }}
                      >
                        {/* Holographic foil effect */}
                        <div className="absolute inset-0 -z-10 opacity-0 transition-all duration-500 group-hover:opacity-100 bg-[linear-gradient(125deg,transparent_0%,rgba(255,255,255,0.3)_25%,rgba(255,255,255,0.5)_50%,rgba(255,255,255,0.3)_75%,transparent_100%)] animate-[foil-sweep_3s_linear_infinite]" />
                        
                        {/* Gradient border glow on hover */}
                        <div className={`absolute inset-0 -z-10 scale-95 opacity-0 transition-all duration-500 group-hover:scale-100 group-hover:opacity-100 blur-md bg-gradient-to-br ${color.replace('to-', '-to-')}`} />
                        
                        {/* Glossy sheen effect */}
                        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        
                        {/* Inner glow on hover */}
                        <div className="absolute inset-0 -z-10 opacity-0 transition-all duration-500 group-hover:opacity-100 blur-xl bg-white/20 shadow-[0_0_30px_rgba(255,255,255,0.3)]" />
                        
                        {/* Corner sparkle */}
                        <div className="absolute right-4 top-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <span className="inline-block h-2 w-2 rotate-45 border-t border-r border-white/50 drop-shadow-[0_0_4px_white]" />
                        </div>
                        
                        <div className="relative z-10">
                          <Icon className={`size-6 transition-all duration-300 group-hover:rotate-12 group-hover:scale-125 drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]`} aria-hidden="true" />
                          <h4 className="mt-3 text-lg font-semibold transition-transform duration-300 group-hover:-translate-y-0.5">{title}</h4>
                          <p className="mt-1 text-sm opacity-90 transition-opacity duration-300 group-hover:opacity-100">Open in new tab →</p>
                        </div>
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
