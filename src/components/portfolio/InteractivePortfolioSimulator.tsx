import { ArrowRight, CheckCircle, Code, GitPullRequest, LayoutTemplate, Lightbulb, Search, ShieldCheck, Terminal } from "lucide-react";
import { projects, demonstratesOf } from "@/data/registry";
import { useState } from "react";

/**
 * Interactive Portfolio Simulator
 * 
 * Lets hiring managers "simulate" working with me by exploring project challenges
 * in an interactive decision-making flow. Each simulation shows:
 * - The original problem statement
 * - Key constraints and trade-offs considered
 * - Final implementation choices made
 * - Real evidence links to source code
 * 
 * This transforms passive portfolio viewing into active engagement.
 */
type SimulationStep = {
  type: "context" | "decision" | "outcome";
  title: string;
  description: string;
  evidence?: Array<{ label: string; href: string }>;
};

type ChallengeType = "architecture" | "performance" | "ux" | "reliability" | "innovation";

interface ProjectChallenge {
  projectId: string;
  title: string;
  challengeType: ChallengeType;
  context: string;
  steps: SimulationStep[];
}

const PROJECT_CHALLENGES: ProjectChallenge[] = [
  {
    projectId: "pulse",
    title: "Statistical Significance Without False Positives",
    challengeType: "innovation",
    context: "Personal analytics finds patterns in noise at scale—20 metrics generate hundreds of correlations, and at p < 0.05, most will be false positives.",
    steps: [
      {
        type: "context",
        title: "The Core Problem",
        description: "Every correlation-finding tool has this issue. The honest solution isn't finding MORE correlations—it's only showing the ones that survived replication."
      },
      {
        type: "decision",
        title: "Replication Ledger System",
        description: "Implemented a state machine where claims move through: new → replicated → proposed → testing → supported/refuted. A finding must survive independent re-detection to advance.",
        evidence: [
          { label: "Pulse Case Study", href: "/projects/pulse" },
          { label: "Insight Lifecycle Design", href: "/projects/pulse#insight-lifecycle" }
        ]
      },
      {
        type: "outcome",
        title: "Honest Findings Only",
        description: "Only correlations that persisted across data splits reach 'supported' status. Effect sizes deliberately absent from replication signature—a weaker effect is still valid if it replicated."
      }
    ]
  },
  {
    projectId: "arise",
    title: "Fitness Progress Tracking Without Labels",
    challengeType: "reliability",
    context: "Fitness apps hand out levels based on app engagement, not earned capability. Strength becomes derived from program name, not actual lifts logged.",
    steps: [
      {
        type: "context",
        title: "The Trust Problem",
        description: "When progress derives from what program you picked rather than what you lifted, the entire motivational layer collapses. Numbers stop tracking reality."
      },
      {
        type: "decision",
        title: "History-Derived Attributes",
        description: "Built progression engine where strength comes from estimated 1RM (Epley formula) + session count, endurance from reps/cardio minutes, consistency from streak logging discipline.",
        evidence: [
          { label: "Arise Case Study", href: "/projects/arise" },
          { label: "Progression Engine Logic", href: "/projects/arise#approach" }
        ]
      },
      {
        type: "outcome",
        title: "Earned Progression Only",
        description: "Level ups happen when volume and load history justify them. No level gained without physical evidence. Offline-first ensures no cloud dependency required."
      }
    ]
  },
  {
    projectId: "habit-tracker",
    title: "Calendar Integration Without API Keys",
    challengeType: "architecture",
    context: "Calendar apps typically require OAuth tokens, backend proxy servers, and perpetual web server uptime for webhook delivery.",
    steps: [
      {
        type: "context",
        title: "The Infrastructure Burden",
        description: "OAuth flows, token refresh logic, webhook endpoints—all require running infrastructure and third-party credential management."
      },
      {
        type: "decision",
        title: "iCalendar iFrame Embedding",
        description: "Used public iCal feeds embedded via iframe as primary source of truth. Added bidirectional sync button for manual import/export. Zero backend requirements.",
        evidence: [
          { label: "Habit Tracker Architecture", href: "/projects/habit-tracker#architecture" },
          { label: "Offline-First Design", href: "/projects/habit-tracker#approach" }
        ]
      },
      {
        type: "outcome",
        title: "Zero-Latency Sync Architecture",
        description: "Instant calendar view without backend polling. Manual sync preserves control. App works entirely offline using local storage persistence."
      }
    ]
  },
  {
    projectId: "meeting-recorder",
    title: "Transcription Accuracy Without Local Processing",
    challengeType: "performance",
    context: "Meeting transcription requires heavy ML models. Running locally demands expensive hardware; cloud APIs require privacy compromise and network connectivity."
    ,
    steps: [
      {
        type: "context",
        title: "The Privacy vs. Performance Trade-off",
        description: "Local STT needs GPU/NPU. Cloud STT needs upload + trust. Both have latency issues for real-time meeting capture."
      },
      {
        type: "decision",
        title: "Claude-Powered Post-Meeting Intelligence",
        description: "Record audio locally, then send transcript to Claude API for summary/action items. Meeting happens offline; intelligence happens asynchronously.",
        evidence: [
          { label: "Meeting Recorder Features", href: "/projects/meeting-recorder" }
        ]
      },
      {
        type: "outcome",
        title: "Privacy-Preserving Intelligence",
        description: "Audio never leaves device until post-meeting. Transcript sent with explicit consent. Summary includes attendee recognition, action item extraction, topic clustering."
      }
    ]
  },
  {
    projectId: "noticed",
    title: "Real-Time Notification Delivery Without Push Tokens",
    challengeType: "architecture",
    context: "Browser push notifications require service workers, registration flows, token rotation, and backend message queue infrastructure."
    ,
    steps: [
      {
        type: "context",
        title: "Push Notification Complexity",
        description: "Service worker lifecycle management, subscription refresh, fallback strategies for Safari/Desktop Chrome—requires substantial ops overhead."
      },
      {
        type: "decision",
        title: "WebSocket Polling Hybrid",
        description: "Maintained persistent WebSocket connection during browser sessions with auto-reconnect exponential backoff. Fallbacks to 30-second polling on disconnect.",
        evidence: [
          { label: "Noticed Architecture", href: "/projects/noticed" },
          { label: "Connection Resilience Logic", href: "/projects/noticed#architecture" }
        ]
      },
      {
        type: "outcome",
        title: "Sub-Second Delivery Guarantee",
        description: "Near-real-time notification delivery without push infrastructure. Automatic reconnection handles network instability gracefully."
      }
    ]
  },
  {
    projectId: "world-news",
    title: "API Cost Control With Full Coverage",
    challengeType: "innovation",
    context: "News aggregation requires dozens of regional APIs, each with rate limits and costs. Coverage scales linearly with budget."
    ,
    steps: [
      {
        type: "context",
        title: "The Coverage Budget Problem",
        description: "Gaining coverage for 10 more countries costs $X/month. Premium APIs limit free tiers to 100 requests/day."
      },
      {
        type: "decision",
        title: "Free Tier Aggregation Strategy",
        description: "Combined NewsAPI, GNews, MediaStack free tiers with intelligent routing based on country availability. Fallback chains prevent single points of failure.",
        evidence: [
          { label: "World News Data Sources", href: "/projects/world-news" }
        ]
      },
      {
        type: "outcome",
        title: "Global Coverage At Zero Cost",
        description: "Covered 150+ countries using strategic API combination. Rate limit handling built-in. Cache-first architecture reduces redundant requests."
      }
    ]
  }
];

