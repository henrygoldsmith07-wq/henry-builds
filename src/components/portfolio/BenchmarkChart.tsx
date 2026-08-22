import type { Metric } from "@/data/registry/schema";

/**
 * A horizontal bar chart over metrics that earned their place: every bar comes
 * from a metric with `chart` set to its numeric value, and every such metric
 * carries evidence. This renders measured things — it never decorates.
 */
export function BenchmarkChart({ metrics }: { metrics: Metric[] }) {
  const chartable = metrics
    .filter((metric) => typeof metric.chart === "number")
    .map((metric) => ({ ...metric, value0to100: Math.max(0, Math.min(100, metric.chart ?? 0)) }));

  if (chartable.length < 2) return null;

  return (
    <figure className="benchmark-chart" data-testid="benchmark-chart">
      <figcaption className="eyebrow mb-5">
        Benchmark results — each bar is a measurement with evidence below
      </figcaption>
      <ul className="space-y-4">
        {chartable.map((metric) => (
          <li key={metric.label}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-medium tracking-tight">{metric.label}</span>
              <span className="text-sm tabular-nums text-muted-foreground">{metric.value}</span>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`${metric.label}: ${metric.chart} percent`}
            >
              <div
                className="h-full rounded-full bg-accent-foreground/80 transition-[width] duration-500"
                style={{ width: `${metric.value0to100}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{metric.method}</p>
          </li>
        ))}
      </ul>
    </figure>
  );
}
