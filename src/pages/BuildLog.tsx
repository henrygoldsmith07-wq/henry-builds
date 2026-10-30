import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/portfolio/SiteChrome";
import { SiteMetadata } from "@/components/portfolio/SiteMetadata";
import { EvidenceRow, EvidenceProjectContext, SourceAccessContext } from "@/components/portfolio/Evidence";
import { BuildTimeline } from "@/components/portfolio/BuildTimeline";
import { ClaimFreshnessReport } from "@/components/portfolio/FreshnessMonitor";
import { projects } from "@/data/registry";
import buildLog from "../../registry/build-log.json";
import type { Evidence } from "@/data/registry/schema";
import {
  BUILD_LOG_DESCRIPTION,
  BUILD_LOG_TITLE,
  collectionGraph,
} from "@/data/registry/structured-data.mjs";

/**
 * The crawler-visible graph, built by the same helper the static generator
 * calls so the hydrated page and `dist/build-log.html` agree. Module scope
 * keeps the reference stable so the head is not rewritten on every render.
 * No `entries`: the build log's entries are dated by nothing, so an ItemList
 * would imply an ordering that does not exist.
 */
const buildStructuredData = ({ origin }: { origin: string }) =>
  collectionGraph({
    origin,
    route: "/build-log",
    title: BUILD_LOG_TITLE,
    description: BUILD_LOG_DESCRIPTION,
  });

type Kind = "dead-end" | "decision" | "lesson" | "limitation";

interface LogEntry {
  kind: Kind;
  date: string | null;
  slug: string;
  project: string;
  title: string | null;
  body: string;
  change: string | null;
  evidence?: Evidence[] | null;
}

const KINDS: { key: Kind; label: string; blurb: string }[] = [
  {
    key: "dead-end",
    label: "Dead ends",
    blurb:
      "Approaches that were built and then abandoned. This is the part of a portfolio that is normally left out and the part that says the most about how the work was done.",
  },
  {
    key: "decision",
    label: "Decisions",
    blurb: "Constraints that were accepted knowingly, with both sides recorded.",
  },
  {
    key: "lesson",
    label: "Lessons",
    blurb: "What turned out to be true once the thing was built and measured.",
  },
  {
    key: "limitation",
    label: "Stated limits",
    blurb: "What each project does not establish, recorded rather than smoothed over.",
  },
];

/**
 * The engineering journal.
 *
 * Every entry is pulled from something the registry already records — there are
 * no invented entries and no invented dates. Where the registry does not record
 * a date, none is shown; the log says so rather than implying a chronology it
 * cannot support. Reordering these entries by date is therefore not possible
 * yet, and pretending otherwise would be the exact failure this site is built to
 * avoid.
 */
