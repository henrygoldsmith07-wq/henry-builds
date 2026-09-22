import { ArrowUpRight, Search, X } from "lucide-react";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { SiteFooter, SiteHeader } from "@/components/portfolio/SiteChrome";
import { SiteMetadata } from "@/components/portfolio/SiteMetadata";
import { SourceStateBadge } from "@/components/portfolio/SourceState";
import { StageBadge, StageLegend } from "@/components/portfolio/StageBadge";
import { projects, registryMeta } from "@/data/registry";
import { stageOrder, type Stage } from "@/data/registry/schema";

const ALL = "all" as const;

export default function Projects() {
  const [searchParams, setSearchParams] = useSearchParams();

  const stagesPresent = useMemo(
    () =>
      stageOrder.filter((stage) =>
        projects.some((project) => project.stage === stage),
      ),
    [],
  );

  const categories = useMemo(
    () =>
      Array.from(new Set(projects.map((project) => project.category))).sort(),
    [],
  );

  const query = searchParams.get("q")?.trim() ?? "";
  const stageParam = searchParams.get("stage");
  const categoryParam = searchParams.get("category");
  const stageFilter: Stage | typeof ALL = stageOrder.includes(
    stageParam as Stage,
  )
    ? (stageParam as Stage)
    : ALL;
  const categoryFilter =
    categoryParam && categories.includes(categoryParam) ? categoryParam : ALL;

  const updateFilters = (
    updates: Partial<{
      q: string;
      stage: Stage | typeof ALL;
      category: string;
    }>,
  ) => {
    const next = new URLSearchParams(searchParams);

    if (updates.q !== undefined) {
      const nextQuery = updates.q.trimStart();
      if (nextQuery) next.set("q", nextQuery);
      else next.delete("q");
    }

    if (updates.stage !== undefined) {
      if (updates.stage === ALL) next.delete("stage");
      else next.set("stage", updates.stage);
    }

    if (updates.category !== undefined) {
      if (updates.category === ALL) next.delete("category");
      else next.set("category", updates.category);
    }

    setSearchParams(next, { replace: true });
  };

  const visible = useMemo(() => {
    const needle = query.toLocaleLowerCase();

    return projects.filter((project) => {
      if (stageFilter !== ALL && project.stage !== stageFilter) return false;
      if (categoryFilter !== ALL && project.category !== categoryFilter)
        return false;
      if (!needle) return true;

      const searchable = [
        project.name,
        project.tagline,
        project.summary,
        project.category,
        ...project.tags,
        project.upstream?.stack,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return searchable.includes(needle);
    });
  }, [categoryFilter, query, stageFilter]);

  const hasFilters =
    query.length > 0 || stageFilter !== ALL || categoryFilter !== ALL;

  return (
    <div className="portfolio-shell min-h-screen overflow-x-hidden bg-background text-foreground">
      <SiteMetadata
        title="All work — Henry Goldsmith"
        description="Every project in the registry, including the weaker and unfinished ones, with an honest stage label on each."
        path="/projects"
        image="/og/projects.png"
      />
      <SiteHeader />

      <main id="main">
        <section className="mx-auto max-w-[1380px] px-5 pb-14 pt-28 sm:px-8 sm:pt-36 lg:px-12">
          <p className="eyebrow mb-7">All work</p>
          <h1 className="section-title max-w-3xl">
            Everything,
            <br />
            <span className="text-muted-foreground">
              including what isn&apos;t finished.
            </span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground">
            The landing page shows six projects. This page shows all of them —
            prototypes, research and the things that stalled — each with a stage
            label that means something specific.
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
            {registryMeta.upstreamCount} entries upstream,{" "}
            {registryMeta.publishedCount} published here.
          </p>
        </section>

        <section className="mx-auto max-w-[1380px] px-5 pb-12 sm:px-8 lg:px-12">
          <h2 className="eyebrow mb-5">What the labels mean</h2>
          <StageLegend />
        </section>

        <section className="mx-auto max-w-[1380px] px-5 pb-24 sm:px-8 lg:px-12">
          <div className="mb-7 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px_auto]">
            <label className="relative block">
              <span className="sr-only">Search projects</span>
              <Search
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => updateFilters({ q: event.target.value })}
                placeholder="Search by project, technology or topic"
                className="min-h-12 w-full rounded-full border border-border bg-background pl-11 pr-11 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => updateFilters({ q: "" })}
                  className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Clear project search"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
            </label>

            <label className="relative block">
              <span className="sr-only">Filter by category</span>
              <select
                value={categoryFilter}
                onChange={(event) =>
                  updateFilters({ category: event.target.value })
                }
                className="min-h-12 w-full rounded-full border border-border bg-background px-4 text-sm outline-none transition-colors focus:border-foreground"
              >
                <option value={ALL}>All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category} (
                    {
                      projects.filter(
                        (project) => project.category === category,
                      ).length
                    }
                    )
                  </option>
                ))}
              </select>
            </label>

            {hasFilters && (
              <button
                type="button"
                className="button-secondary justify-center"
                onClick={() => setSearchParams({}, { replace: true })}
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div
              className="flex flex-wrap items-center gap-2"
              role="group"
              aria-label="Filter by stage"
            >
              <button
                type="button"
                className={`filter-chip ${stageFilter === ALL ? "filter-chip-active" : ""}`}
                onClick={() => updateFilters({ stage: ALL })}
                aria-pressed={stageFilter === ALL}
              >
                All ({projects.length})
              </button>
              {stagesPresent.map((stage) => {
                const count = projects.filter(
                  (project) => project.stage === stage,
                ).length;
                return (
                  <button
                    key={stage}
                    type="button"
                    className={`filter-chip ${stageFilter === stage ? "filter-chip-active" : ""}`}
                    onClick={() => updateFilters({ stage })}
                    aria-pressed={stageFilter === stage}
                  >
                    {stage} ({count})
                  </button>
                );
              })}
            </div>

            <p
              className="text-xs text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              Showing {visible.length} of {projects.length} projects
            </p>
          </div>

          <ul className="grid gap-px overflow-hidden border border-border bg-border">
            {visible.map((project) => {
              const evidenceCount =
                project.caseStudy.outcomes.reduce(
                  (sum, o) => sum + o.evidence.length,
                  0,
                ) +
                project.caseStudy.metrics.reduce(
                  (sum, m) => sum + m.evidence.length,
                  0,
                );

              return (
                <li key={project.slug} className="bg-background">
                  <Link
                    to={`/projects/${project.slug}`}
                    className="project-row-link group"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <StageBadge stage={project.stage} />
                      <SourceStateBadge sourceState={project.sourceState} />
                      <span className="text-xs text-muted-foreground">
                        {project.category}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-2xl font-semibold tracking-[-0.05em]">
                        {project.name}
                      </h3>
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
                        {evidenceCount} evidence{" "}
                        {evidenceCount === 1 ? "link" : "links"}
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
            <div className="mt-8 border border-border p-7 sm:p-9">
              <p className="text-lg font-semibold tracking-tight">
                No projects match those filters.
              </p>
              <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                Try a broader search, another category, or reset the filters to
                return to the full archive.
              </p>
              <button
                type="button"
                className="inline-link mt-5"
                onClick={() => setSearchParams({}, { replace: true })}
              >
                Show all projects
              </button>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
