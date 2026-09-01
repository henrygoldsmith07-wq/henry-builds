import { Archive, BookOpen, FlaskConical, GitBranch } from "lucide-react";
import { sourceStateCopy, type SourceState } from "@/data/registry/schema";

const stateIcon: Record<SourceState, typeof GitBranch> = {
  "current-source": GitBranch,
  "archived-source": Archive,
  concept: FlaskConical,
  "historical-case-study": BookOpen,
};

const stateClass: Record<SourceState, string> = {
  "current-source": "source-current",
  "archived-source": "source-archived",
  concept: "source-concept",
  "historical-case-study": "source-historical",
};

/**
 * Stage says how far the work got; this badge says whether you can still go
 * and read it. Both travel with their meaning.
 */
export function SourceStateBadge({
  sourceState,
  withMeaning = false,
}: {
  sourceState?: SourceState;
  withMeaning?: boolean;
}) {
  if (!sourceState) return null;
  const copy = sourceStateCopy[sourceState];
  const Icon = stateIcon[sourceState];
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`stage-badge ${stateClass[sourceState]}`} title={copy.meaning}>
        <Icon className="size-3" aria-hidden="true" />
        {copy.label}
      </span>
      {withMeaning && <span className="text-xs text-muted-foreground">{copy.meaning}</span>}
    </span>
  );
}

/**
 * The freshness line shown on every project: when CI last verified the code,
 * and when the registry itself was imported. Missing dates are stated as
 * missing rather than hidden.
 */
export function VerificationLine({
  ci,
  importedAt,
}: {
  ci?: {
    workflow?: string;
    runUrl?: string;
    conclusion?: string;
    lastRunAt?: string;
    lastVerifiedAt?: string;
    carriedForward?: boolean;
  };
  importedAt?: string;
}) {
  if (!ci && !importedAt) return null;
  const verified = ci?.lastVerifiedAt ? new Date(ci.lastVerifiedAt).toISOString().slice(0, 10) : null;
  const ran = ci?.lastRunAt ? new Date(ci.lastRunAt).toISOString().slice(0, 10) : null;
  const imported = importedAt ? new Date(importedAt).toISOString().slice(0, 10) : null;

  return (
    <p className="text-xs leading-5 text-muted-foreground">
      {ci ? (
        <>
          Last code verification (green CI):{" "}
          {verified ? (
            <a
              className="underline underline-offset-2 hover:text-foreground"
              href={ci.runUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {verified}
            </a>
          ) : (
            <span>none recorded</span>
          )}
          {ran && ran !== verified && <> · newest run {ran} ({ci.conclusion})</>}
          {ci.carriedForward && <> · carried forward from an earlier import</>}
        </>
      ) : (
        <>No CI facts for this project yet.</>
      )}
      {imported && <> · registry imported {imported}</>}
    </p>
  );
}
