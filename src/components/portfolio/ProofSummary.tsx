import { FileCheck2, FlaskConical, Link2, ListChecks, ShieldCheck, Sparkles } from "lucide-react";
import type { ProofSummary } from "@/data/registry";

/**
 * The site's own arithmetic.
 *
 * Every figure is counted from the registry at load time (see buildProofSummary),
 * not written into this component. That distinction is the whole point: a
 * portfolio that claims "everything is checkable" should be willing to publish
 * the count of what is, and let the count fall if a project stops carrying
 * evidence. There is no hand-maintained number here to drift out of date.
 */
function Stat({
  value,
  label,
  detail,
  icon: Icon,
}: {
  value: string;
  label: string;
  detail: string;
  icon: typeof Link2;
}) {
  return (
    <div className="bg-background p-6">
      <p className="eyebrow flex items-center gap-2">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] tabular-nums">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

export function ProofSummaryBar({ summary }: { summary: ProofSummary }) {
  const ciDetail =
    summary.ciTracked === 0
      ? "No CI facts are imported for these projects yet."
      : `${summary.ciGreen} of ${summary.ciTracked} projects have a green newest run; a red one is shown as red, not hidden.`;

  return (
    <div className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
      <Stat
        value={String(summary.evidenceLinks)}
        label="Distinct evidence links"
        detail="Every one resolves to a file, a run or a deployment you can open."
        icon={Link2}
      />
      <Stat
        value={String(summary.evidencedClaims)}
        label="Evidenced claims"
        detail="Each states what holds up and carries at least one pointer to back it."
        icon={FileCheck2}
      />
      <Stat
        value={String(summary.measuredMetrics)}
        label="Measured numbers"
        detail="Every metric states the method that produced it. No number appears unmeasured."
        icon={FlaskConical}
      />
      <Stat
        value={String(summary.statedLimitations)}
        label="Stated limitations"
        detail="What each project cannot yet claim, said out loud rather than buried."
        icon={ListChecks}
      />
      <Stat
        value={`${summary.ciGreen}/${summary.ciTracked}`}
        label="Projects green on CI"
        detail={ciDetail}
        icon={ShieldCheck}
      />
      <Stat
        value={`${summary.recentlyVerified}/${summary.projects}`}
        label="Claims checked recently"
        detail={`Re-checked against source within ${summary.freshWithinDays} days. Older ones say so on the case study.`}
        icon={Sparkles}
      />
    </div>
  );
}
