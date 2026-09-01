import { ArrowUpRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { SiteFooter, SiteHeader } from "@/components/portfolio/SiteChrome";
import { SiteMetadata } from "@/components/portfolio/SiteMetadata";
import { SourceStateBadge } from "@/components/portfolio/SourceState";
import { StageBadge, StageLegend } from "@/components/portfolio/StageBadge";
import { projects, registryMeta } from "@/data/registry";
import { stageOrder, type Stage } from "@/data/registry/schema";

const ALL = "all" as const;

export default function Projects() {
  const [filter, setFilter] = useState<Stage | typeof ALL>(ALL);

  const stagesPresent = useMemo(
    () => stageOrder.filter((stage) => projects.some((project) => project.stage === stage)),
    [],
  );

  const visible = useMemo(
    () => (filter === ALL ? projects : projects.filter((project) => project.stage === filter)),
    [filter],
  );

  return (
    <div className="portfolio-shell min-h-screen overflow-x-hidden bg-background text-foreground">
      <SiteMetadata
        title="All work — Henry Goldsmith"
        description="Every project in the registry, including the weaker and unfinished ones, with an honest stage label on each."
        path="/projects"
      />
      <SiteHeader />

      <main id="main">
        <section className="mx-auto max-w-[1380px] px-5 pb-14 pt-28 sm:px-8 sm:pt-36 lg:px-12">
          <p className="eyebrow mb-7">All work</p>
          <h1 className="section-title max-w-3xl">
            Everything,
            <br />
            <span className="text-muted-foreground">including what isn&apos;t finished.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground">
            The landing page shows six projects. This page shows all of them — prototypes,
            research and the things that stalled — each with a stage label that means something
            specific.
          </p>
          <p className="mt-5 max-w-xl text-xs leading-5 text-muted-foreground">
            Imported from{" "}
            <a
              className="underline underline-offset-2 hover:text-foreground"
              href={`https://github.com/${registryMeta.source.repo}/blob/${registryMeta.source.ref}/${registryMeta.source.path}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {registryMeta.source.repo}/{registryMeta.source.path}
            </a>
            {" — "}
            {registryMeta.upstreamCount} entries upstream, {registryMeta.publishedCount} published
            here.
          </p>
        </section>

        <section className="mx-auto max-w-[1380px] px-5 pb-12 sm:px-8 lg:px-12">
          <h2 className="eyebrow mb-5">What the labels mean</h2>
          <StageLegend />
        </section>

        <section className="mx-auto max-w-[1380px] px-5 pb-24 sm:px-8 lg:px-12">
          <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by stage">
            <button
              type="button"
              className={`filter-chip ${filter === ALL ? "filter-chip-active" : ""}`}
              onClick={() => setFilter(ALL)}
              aria-pressed={filter === ALL}
            >
              All ({projects.length})
            </button>
            {stagesPresent.map((stage) => {
              const count = projects.filter((project) => project.stage === stage).length;
              return (
                <button
                  key={stage}
                  type="button"
                  className={`filter-chip ${filter === stage ? "filter-chip-active" : ""}`}
                  onClick={() => setFilter(stage)}
                  aria-pressed={filter === stage}
                >
                  {stage} ({count})
                </button>
              );
            })}
          </div>

          <ul className="grid gap-px overflow-hidden border border-border bg-border">
            {visible.map((project) => {
              const evidenceCount =
                project.caseStudy.outcomes.reduce((sum, o) => sum + o.evidence.length, 0) +
                project.caseStudy.metrics.reduce((sum, m) => sum + m.evidence.length, 0);

              return (
                <li key={project.slug} className="bg-background">
                  <Link to={`/projects/${project.slug}`} className="project-row-link group">
                    <div className="flex flex-wrap items-center gap-3">
                      <StageBadge stage={project.stage} />
                      <SourceStateBadge sourceState={project.sourceState} />
                      <span className="text-xs text-muted-foreground">{project.category}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-2xl font-semibold tracking-[-0.05em]">{project.name}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                        {project.tagline}
                      </p>
                      {project.ci && (
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                          Last code verification (green CI):{" "}
                          {project.ci.lastVerifiedAt ? (
                            project.ci.lastVerifiedAt.slice(0, 10)
                          ) : (
                            <span>none recorded</span>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-6">
                      <span className="hidden text-xs text-muted-foreground sm:block">
                        {evidenceCount} evidence {evidenceCount === 1 ? "link" : "links"}
                      </span>
                      <ArrowUpRight
                        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {visible.length === 0 && (
            <p className="mt-8 text-sm text-muted-foreground">Nothing at that stage yet.</p>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
