import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/portfolio/SiteChrome";
import { SiteMetadata } from "@/components/portfolio/SiteMetadata";
import { projects } from "@/data/registry";
import buildLog from "../../registry/build-log.json";
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

  const byKind = useMemo(() => {
    const grouped = new Map<Kind, LogEntry[]>();
    for (const entry of entries) {
      const list = grouped.get(entry.kind) ?? [];
      list.push(entry);
      grouped.set(entry.kind, list);
    }
    // Dead ends first — they are the reason to read the page — then the rest by
    // project name so the order is stable and re-running the generator does not
    // reshuffle the page.
    for (const list of grouped.values()) {
      if (list[0]?.kind !== "dead-end") list.sort((a, b) => a.project.localeCompare(b.project));
    }
    return grouped;
  }, [entries]);

  const current = byKind.get(active) ?? [];
  const currentBlurb = KINDS.find((k) => k.key === active)?.blurb ?? "";
  const undated = entries.every((e) => !e.date);

  return (
    <div className="portfolio-shell">
      <SiteMetadata
        title={BUILD_LOG_TITLE}
        description={BUILD_LOG_DESCRIPTION}
        path="/build-log"
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

          <p className="mb-10 max-w-2xl text-sm leading-6 text-muted-foreground">{currentBlurb}</p>

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
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}