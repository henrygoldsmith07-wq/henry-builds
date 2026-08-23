import type { FactsSnapshot } from "@/data/registry/schema";

/**
 * Test-count trend over the facts history. Every point is a dated snapshot
 * pulled from CI by the importer — nothing here is hand-maintained. Renders
 * only when there are at least two observations; one number is a fact, two
 * are a trend.
 */
export function TestTrend({ history }: { history: FactsSnapshot[] }) {
  const points = history
    .filter((s) => typeof s.ci?.tests === "number")
    .map((s) => ({ date: s.date, tests: s.ci!.tests! }));

  if (points.length < 2) return null;

  const width = 320;
  const height = 56;
  const pad = 4;
  const values = points.map((p) => p.tests);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = (width - pad * 2) / (points.length - 1);
  const coords = points.map((p, i) => ({
    x: pad + i * step,
    y: pad + (1 - (p.tests - min) / span) * (height - pad * 2),
  }));
  const latest = points[points.length - 1];
  const first = points[0];
  const delta = latest.tests - first.tests;

  return (
    <figure className="test-trend" data-testid="test-trend">
      <figcaption className="eyebrow mb-3">
        Automated tests over time — collected from green CI runs on each import
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={`Test count trend: ${first.tests} on ${first.date} to ${latest.tests} on ${latest.date}`}
      >
        <polyline
          points={coords.map((c) => `${c.x},${c.y}`).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-muted-foreground"
        />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="2" fill="currentColor" />
        ))}
      </svg>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {first.tests} → {latest.tests} between {first.date} and {latest.date}
        {delta !== 0 && (
          <span className={delta > 0 ? "" : "freshness-stale"}>
            {" "}
            ({delta > 0 ? "+" : ""}
            {delta})
          </span>
        )}
        . History starts when this pipeline first ran — it grows with every import.
      </p>
    </figure>
  );
}
