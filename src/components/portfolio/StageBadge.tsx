import { stageCopy, type Stage } from "@/data/registry/schema";

const stageClass: Record<Stage, string> = {
  shipped: "stage-shipped",
  beta: "stage-beta",
  prototype: "stage-prototype",
  research: "stage-research",
  archived: "stage-archived",
};

/**
 * The badge is the site's main honesty surface, so the meaning of each label
 * travels with it rather than living in a legend somewhere else.
 */
export function StageBadge({ stage, withMeaning = false }: { stage: Stage; withMeaning?: boolean }) {
  const copy = stageCopy[stage];
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`stage-badge ${stageClass[stage]}`} title={copy.meaning}>
        {copy.label}
      </span>
      {withMeaning && (
        <span className="text-xs text-muted-foreground">{copy.meaning}</span>
      )}
    </span>
  );
}

/** The full taxonomy, shown once on the archive page so the labels are legible. */
export function StageLegend() {
  return (
    <dl className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
      {(Object.keys(stageCopy) as Stage[]).map((stage) => (
        <div key={stage} className="bg-background p-5">
          <dt>
            <StageBadge stage={stage} />
          </dt>
          <dd className="mt-3 text-xs leading-5 text-muted-foreground">
            {stageCopy[stage].meaning}
          </dd>
        </div>
      ))}
    </dl>
  );
}