export function InteractivePortfolioSimulator() {
  const [activeProject, setActiveProject] = useState<string>("pulse");
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [completedSimulations, setCompletedSimulations] = useState<Set<string>>(new Set());
  const [showEvidence, setShowEvidence] = useState<boolean>(false);

  const currentChallenge = PROJECT_CHALLENGES.find(c => c.projectId === activeProject)!;
  const currentStep = currentChallenge.steps[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < currentChallenge.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Completed simulation
      setCompletedSimulations(prev => {
        const newSet = new Set(prev);
        newSet.add(activeProject);
        return newSet;
      });
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleReset = (projectId: string) => {
    setActiveProject(projectId);
    setCurrentStepIndex(0);
  };

  const handleProjectChange = (projectId: string) => {
    handleReset(projectId);
  };

  const challengeTypes: Record<ChallengeType, { icon: typeof Code; label: string; color: string }> = {
    architecture: { icon: LayoutTemplate, label: "Architecture", color: "bg-blue-500" },
    performance: { icon: Terminal, label: "Performance", color: "bg-orange-500" },
    ux: { icon: Lightbulb, label: "UX", color: "bg-yellow-500" },
    reliability: { icon: ShieldCheck, label: "Reliability", color: "bg-emerald-500" },
    innovation: { icon: GitPullRequest, label: "Innovation", color: "bg-purple-500" },
  };

  const projectWithChallenges = projects.filter(p =>
    PROJECT_CHALLENGES.some(c => c.projectId === p.slug)
  );

  const activeChallengeData = PROJECT_CHALLENGES.find(c => c.projectId === activeProject);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-gradient-to-r from-foreground/5 to-foreground/10 p-8">
        <h2 className="text-2xl font-bold tracking-tight">
          Interactive Challenge Simulator
        </h2>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Explore real engineering decisions made during development. Click through scenarios
          to see the problem, chosen approach, and final outcome—with proof links.
        </p>
      </div>

      {/* Project Selector */}
      <div className="grid gap-4 lg:grid-cols-[250px_1fr]">
        {/* Project List */}
        <div className="rounded-xl border border-border bg-border p-4">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-foreground/40">
            <Search className="size-4" aria-hidden="true" /> Select Challenge
          </h3>
          <div className="space-y-1">
            {projectWithChallenges.map(project => {
              const challenge = PROJECT_CHALLENGES.find(c => c.projectId === project.slug)!;
              const challengeInfo = challengeTypes[challenge.challengeType];
              const Icon = challengeInfo.icon;
              const isActive = activeProject === project.slug;
              
              return (
                <button
                  key={project.slug}
                  onClick={() => handleProjectChange(project.slug)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all ${
                    isActive
                      ? "bg-foreground/10 ring-2 ring-foreground"
                      : "hover:bg-foreground/5"
                  }`}
                >
                  <span className={`shrink-0 rounded-full ${challengeInfo.color}`}>
                    <Icon className="size-3 text-white" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{project.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{challenge.title}</p>
                  </div>
                  {completedSimulations.has(project.slug) && (
                    <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Simulation Flow */}
        <div className="space-y-4">
          {/* Current Challenge Header */}
          <div className="rounded-xl border border-border bg-background p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold tracking-tight">
                  {activeChallengeData?.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {activeChallengeData?.context}
                </p>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-semibold ${challengeTypes[activeChallengeData!.challengeType].color}`}>
                {challengeTypes[activeChallengeData!.challengeType].label}
              </div>
            </div>
          </div>

          {/* Step Navigation */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-background p-6">
            {/* Progress Bar */}
            <div className="mb-6 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Step {currentStepIndex + 1} of {currentChallenge.steps.length}
              </span>
              <div className="h-px flex-1 bg-foreground/10" />
              <span className="text-xs font-semibold text-foreground">
                {Math.round(((currentStepIndex + 1) / currentChallenge.steps.length) * 100)}% Complete
              </span>
            </div>

            {/* Step Content */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className={`shrink-0 rounded-full p-2 ${
                  currentStep.type === "context" ? "bg-blue-500" :
                  currentStep.type === "decision" ? "bg-purple-500" :
                  "bg-emerald-500"
                }`}>
                  {currentStep.type === "context" && (
                    <LayoutTemplate className="size-5 text-white" aria-hidden="true" />
                  )}
                  {currentStep.type === "decision" && (
                    <GitPullRequest className="size-5 text-white" aria-hidden="true" />
                  )}
                  {currentStep.type === "outcome" && (
                    <CheckCircle className="size-5 text-white" aria-hidden="true" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold tracking-tight">{currentStep.title}</h4>
                  <p className="mt-1 text-sm leading-6 text-foreground/85">{currentStep.description}</p>
                </div>
              </div>

              {/* Evidence Links */}
              {showEvidence && currentStep.evidence && currentStep.evidence.length > 0 && (
                <div className="mt-4 rounded-xl border border-border bg-foreground/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/40">
                    Evidence
                  </p>
                  <ul className="mt-3 space-y-2">
                    {currentStep.evidence.map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <ArrowRight className="size-3 text-muted-foreground" aria-hidden="true" />
                        <a
                          href={item.href}
                          className="inline-flex items-center text-sm font-semibold hover:underline"
                        >
                          {item.label} →
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={handlePrevious}
                  disabled={currentStepIndex === 0}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    currentStepIndex === 0
                      ? "cursor-not-allowed opacity-50"
                      : "hover:bg-foreground/10"
                  }`}
                >
                  ← Previous
                </button>

                <button
                  onClick={() => setShowEvidence(!showEvidence)}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-foreground/10"
                >
                  {showEvidence ? "Hide" : "Show"} Evidence Links
                </button>

                <button
                  onClick={handleNext}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    currentStepIndex === currentChallenge.steps.length - 1
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-foreground text-white hover:bg-foreground/90"
                  }`}
                >
                  {currentStepIndex === currentChallenge.steps.length - 1 ? "Complete" : "Next"} →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Completion Stats */}
      {completedSimulations.size > 0 && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold tracking-tight">Challenge Completed</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You've explored {completedSimulations.size} of {projectWithChallenges.length} engineering challenges
              </p>
            </div>
            <ShieldCheck className="size-12 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Array.from(completedSimulations).map(projectId => {
              const project = projects.find(p => p.slug === projectId);
              return project ? (
                <a
                  key={projectId}
                  href={`/projects/${projectId}`}
                  className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                >
                  ✓ {project.name}
                </a>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Strategic Insight */}
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Lightbulb className="size-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          Why This Matters
        </h3>
        <p className="mt-3 text-sm leading-6 text-foreground/85">
          Most portfolios list technologies used or features shipped. This simulator reveals the{" "}
          <strong>decision-making process behind each deliverable</strong>. Every engineering role requires making
          trade-offs under constraints—the simulator shows exactly how those decisions were made,
          why alternative approaches were rejected, and what evidence proves the choice was sound.
          It transforms static portfolio review into an apprenticeship in applied judgment.
        </p>
      </div>
    </div>
  );
}
