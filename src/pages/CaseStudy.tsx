import { ArrowLeft, ArrowRight, ExternalLink, Github, Minus, Plus } from "lucide-react";
import { Link, useParams } from "react-router";
import { ArchitectureDiagram } from "@/components/portfolio/ArchitectureDiagram";
import { ClaimItem, MetricCard } from "@/components/portfolio/Evidence";
import { ProjectPreview } from "@/components/portfolio/ProjectPreview";
import { SiteFooter, SiteHeader } from "@/components/portfolio/SiteChrome";
import { SiteMetadata } from "@/components/portfolio/SiteMetadata";
import { StageBadge } from "@/components/portfolio/StageBadge";
import NotFound from "@/pages/NotFound";
import { getProject, projects } from "@/data/registry";

function Section({
  number,
  title,
  children,
  id,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="case-section">
      <div className="case-section-head">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/40">
          {number}
        </span>
        <h2 className="text-xl font-semibold tracking-[-0.03em]">{title}</h2>
      </div>
      <div className="case-section-body">{children}</div>
    </section>
  );
}

export default function CaseStudy() {
  const { slug } = useParams<{ slug: string }>();
  const project = slug ? getProject(slug) : undefined;

  if (!project) return <NotFound />;

  const index = projects.findIndex((item) => item.slug === project.slug);
  const previous = index > 0 ? projects[index - 1] : undefined;
  const next = index < projects.length - 1 ? projects[index + 1] : undefined;

  const { caseStudy: study, authorship } = project;
  const lead = study.visuals[0];

  return (
    <div className="portfolio-shell min-h-screen overflow-x-hidden bg-background text-foreground">
      <SiteMetadata
        title={`${project.name} — ${project.tagline}`}
        description={project.summary}
        path={`/projects/${project.slug}`}
        type="article"
        project={project}
      />
      <SiteHeader />

      <main id="main">
        <article>
          {/* ---- header ---------------------------------------------------- */}
          <header className="mx-auto max-w-[1380px] px-5 pb-12 pt-28 sm:px-8 sm:pt-36 lg:px-12">
            <Link to="/projects" className="inline-link mb-10">
              <ArrowLeft className="size-3.5" aria-hidden="true" /> All work
            </Link>

            <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <StageBadge stage={project.stage} />
                  <span className="text-xs text-muted-foreground">{project.category}</span>
                  {project.upstream?.stack && (
                    <span className="text-xs text-muted-foreground">· {project.upstream.stack}</span>
                  )}
                </div>
                <h1 className="mt-6 text-5xl font-semibold tracking-[-0.06em] sm:text-7xl">
                  {project.name}
                </h1>
                <p className="mt-4 max-w-xl text-xl leading-8 tracking-tight text-muted-foreground">
                  {project.tagline}
                </p>
              </div>

              <div>
                <p className="max-w-md text-sm leading-6 text-muted-foreground">{project.summary}</p>
                <div className="mt-7 flex flex-wrap gap-3">
                  {project.liveUrl && (
                    <a
                      className="button-primary"
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Visit live <ExternalLink className="size-4" aria-hidden="true" />
                    </a>
                  )}
                  {project.repo && (
                    <a
                      className="button-secondary"
                      href={project.repo.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {project.repo.label} <Github className="size-4" aria-hidden="true" />
                    </a>
                  )}
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span key={tag} className="pill">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </header>

          {/* ---- lead visual ----------------------------------------------- */}
          {lead && (
            <div className="mx-auto max-w-[1380px] px-5 sm:px-8 lg:px-12">
              <ProjectPreview visual={lead} accent={project.accent} name={project.name} featured />
              {lead.caption && (
                <p className="mt-3 text-xs text-muted-foreground">{lead.caption}</p>
              )}
            </div>
          )}

          <div className="mx-auto max-w-[1380px] px-5 sm:px-8 lg:px-12">
            {/* ---- what I built -------------------------------------------- */}
            <Section number="01" title="What I built" id="authorship">
              <p className="text-sm leading-6 text-foreground/85">{authorship.role}</p>
              <div className="mt-8 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2">
                <div className="bg-background p-6">
                  <p className="eyebrow flex items-center gap-2">
                    <Plus className="size-3.5" aria-hidden="true" /> Built by me
                  </p>
                  <ul className="mt-4 space-y-3">
                    {authorship.built.map((item) => (
                      <li key={item} className="text-sm leading-6 text-muted-foreground">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-background p-6">
                  <p className="eyebrow flex items-center gap-2">
                    <Minus className="size-3.5" aria-hidden="true" /> Not mine
                  </p>
                  {authorship.notBuilt.length > 0 ? (
                    <ul className="mt-4 space-y-3">
                      {authorship.notBuilt.map((item) => (
                        <li key={item} className="text-sm leading-6 text-muted-foreground">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">
                      Nothing substantial borrowed beyond the language and its standard library.
                    </p>
                  )}
                </div>
              </div>
            </Section>

            {/* ---- problem / approach -------------------------------------- */}
            <Section number="02" title="The problem" id="problem">
              <p className="large-copy max-w-3xl">{study.problem}</p>
            </Section>

            <Section number="03" title="The approach" id="approach">
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                {study.approach}
              </p>
            </Section>

            {/* ---- architecture -------------------------------------------- */}
            {study.architecture && (
              <Section number="04" title="Architecture" id="architecture">
                <ArchitectureDiagram architecture={study.architecture} />
              </Section>
            )}

            {/* ---- demo video ---------------------------------------------- */}
            {study.video && (
              <Section number="05" title="Demo" id="demo">
                <video
                  className="w-full rounded-[1.25rem] border border-border"
                  src={study.video.src}
                  poster={study.video.poster}
                  controls
                  preload="none"
                />
                <p className="mt-3 text-xs text-muted-foreground">{study.video.caption}</p>
              </Section>
            )}

            {/* ---- measurements -------------------------------------------- */}
            {study.metrics.length > 0 && (
              <Section number="06" title="Measurements" id="measurements">
                <div className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2">
                  {study.metrics.map((metric) => (
                    <MetricCard key={metric.label} metric={metric} />
                  ))}
                </div>
              </Section>
            )}

            {/* ---- outcomes ------------------------------------------------ */}
            {study.outcomes.length > 0 && (
              <Section number="07" title="What holds up" id="outcomes">
                <p className="mb-7 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Each statement links to the thing that backs it. Nothing appears here without one.
                </p>
                <ul className="space-y-px overflow-hidden border border-border bg-border">
                  {study.outcomes.map((outcome) => (
                    <ClaimItem key={outcome.statement} claim={outcome} />
                  ))}
                </ul>
              </Section>
            )}

            {/* ---- trade-offs ---------------------------------------------- */}
            {study.tradeoffs.length > 0 && (
              <Section number="08" title="Trade-offs" id="tradeoffs">
                <div className="space-y-px overflow-hidden border border-border bg-border">
                  {study.tradeoffs.map((tradeoff) => (
                    <div key={tradeoff.choice} className="bg-background p-6">
                      <p className="text-sm font-semibold tracking-tight">{tradeoff.choice}</p>
                      <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        <div>
                          <p className="eyebrow">What it gained</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {tradeoff.gained}
                          </p>
                        </div>
                        <div>
                          <p className="eyebrow">What it cost</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {tradeoff.gaveUp}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ---- failed approaches --------------------------------------- */}
            {study.failedApproaches.length > 0 && (
              <Section number="09" title="What did not work" id="failed">
                <div className="space-y-px overflow-hidden border border-border bg-border">
                  {study.failedApproaches.map((failure) => (
                    <div key={failure.approach} className="bg-background p-6">
                      <p className="text-sm font-semibold tracking-tight">{failure.approach}</p>
                      <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        <div>
                          <p className="eyebrow">Why it failed</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {failure.whyItFailed}
                          </p>
                        </div>
                        <div>
                          <p className="eyebrow">What changed</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {failure.whatItChanged}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ---- lessons -------------------------------------------------- */}
            {study.lessons.length > 0 && (
              <Section number="10" title="What I took from it" id="lessons">
                <ul className="space-y-6">
                  {study.lessons.map((lesson, i) => (
                    <li key={lesson} className="flex gap-5">
                      <span className="text-[11px] font-semibold tracking-[0.14em] text-foreground/35">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="max-w-2xl text-base leading-7 text-foreground/85">{lesson}</p>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        </article>

        {/* ---- prev / next ------------------------------------------------- */}
        <nav
          className="mx-auto mt-10 grid max-w-[1380px] gap-px border-y border-border bg-border sm:grid-cols-2"
          aria-label="More projects"
        >
          {previous ? (
            <Link to={`/projects/${previous.slug}`} className="case-nav group">
              <span className="eyebrow flex items-center gap-2">
                <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
                Previous
              </span>
              <span className="mt-4 text-2xl font-semibold tracking-[-0.04em]">{previous.name}</span>
            </Link>
          ) : (
            <span className="case-nav" aria-hidden="true" />
          )}
          {next && (
            <Link to={`/projects/${next.slug}`} className="case-nav group sm:text-right">
              <span className="eyebrow flex items-center gap-2 sm:justify-end">
                Next
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </span>
              <span className="mt-4 text-2xl font-semibold tracking-[-0.04em]">{next.name}</span>
            </Link>
          )}
        </nav>
      </main>

      <SiteFooter />
    </div>
  );
}
