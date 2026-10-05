import { Link } from "react-router";
import { projects, daysSinceVerified } from "@/data/registry";

/**
 * Where the work stands, and what is actually known about when.
 *
 * The brief asked for a personal trajectory timeline. Almost every timeline on a
 * portfolio of this kind is written from memory: "started building in 2024",
 * "learning since university", each entry a plausible reconstruction rather
 * than a recorded fact. That is fabrication with a timeline layout, and it would
 * sit directly beneath a section about not claiming more than can be shown.
 *
 * So this shows only what the repository genuinely records:
 *
 *  - **when each project's claims were last verified**, from `lastVerifiedAt`;
 *  - **when source removal was detected**, from `sourceRemoved.detectedAt`,
 *    which is how the 2026-08 monorepo migration is known to have happened;
 *  - **how the portfolio is composed right now**, counted live from the registry.
 *
 * Build dates are not recorded anywhere in the registry, so they are not shown.
 * The gap is stated rather than filled.
 */
export function Trajectory() {
  // Every real date the registry holds, collected rather than hand-listed.
  const milestones = new Map<string, { date: string; titles: string[]; slugs: string[] }>();

  for (const project of projects) {
    const verified = project.caseStudy.lastVerifiedAt;
    if (verified) {
      const day = verified.slice(0, 10);
      const entry = milestones.get(day) ?? { date: day, titles: [], slugs: [] };
      entry.titles.push(`Claims re-verified for ${project.name}`);
      entry.slugs.push(project.slug);
      milestones.set(day, entry);
    }
    const removed = project.sourceRemoved;
    if (removed) {
      const day = removed.detectedAt.slice(0, 10);
      const entry = milestones.get(day) ?? { date: day, titles: [], slugs: [] };
      entry.titles.push(`Source removal detected for ${project.name} — ${removed.note}`);
      entry.slugs.push(project.slug);
      milestones.set(day, entry);
    }
  }

  const dated = [...milestones.values()].sort((a, b) => b.date.localeCompare(a.date));

  // Composition, counted live: this cannot drift from the registry.
  const stages = new Map<string, string[]>();
  for (const project of projects) {
    const list = stages.get(project.stage) ?? [];
    list.push(project.name);
    stages.set(project.stage, list);
  }
  const order = ["shipped", "beta", "prototype", "research", "archived"] as const;

  const stalest = projects
    .map((project) => ({ project, age: daysSinceVerified(project) }))
    .filter((entry) => entry.age !== null)
    .sort((a, b) => (b.age ?? 0) - (a.age ?? 0))[0];

  return (
    <div className="mt-14">
      <h3 className="text-lg font-semibold tracking-[-0.03em]">What is recorded, and what is not</h3>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
        A timeline here would normally be written from memory. This one is built
        from what the repository actually stores, which is much smaller: when
        each project&apos;s claims were last checked against its source, and when
        source removal was detected. Build dates are not recorded anywhere in the
        registry, so they are not shown rather than guessed at.
      </p>

      {dated.length > 0 ? (
        <ol className="mt-8 border-l border-border">
          {dated.map((entry) => (
            <li key={entry.date} className="relative pb-7 pl-6 last:pb-0">
              <span
                className="absolute -left-[4.5px] top-1.5 size-2 rounded-full bg-foreground"
                aria-hidden="true"
              />
              <time className="font-mono text-xs text-muted-foreground" dateTime={entry.date}>
                {entry.date}
              </time>
              <ul className="mt-2 space-y-1.5">
                {entry.titles.map((title, index) => (
                  <li key={title} className="text-sm leading-6 text-foreground/85">
                    {index === 0 ? (
                      <Link
                        to={`/projects/${entry.slugs[index]}`}
                        className="hover:underline"
                      >
                        {title}
                      </Link>
                    ) : (
                      title
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">
          No dated milestones are currently recorded.
        </p>
      )}

      <div className="mt-12 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2">
        <div className="bg-background p-5">
          <p className="eyebrow">How the work is composed</p>
          <dl className="mt-3 space-y-1.5">
            {order
              .filter((stage) => stages.has(stage))
              .map((stage) => (
                <div key={stage} className="flex items-baseline justify-between gap-4">
                  <dt className="text-sm capitalize">{stage}</dt>
                  <dd className="text-sm text-muted-foreground">
                    {stages.get(stage)!.length}
                  </dd>
                </div>
              ))}
          </dl>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Counted live from the registry, so this cannot drift from what the
            site actually shows.
          </p>
        </div>
        <div className="bg-background p-5">
          <p className="eyebrow">Oldest unverified claim</p>
          {stalest ? (
            <>
              <p className="mt-3 text-sm leading-6">
                <Link
                  to={`/projects/${stalest.project.slug}`}
                  className="font-medium hover:underline"
                >
                  {stalest.project.name}
                </Link>{" "}
                <span className="text-muted-foreground">
                  — {stalest.age} days since its claims were last checked.
                </span>
              </p>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Shown because a portfolio that tracks freshness has to be willing
                to display its own least-fresh entry.
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No verification dates recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
}