export default function BuildLog() {
  const entries = buildLog.entries as LogEntry[];
  const [active, setActive] = useState<Kind>("dead-end");
  const [viewMode, setViewMode] = useState<"tabular" | "timeline" | "freshness">("tabular");

  const byKind = useMemo(() => {
    const grouped = new Map<Kind, LogEntry[]>();
    for (const entry of entries) {
      const list = grouped.get(entry.kind) ?? [];
      list.push(entry);
      grouped.set(entry.kind, list);
    }
    // Keep every group's order independent of filesystem enumeration order.
    for (const list of grouped.values()) {
      list.sort((a, b) =>
        a.project.localeCompare(b.project)
        || a.slug.localeCompare(b.slug)
        || (a.title ?? "").localeCompare(b.title ?? "")
        || a.body.localeCompare(b.body),
      );
    }
    return grouped;
  }, [entries]);

  const current = byKind.get(active) ?? [];
  const currentBlurb = KINDS.find((k) => k.key === active)?.blurb ?? "";
  const undated = entries.every((e) => !e.date);

  // A lookup to resolve each entry back to its project for evidence chip
  // context. Without this, path-relative evidence links resolve against the
  // monorepo base rather than the project's actual repository, and private
  // source disclosure (the lock icon) never fires on this page.
  const projectBySlug = useMemo(
    () => new Map(projects.map((p) => [p.slug, p])),
    // `projects` is a module-level import, not a prop — it never changes
    // identity within a session, so the map never needs recomputing.
    [],
  );

  return (
    <div className="portfolio-shell">
      <SiteMetadata
        title={BUILD_LOG_TITLE}
        description={BUILD_LOG_DESCRIPTION}
        path="/build-log"
        image="/og/build-log.png"
        buildStructuredData={buildStructuredData}
      />
      <SiteHeader />
      <main id="main">
        <section className="mx-auto max-w-[1380px] px-5 pb-16 pt-36 sm:px-8 lg:px-12 lg:pt-44">
          <h1 className="section-title max-w-4xl">
            Build <span className="text-muted-foreground">log.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground">
            {entries.length} recorded decisions, dead ends and stated limits across{" "}
            {projects.length} projects. Everything here is pulled from a case
            study — the constraint that was accepted, the approach that was tried
            and dropped, or the limit that is still there. Nothing on this page
            was written to make the work look tidier than it was.
          </p>

          {undated && (
            <p className="mt-6 max-w-2xl border-l-2 border-border pl-4 text-sm leading-6 text-muted-foreground">
              These entries are not dated, because the registry does not record
              when each decision was taken. Showing a date would be inventing
              one. They are grouped by kind instead, and they will gain a
              chronology as the case studies record one.
            </p>
          )}
        </section>

        <section className="mx-auto max-w-[1380px] px-5 pb-24 sm:px-8 lg:px-12">
          <div className="mb-8 flex flex-wrap gap-2" role="tablist" aria-label="Entry kind">
            {KINDS.map((kind) => {
              const count = byKind.get(kind.key)?.length ?? 0;
              if (count === 0) return null;
              const selected = active === kind.key;
              return (
                <button
                  key={kind.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`${selected ? "button-primary" : "button-secondary"} min-h-11 px-4`}
                  onClick={() => setActive(kind.key)}
                >
                  {kind.label} ({count})
                </button>
              );
            })}
          </div>
          
          {/* View mode toggles */}
          <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">View:</span>
            <button
              onClick={() => setViewMode("tabular")}
              className={`rounded-lg px-3 py-1.5 ${
                viewMode === "tabular"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Entries
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`rounded-lg px-3 py-1.5 ${
                viewMode === "timeline"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode("freshness")}
              className={`rounded-lg px-3 py-1.5 ${
                viewMode === "freshness"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Freshness Report
            </button>
          </div>

          <p className="mb-10 max-w-2xl text-sm leading-6 text-muted-foreground">{currentBlurb}</p>

          {viewMode === "tabular" && (
            <>
              <ol className="max-w-3xl space-y-px overflow-hidden border border-border bg-border">
                {current.map((entry) => (
                  <li key={`${entry.slug}-${entry.kind}-${entry.body.slice(0, 24)}`} className="bg-background p-5 sm:p-6">
                    <p className="eyebrow">{entry.project}</p>
                    {entry.title && (
                      <p className="mt-2 text-base font-semibold tracking-tight">{entry.title}</p>
                    )}
                    <p className="mt-2 text-sm leading-6 text-foreground/85">{entry.body}</p>
                    {entry.change && (
                      <p className="mt-3 border-l-2 border-border pl-4 text-sm leading-6 text-muted-foreground">
                        {entry.change}
                      </p>
                    )}
                    {entry.evidence && entry.evidence.length > 0 && (
                      <SourceAccessContext.Provider
                        value={projectBySlug.get(entry.slug)?.sourceAccess === "private"}
                      >
                        <EvidenceProjectContext.Provider value={projectBySlug.get(entry.slug) ?? null}>
                          <EvidenceRow items={entry.evidence} />
                        </EvidenceProjectContext.Provider>
                      </SourceAccessContext.Provider>
                    )}
                    <Link
                      to={`/projects/${entry.slug}`}
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
                    >
                      Read the case study
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ol>
            </>
          )}
          
          {viewMode === "timeline" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-muted p-6 text-center">
                <h3 className="text-lg font-semibold">Interactive Build Timeline</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Viewing CI events, deployments, and verification history across all projects.
                  This view is powered by automated event generation from registry data.
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  Note: Full timeline integration requires build-log.json population with historical events.
                  For now, see the tabular view for decision/lesson entries or the freshness report for evidence validation status.
                </p>
              </div>
              
              {/* Placeholder for future timeline implementation */}
              <div className="rounded-xl border border-dashed border-border bg-background p-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Interactive timeline visualization coming in next iteration. 
                  The <strong>Freshness Report</strong> view above shows current evidence age and expiration risks.
                </p>
              </div>
            </div>
          )}
          
          {viewMode === "freshness" && (
            <ClaimFreshnessReport />
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}