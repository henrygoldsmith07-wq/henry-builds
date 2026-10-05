import { ArrowDown, ArrowUpRight, MoveUpRight } from "lucide-react";
import { Link } from "react-router";
import { ContactActions, ContactActionsCompact } from "@/components/portfolio/ContactActions";
import { ProjectPreview } from "@/components/portfolio/ProjectPreview";
import { ProofSummaryBar } from "@/components/portfolio/ProofSummary";
import { SiteFooter, SiteHeader } from "@/components/portfolio/SiteChrome";
import { SiteMetadata } from "@/components/portfolio/SiteMetadata";
import { StageBadge } from "@/components/portfolio/StageBadge";
import { Trajectory } from "@/components/portfolio/Trajectory";
import { profile } from "@/data/profile";
import {
  archivedProjects,
  featuredProjects,
  projects,
  proofSummary,
  registryMeta,
} from "@/data/registry";

function SectionLabel({ number, children }: { number: string; children: string }) {
  return (
    <div className="mb-7 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {/*
        `text-foreground/45` resolved to #100d09 at 45% alpha, which against the
        contact section's inverted background — `background: var(--foreground)` —
        measured 1:1 and rendered the section number invisible. Current colour
        keeps it readable on the inverted section while staying a de-emphasised
        numeral on the normal ones; the divider is hidden there because a
        border-coloured rule disappears against it too.
      */}
      <span className="text-current opacity-60">{number}</span>
      <span className="h-px w-8 bg-border [.contact-section_&]:hidden" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export default function Landing() {
  const scrollTo = (id: string) => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="portfolio-shell min-h-screen overflow-x-hidden bg-background text-foreground">
      <SiteMetadata path="/" />
      <SiteHeader />

      <main id="main">
        {/* ---- hero -------------------------------------------------------- */}
        <section className="hero-section relative mx-auto flex min-h-[min(820px,100vh)] max-w-[1380px] flex-col justify-between px-5 pb-12 pt-32 sm:px-8 sm:pb-16 sm:pt-40 lg:px-12">
          <div className="hero-grid" aria-hidden="true" />
          <div className="relative z-10 max-w-5xl">
            <p className="hero-reveal hero-reveal-eyebrow eyebrow mb-8">
              {profile.name.toUpperCase()}
              <span className="mx-2 text-muted-foreground/40">/</span>
              {profile.role.toUpperCase()}
            </p>

            {/*
              The line breaks are the design at desktop width. Below 640px the
              type scales down hard enough that "Say what it does" would need
              ~590px inside a ~372px column, and `.portfolio-shell` clips the
              overflow — so the tail of the sentence silently disappeared on
              every phone. The breaks are therefore only applied when there is
              room for them; the words still read as three clauses without them.
            */}
            <h1 className="hero-reveal hero-reveal-title hero-title">
              <span className="hero-line">Build it.</span>
              <br className="hero-break" />
              <span className="text-muted-foreground hero-line">Measure it.</span>
              <br className="hero-break" />
              <span className="hero-line">
                Say what it does<span className="accent-dot">.</span>
              </span>
            </h1>

            <div className="hero-reveal hero-reveal-copy mt-9 flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl">
                {/*
                  The one-line positioning statement. A reader who scrolls past
                  everything else should still leave knowing what he builds and
                  what makes the work different, in two sentences, without
                  encountering the word "registry".
                */}
                <p className="text-base leading-7 text-foreground sm:text-lg">
                  {profile.roleSummary}
                </p>
                <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                  {profile.intro}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <button type="button" className="button-primary" onClick={() => scrollTo("work")}>
                  See the work <ArrowDown className="size-4" aria-hidden="true" />
                </button>
                <Link to="/projects" className="button-secondary">
                  All {projects.length} projects
                </Link>
                {/* Recruiter path: CV and GitHub are one tap from the first screen. */}
                <ContactActionsCompact />
              </div>
            </div>
          </div>

          <div className="hero-reveal hero-reveal-meta relative z-10 mt-24 flex items-end justify-between border-t border-border pt-5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <span>{profile.role}</span>
            <span>
              {featuredProjects.length} featured · {projects.length} total
            </span>
          </div>
        </section>

        {/* ---- about ------------------------------------------------------- */}
        <section id="about" className="section-shell border-t border-border">
          <div className="section-grid">
            <div>
              <SectionLabel number="01">About</SectionLabel>
              <h2 className="section-title">
                What I&apos;m
                <br />
                <span className="text-muted-foreground">actually doing.</span>
              </h2>
            </div>
            <div className="section-copy">
              {profile.about.map((paragraph, index) => (
                <p
                  key={paragraph}
                  className={index === 0 ? "large-copy" : "mt-6 text-muted-foreground"}
                >
                  {paragraph}
                </p>
              ))}
              <div className="mt-10 grid gap-0 border-y border-border sm:grid-cols-2">
                <div className="info-cell">
                  <span>Currently</span>
                  <strong>{profile.currently}</strong>
                </div>
                <div className="info-cell">
                  <span>Learning</span>
                  <strong>{profile.learning}</strong>
                </div>
                <div className="info-cell">
                  <span>Outside coding</span>
                  <strong>{profile.outsideCoding}</strong>
                </div>
                <div className="info-cell">
                  <span>Approach</span>
                  <strong>{profile.approach}</strong>
                </div>
              </div>
              <Trajectory />
            </div>
          </div>
        </section>

        {/* ---- proof summary ----------------------------------------------- */}
        <section id="proof" className="section-shell border-t border-border">
          <div className="section-grid">
            <div>
              <SectionLabel number="02">The receipts</SectionLabel>
              <h2 className="section-title">
                The whole point,
                <br />
                <span className="text-muted-foreground">counted.</span>
              </h2>
              <p className="mt-7 max-w-md text-sm leading-6 text-muted-foreground">
                A portfolio that asks you to trust its claims should be willing to
                publish its own arithmetic. Every figure below is counted from the
                registry as the site loads — none of it is typed in, so the count
                falls the moment a project stops carrying evidence.
              </p>
              <Link to="/compare" className="inline-link mt-7 w-fit">
                Compare all {projects.length} projects <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="section-copy">
              <ProofSummaryBar summary={proofSummary} />
              <p className="mt-5 text-xs leading-5 text-muted-foreground">
                <span className="font-medium text-foreground/70">Where these numbers come from: </span>
                the case-study files in{" "}
                <code className="text-foreground/70">registry/case-studies/</code>, merged with the
                generated upstream, evidence-ledger, CI and source-status snapshots imported{" "}
                {registryMeta.importedAt ? registryMeta.importedAt.slice(0, 10) : "on every build"}.
                {" "}
                <code className="text-foreground/70">registry:validate</code> refuses to publish a
                claim that does not carry one of these pointers.
              </p>
            </div>
          </div>
        </section>

        {/* ---- principles -------------------------------------------------- */}
        <section id="approach" className="philosophy-section border-y border-border">
          <div className="mx-auto grid max-w-[1380px] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-32">
            <div>
              <SectionLabel number="03">Approach</SectionLabel>
              <h2 className="section-title">
                Three rules
                <br />
                <span className="text-muted-foreground">I keep</span>
                <br />
                returning to<span className="accent-dot">.</span>
              </h2>
            </div>
            <div className="grid gap-px self-start border border-border bg-border">
              {profile.principles.map((principle, index) => (
                <div key={principle.title} className="bg-background p-7">
                  <span className="text-[11px] font-semibold tracking-[0.16em] text-foreground/35">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em]">
                    {principle.title}
                  </h3>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                    {principle.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- featured work ----------------------------------------------- */}
        <section id="work" className="section-shell">
          <div className="mb-14 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <SectionLabel number="04">Selected work</SectionLabel>
              <h2 className="section-title">
                {featuredProjects.length} projects,
                <br />
                <span className="text-muted-foreground">honestly labelled.</span>
              </h2>
            </div>
            <p className="max-w-xs text-sm leading-6 text-muted-foreground">
              Each has its own case study: the problem, the architecture, what the numbers
              are, what it cost, and what I would not claim.
            </p>
          </div>

          <div className="space-y-20">
            {featuredProjects.map((project, index) => {
              const flipped = index % 2 === 1;
              const lead = project.caseStudy.visuals[0];

              return (
                <article
                  key={project.slug}
                  className="project-row group grid gap-8 lg:grid-cols-[0.95fr_1.05fr]"
                >
                  <div className={flipped ? "lg:order-2" : ""}>
                    <Link to={`/projects/${project.slug}`} tabIndex={-1} aria-hidden="true">
                      {lead && (
                        <ProjectPreview
                          visual={lead}
                          accent={project.accent}
                          name={project.name}
                          featured
                          priority
                        />
                      )}
                    </Link>
                  </div>

                  <div className={`flex flex-col justify-center ${flipped ? "lg:order-1" : ""}`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="eyebrow">{String(index + 1).padStart(2, "0")}</span>
                      <StageBadge stage={project.stage} />
                      <span className="text-xs text-muted-foreground">{project.category}</span>
                    </div>

                    <h3 className="mt-5 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
                      {project.name}
                    </h3>
                    <p className="mt-2 text-lg tracking-tight text-muted-foreground">
                      {project.tagline}
                    </p>
                    <p className="mt-6 max-w-md text-sm leading-6 text-muted-foreground">
                      {project.summary}
                    </p>

                    {project.caseStudy.metrics.length > 0 && (
                      <dl className="mt-7 flex flex-wrap gap-x-8 gap-y-3">
                        {project.caseStudy.metrics.slice(0, 2).map((metric) => (
                          <div key={metric.label}>
                            <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                              {metric.label}
                            </dt>
                            <dd className="mt-1 text-base font-semibold tracking-tight">
                              {metric.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}

                    <Link to={`/projects/${project.slug}`} className="inline-link mt-9 w-fit">
                      Read the case study
                      <MoveUpRight
                        className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        aria-hidden="true"
                      />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          {/* ---- everything else ------------------------------------------- */}
          {archivedProjects.length > 0 && (
            <div className="mt-24 border-t border-border pt-7">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <p className="eyebrow">Everything else</p>
                <Link to="/projects" className="inline-link">
                  All {projects.length} projects <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
              <ul className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
                {archivedProjects.map((project) => (
                  <li key={project.slug} className="bg-background">
                    <Link
                      to={`/projects/${project.slug}`}
                      className="group block h-full p-5 transition-colors hover:bg-muted sm:p-7"
                    >
                      <div className="mb-12 flex items-center justify-between gap-3">
                        <StageBadge stage={project.stage} />
                        <ArrowUpRight
                          className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </div>
                      <h3 className="text-2xl font-semibold tracking-[-0.05em]">{project.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {project.tagline}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ---- contact ----------------------------------------------------- */}
        <section id="contact" className="contact-section border-t border-border">
          <div className="mx-auto max-w-[1380px] px-5 py-28 sm:px-8 lg:px-12 lg:py-40">
            <SectionLabel number="05">Contact</SectionLabel>
            <div className="flex flex-col justify-between gap-12 lg:flex-row lg:items-end">
              <div>
                <h2 className="section-title max-w-3xl">
                  Happy to talk about{" "}
                  <span className="text-muted-foreground">any of it.</span>
                </h2>
                <p className="mt-7 max-w-md text-base leading-7 text-muted-foreground">
                  Every claim on this site points at something checkable, and each case
                  study says plainly what it does <em>not</em> establish. If a claim here
                  does not hold up against the evidence behind it, I would rather know.
                </p>
                <p className="mt-4 max-w-md text-xs leading-5 text-muted-foreground">
                  A note on access: the repositories behind these projects are private,
                  so evidence links that point at source will ask you to sign in to
                  GitHub. What is verifiable without an account — CI runs, deployments,
                  benchmarks and the numbers on each case study — is what the claims
                  here actually rest on.
                </p>
              </div>
              <ContactActions />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
