import { useMemo, useState } from "react";
import { ArrowUpRight, GitCompareArrows } from "lucide-react";
import { Link } from "react-router";
import { SiteFooter, SiteHeader } from "@/components/portfolio/SiteChrome";
import { SiteMetadata } from "@/components/portfolio/SiteMetadata";
import { SourceStateBadge } from "@/components/portfolio/SourceState";
import { StageBadge } from "@/components/portfolio/StageBadge";
import { ProofSummaryBar } from "@/components/portfolio/ProofSummary";
import {
  daysSinceVerified,
  hasCarriedCi,
  demonstratesOf,
  evidenceDensityOf,
  ledgerGradeRank,
  projects,
  proofSummary,
  type HydratedProject,
} from "@/data/registry";
import type { Stage } from "@/data/registry/schema";
/** Sortable axes. "honest" leads because it is what the site is actually about. */
type SortKey = "honest" | "stage" | "evidence" | "measures" | "verified";

const SORTS: { key: SortKey; label: string; blurb: string }[] = [
  {
    key: "honest",
    label: "Evidence honesty",
    blurb:
      "Ranked by what the project gives up about itself: stated limitations, declared trade-offs and recorded dead ends, against how far the work got.",
  },
  {
    key: "stage",
    label: "How far it got",
    blurb: "The stage each project earned, strongest first.",
  },
  {
    key: "evidence",
    label: "Evidence density",
    blurb: "How many distinct checkable things a project points at.",
  },
  {
    key: "measures",
    label: "Measured numbers",
    blurb: "How much of the work is quantified with a stated method.",
  },
  {
    key: "verified",
    label: "Claim freshness",
    blurb: "How recently a human re-checked each project's claims against its source.",
  },
];

const stageRank: Record<Stage, number> = {
  shipped: 0,
  beta: 1,
  prototype: 2,
  research: 3,
  archived: 4,
};

/**
 * How much the project discloses about its own limits, net of how finished it
 * claims to be. A prototype with three trade-offs and two recorded failures is
 * more trustworthy than a prototype with none, and this ranks them that way —
 * disclosure counts, not stage.
 */
function honestyScore(project: HydratedProject): number {
  const cs = project.caseStudy;
  const disclosures =
    cs.limitations.length * 2 + cs.tradeoffs.length * 2 + cs.failedApproaches.length * 2 + cs.lessons.length;
  // Reward disclosure, and lightly reward measured work — but never let the
  // score be dominated by it, so the ranking cannot be gamed by adding metrics.
  return disclosures * 10 + cs.metrics.length * 2 + stageRank[project.stage];
}

/**
 * Visitor lenses: the questions someone actually arrives with.
 *
 * A visitor does not want "evidence density". They want "show me the thing that
 * proves he can build a UI", or "which one used a model well". Each lens matches
 * against fields the registry already holds — the `tags`, `category` and
 * upstream `stack` strings — and then shows **which tag matched**.
 *
 * Two things make this defensible rather than decorative. The terms are taken
 * from the vocabulary the registry actually uses, not from a generic list of
 * technology words. And the matching term is displayed next to each project, so
 * a ranking can be argued with and checked against the same strings it was
 * derived from. A hidden composite score would rank confidently and could not be
 * questioned, which is the opposite of what this site is for.
 */
type Lens = {
  key: string;
  label: string;
  question: string;
  /** Registry tags/categories/stack strings matched case-insensitively on word boundaries. */
  terms: string[];
};

const LENSES: Lens[] = [
  {
    key: "frontend",
    label: "Strongest UI work",
    question: "Which projects are mostly about the interface, and what are they built with?",
    terms: [
      "css",
      "design tokens",
      "next.js",
      "pwa",
      "offline-first",
      "client-side",
      "three.js",
      "electron",
      "accessibility",
      "dashboard",
      "realtime",
      "information design",
    ],
  },
  {
    key: "ai",
    label: "Where a model was used",
    question: "Which projects involve a model, and in what role?",
    terms: [
      "ai boundary",
      "grounding",
      "grounded generation",
      "language contract",
      "hedging",
      "explainability",
      "mastery model",
      "claude",
      "local-first",
    ],
  },
  {
    key: "systems",
    label: "Systems and tooling",
    question: "Which projects run close to the machine — CLIs, parsers, storage, orchestration?",
    terms: [
      "cli",
      "parsers",
      "token efficiency",
      "electron",
      "python",
      "postgres",
      "pglite",
      "object storage",
      "shared state",
      "connectors",
      "skill graph",
      "orchestration",
    ],
  },
  {
    key: "product",
    label: "Product-shaped problems",
    question: "Which projects were built around a specific user problem rather than a technique?",
    terms: [
      "product constraints",
      "privacy",
      "privacy mode",
      "everyday systems",
      "personal productivity",
      "offline-first",
      "local-first",
      "speech-to-text",
      "speech",
    ],
  },
  {
    key: "testing",
    label: "Testing as a theme",
    question: "Which projects treat verification as part of the product rather than an afterthought?",
    terms: ["playwright", "validation", "experiments", "provenance", "statistics", "benchmarks"],
  },
  {
    key: "benchmarked",
    label: "Measured, not asserted",
    question: "Which projects publish numbers with a method someone could re-run?",
    terms: ["benchmarks", "token efficiency", "parsers", "statistics", "experiments", "provenance"],
  },
];

/**
 * Returns every registry term that matched, so the ranking can show its reason.
 *
 * Matching is on word boundaries, not raw substrings. Naive `includes` made the
 * short terms unusable: "ai" matched "detail", "main" and "domain", so twelve of
 * fourteen projects appeared to use a model, and "ui" matched "build" and
 * "guide" — which put almost nothing in the UI lens at all. A ranking that
 * cannot be taken seriously is worse than no ranking.
 */
function lensMatches(project: HydratedProject, lens: Lens): string[] {
  const shows = demonstratesOf(project);
  const haystack = [
    project.category,
    project.upstream?.stack ?? "",
    ...project.tags,
    ...shows.technical,
    ...shows.product,
  ]
    .join(" • ")
    .toLowerCase();

  return lens.terms.filter((term) => {
    // Escape the term so a term like "c++" cannot be read as a pattern.
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Boundaries on both sides, so "ai" cannot match inside "detail" while
    // still matching "AI" or "ai-driven".
    return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "i").test(haystack);
  });
}

function LensRankings({ rows }: { rows: HydratedProject[] }) {
  const ranked = LENSES.map((lens) => {
    const scored = rows
      .map((project) => ({ project, matches: lensMatches(project, lens) }))
      .filter((entry) => entry.matches.length > 0)
      // More distinct matched terms first. Projects that tie are shown in the
      // registry's order rather than being given a fabricated differentiator.
      .sort((a, b) => b.matches.length - a.matches.length);
    return { lens, scored };
  }).filter((entry) => entry.scored.length > 0);

  if (ranked.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1380px] px-5 pb-20 sm:px-8 lg:px-12" aria-labelledby="lenses-heading">
      <div className="mb-8">
        <h2 id="lenses-heading" className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
          What to look at first
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Each list below is ranked by how many distinct registry terms a project
          matches, and every project shows which terms matched. Nothing here is a
          composite score: the ranking can be checked against the same tags,
          category and stack strings it was derived from. Where projects tie, they
          are shown together rather than separated arbitrarily.
        </p>
      </div>

      <div className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-2 xl:grid-cols-3">
        {ranked.map(({ lens, scored }) => {
          const top = scored[0].matches.length;
          return (
            <section key={lens.key} className="bg-background p-5 sm:p-6">
              <h3 className="text-base font-semibold tracking-tight">{lens.label}</h3>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{lens.question}</p>
              <ol className="mt-5 space-y-4">
                {scored.map(({ project, matches }) => {
                  const tied = matches.length === top && scored.filter((s) => s.matches.length === top).length > 1;
                  return (
                    <li key={project.slug}>
                      <Link
                        to={`/projects/${project.slug}`}
                        className="group inline-flex items-start gap-1.5 font-medium hover:underline"
                      >
                        {project.name}
                        <ArrowUpRight
                          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </Link>
                      <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
                        {matches.map((term) => (
                          <span
                            key={term}
                            className="mr-1.5 inline-block border border-border px-1.5 py-0.5 font-mono text-[10px]"
                          >
                            {term}
                          </span>
                        ))}
                        {tied && (
                          <span className="ml-1 text-muted-foreground/70">tied at top</span>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function Cell({ children, tone }: { children: React.ReactNode; tone?: "muted" | "warn" | "good" }) {
  const toneClass =
    tone === "warn"
      ? "tone-warn"
      : tone === "good"
        ? "text-foreground"
        : tone === "muted"
          ? "text-muted-foreground"
          : "";
  return <span className={toneClass}>{children}</span>;
}

function CiCell({ project }: { project: HydratedProject }) {
  if (!project.ci) return <Cell tone="muted">not tracked</Cell>;
  const last = project.ci.lastVerifiedAt?.slice(0, 10) ?? "—";

  // A carried-forward record must not render as "green". This is the column a
  // reader scans to decide which work is currently verified, and the five
  // migrated repositories were showing a pass for a result that has not been
  // reachable since the 2026-08 migration.
  if (hasCarriedCi(project)) {
    return (
      <span>
        <Cell tone="warn">unverified</Cell>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          carried forward · {last}
        </span>
      </span>
    );
  }

  const green = project.ci.conclusion === "success";
  if (!green) {
    return (
      <span>
        <Cell tone="warn">red newest run</Cell>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          last green {last}
        </span>
      </span>
    );
  }
  return (
    <span>
      <Cell tone="good">green</Cell>
      <span className="mt-0.5 block text-[11px] text-muted-foreground">{last}</span>
    </span>
  );
}

function VerifiedCell({ project }: { project: HydratedProject }) {
  const age = daysSinceVerified(project);
  const date = project.caseStudy.lastVerifiedAt?.slice(0, 10);
  if (!date || age === null) return <Cell tone="muted">no date</Cell>;
  if (age > proofSummary.freshWithinDays) {
    return (
      <span>
        <Cell tone="warn">{age}d old</Cell>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">{date}</span>
      </span>
    );
  }
  return (
    <span>
      <Cell>{age}d</Cell>
      <span className="mt-0.5 block text-[11px] text-muted-foreground">{date}</span>
    </span>
  );
}

function StrongestGrade({ project }: { project: HydratedProject }) {
  if (project.ledgerClaims.length === 0) return <Cell tone="muted">not graded</Cell>;
  const best = project.ledgerClaims.reduce<string>(
    (top, claim) => (ledgerGradeRank(claim.status) > ledgerGradeRank(top) ? claim.status : top),
    "",
  );
  return (
    <span title={`${project.ledgerClaims.length} claim(s) graded in the evidence ledger`}>
      {best}
    </span>
  );
}

export default function Compare() {
  const [sort, setSort] = useState<SortKey>("honest");

  const active = SORTS.find((entry) => entry.key === sort) ?? SORTS[0];

  const rows = useMemo(() => {
    const sorted = [...projects];
    sorted.sort((a, b) => {
      switch (sort) {
        case "stage":
          return (
            stageRank[a.stage] - stageRank[b.stage] || a.name.localeCompare(b.name)
          );
        case "evidence":
          return evidenceDensityOf(b) - evidenceDensityOf(a) || a.name.localeCompare(b.name);
        case "measures":
          return b.caseStudy.metrics.length - a.caseStudy.metrics.length || a.name.localeCompare(b.name);
        case "verified": {
          const ageA = daysSinceVerified(a) ?? Number.MAX_SAFE_INTEGER;
          const ageB = daysSinceVerified(b) ?? Number.MAX_SAFE_INTEGER;
          return ageA - ageB || a.name.localeCompare(b.name);
        }
        case "honest":
        default:
          return honestyScore(b) - honestyScore(a) || a.name.localeCompare(b.name);
      }
    });
    return sorted;
  }, [sort]);

  return (
    <div className="portfolio-shell min-h-screen overflow-x-hidden bg-background text-foreground">
      <SiteMetadata
        title="Compare the work — Henry Goldsmith"
        description="Every project side by side: stage, source state, CI health, evidence density, measured numbers, ledger grades and what each one demonstrates."
        path="/compare"
      />
      <SiteHeader />

      <main id="main">
        <section className="mx-auto max-w-[1380px] px-5 pb-12 pt-28 sm:px-8 sm:pt-36 lg:px-12">
          <p className="eyebrow mb-7 flex items-center gap-2">
            <GitCompareArrows className="size-3.5" aria-hidden="true" />
            Side by side
          </p>
          <h1 className="section-title max-w-3xl">
            All {projects.length} projects,
            <br />
            <span className="text-muted-foreground">compared on the same axes.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground">
            A gallery shows you what was built. This shows you what each project is
            actually made of: how far it got, what backs it, how fresh those checks
            are, and what it says it cannot do. Every column is counted from the
            registry rather than typed in.
          </p>
        </section>

        <section className="mx-auto max-w-[1380px] px-5 pb-14 sm:px-8 lg:px-12">
          <h2 className="eyebrow mb-5">What the site can be checked on</h2>
          <ProofSummaryBar summary={proofSummary} />
        </section>

        <section className="mx-auto max-w-[1380px] px-5 pb-10 sm:px-8 lg:px-12">
          <h2 className="eyebrow mb-4">Order by</h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Order projects by">
            {SORTS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                className={`filter-chip ${sort === entry.key ? "filter-chip-active" : ""}`}
                onClick={() => setSort(entry.key)}
                aria-pressed={sort === entry.key}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">{active.blurb}</p>
        </section>

        <LensRankings rows={rows} />

        <section className="mx-auto max-w-[1380px] px-5 pb-24 sm:px-8 lg:px-12">
          {/*
            Eight columns is 1024px of table in a 360px screen. The row header
            is pinned to the left edge so a reader who has scrolled across to
            "Grade" can still see which project the row belongs to, and the
            caption is visible rather than screen-reader-only so the horizontal
            scroll is discoverable instead of surprising.
          */}
          <p className="mb-3 text-xs text-muted-foreground sm:hidden">
            Scroll the table sideways to see all eight columns. The project name
            stays pinned to the left.
          </p>
          <div className="mb-4 overflow-x-auto">
            <table className="w-full min-w-[64rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                Every published project compared by stage, source state, CI health, evidence
                density, measured numbers, evidence grade, claim freshness and what it
                demonstrates.
              </caption>
              <thead>
                <tr className="border-b border-border">
                  {[
                    "Project",
                    "Stage",
                    "Source",
                    "CI now",
                    "Evidence",
                    "Numbers",
                    "Grade",
                    "Claims checked",
                  ].map((heading, index) => (
                    <th
                      key={heading}
                      scope="col"
                      className={`whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground ${
                        // Pinned with the row headers so the two columns that
                        // identify a row never scroll out of view together.
                        index === 0 ? "sticky left-0 z-20 bg-background" : ""
                      }`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((project) => {
                  const shows = demonstratesOf(project);
                  return (
                    <tr key={project.slug} className="border-b border-border/70 align-top">
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-background px-4 py-5 font-normal"
                      >
                        <Link
                          to={`/projects/${project.slug}`}
                          className="group inline-flex min-h-6 items-start gap-1.5 py-0.5 font-semibold tracking-tight hover:underline"
                        >
                          {project.name}
                          <ArrowUpRight
                            className="mt-1 size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </Link>
                        <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                          {project.tagline}
                        </p>
                        <ul className="mt-2.5 space-y-1">
                          {shows.technical.slice(0, 3).map((item) => (
                            <li key={item} className="text-[11px] leading-4 text-muted-foreground/90">
                              <span className="font-medium text-foreground/60">tech · </span>
                              {item}
                            </li>
                          ))}
                          {shows.product.slice(0, 2).map((item) => (
                            <li key={item} className="text-[11px] leading-4 text-muted-foreground/90">
                              <span className="font-medium text-foreground/60">product · </span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </th>
                      <td className="px-4 py-5">
                        <StageBadge stage={project.stage} />
                        <span className="mt-1.5 block text-[11px] text-muted-foreground">
                          {project.category}
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        <SourceStateBadge sourceState={project.sourceState} />
                        <span className="mt-1.5 block text-[11px] text-muted-foreground">
                          {project.sourceAccess ? `${project.sourceAccess} repo` : "no repo"}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-xs">
                        <CiCell project={project} />
                      </td>
                      <td className="px-4 py-5 tabular-nums">
                        {evidenceDensityOf(project)}
                        <span className="ml-1.5 text-[11px] text-muted-foreground">links</span>
                      </td>
                      <td className="px-4 py-5 tabular-nums">
                        {project.caseStudy.metrics.length}
                        <span className="ml-1.5 text-[11px] text-muted-foreground">measured</span>
                      </td>
                      <td className="px-4 py-5 text-xs">
                        <StrongestGrade project={project} />
                      </td>
                      <td className="px-4 py-5 text-xs">
                        <VerifiedCell project={project} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-6 max-w-3xl text-xs leading-5 text-muted-foreground">
            <strong className="font-semibold text-foreground/75">How to read the red.</strong>{" "}
            A red CI cell means the newest tracked workflow run for that project failed, not
            that the work is worthless — the date beside it is the last run that passed. A
            {` "d old"`} claims cell means a human has not re-checked those claims inside the{" "}
            {proofSummary.freshWithinDays}-day window, so treat the numbers as needing a second
            look rather than as current fact. Those two states are shown precisely because
            hiding them would make every other number on this page worth less.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
