import { CalendarCheck, FlaskConical, GitCommitHorizontal, ShieldQuestion } from "lucide-react";
import type { Evidence, LedgerClaim, SourceStatus } from "@/data/registry/schema";
import { sourceStatusCopy } from "@/data/registry/schema";

const gradeClass: Record<string, string> = {
  "externally-validated": "grade-external",
  demonstrated: "grade-demonstrated",
  "partially-demonstrated": "grade-partial",
  "internally-benchmarked": "grade-internal",
  "infrastructure-only": "grade-infra",
  "insufficient-evidence": "grade-insufficient",
};

function formatDate(iso: string | undefined): string | undefined {
  return iso?.slice(0, 10);
}

/** Frozen once per page load; see FreshnessChip. */
const NOW = new Date();

/**
 * The grade, sample size and validation date travel with a claim straight from
 * the monorepo's evidence registry. This is the site's core honesty surface:
 * the reader should never have to wonder how well-established a claim is.
 */
export function LedgerBadge({ claim }: { claim: LedgerClaim }) {
  const grade = claim.status;
  const bits = [
    <span key="grade" className={`ledger-grade ${gradeClass[grade] ?? ""}`}>
      <ShieldQuestion className="size-3" aria-hidden="true" />
      {grade}
    </span>,
  ];

  if (typeof claim.sampleSize === "number" && claim.sampleSize > 0) {
    bits.push(
      <span key="sample" className="ledger-fact" title="Sample size behind the measurement">
        <FlaskConical className="size-3" aria-hidden="true" />
        n={claim.sampleSize}
      </span>,
    );
  }
  if (claim.lastUpdated) {
    bits.push(
      <span key="validated" className="ledger-fact" title="When this grading was last updated">
        <CalendarCheck className="size-3" aria-hidden="true" />
        graded {formatDate(claim.lastUpdated)}
      </span>,
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <span className="sr-only">Evidence grade: </span>
      {bits}
      {claim.limitations && (
        <p className="w-full text-xs leading-5 text-muted-foreground">
          <span className="font-medium text-foreground/70">Ledger limitation: </span>
          {claim.limitations}
        </p>
      )}
    </div>
  );
}

/** Capture freshness for evidence that rots: screenshots, videos, benchmarks. */
export function FreshnessChip({ item }: { item: Evidence }) {
  if (!item.capturedAt) return null;
  // Module-load time is stable for the lifetime of the page, which keeps the
  // render pure while still comparing real dates.
  const now = NOW.getTime();
  const ageDays = Math.floor((now - new Date(item.capturedAt).getTime()) / 86_400_000);
  const stale = item.expiresAt
    ? now > new Date(item.expiresAt).getTime()
    : ageDays > 90;
  return (
    <span
      className={`freshness-chip ${stale ? "freshness-stale" : ""}`}
      title={
        stale
          ? "This capture is past its shelf life — treat it as historical"
          : `Captured ${item.capturedAt}`
      }
    >
      captured {formatDate(item.capturedAt)}
      {stale ? " · stale" : ""}
    </span>
  );
}

/**
 * The per-project verification strip: where the source sits right now, when CI
 * last went green against it, and when a human last checked the claims.
 * Every date on here is generated; none is hand-written.
 */
export function SourceVerificationRow({
  status,
  statusReason,
  sha,
  shaUrl,
  checkedAt,
  ci,
}: {
  status: SourceStatus;
  statusReason?: string;
  sha?: string;
  shaUrl?: string;
  checkedAt?: string;
  ci?:
    | {
        conclusion?: string;
        lastSuccessAt?: string;
        greenRunUrl?: string;
        completedAt?: string;
        runUrl?: string;
      }
    | undefined;
}) {
  const copy = sourceStatusCopy[status];
  return (
    <dl className="verification-row" aria-label="Source verification state">
      <div>
        <dt>Source</dt>
        <dd title={statusReason ?? copy.meaning}>
          {copy.label.toLowerCase()}
          {sha && (
            <>
              {" @ "}
              {shaUrl ? (
                <a href={shaUrl} target="_blank" rel="noopener noreferrer" className="inline-link">
                  <GitCommitHorizontal className="inline size-3" aria-hidden="true" />
                  {sha.slice(0, 7)}
                </a>
              ) : (
                sha.slice(0, 7)
              )}
            </>
          )}
        </dd>
      </div>
      <div>
        <dt>Last green CI</dt>
        <dd>
          {ci?.lastSuccessAt ? (
            ci.greenRunUrl ? (
              <a href={ci.greenRunUrl} target="_blank" rel="noopener noreferrer" className="inline-link">
                {formatDate(ci.lastSuccessAt)}
              </a>
            ) : (
              formatDate(ci.lastSuccessAt)
            )
          ) : ci ? (
            <span className="text-muted-foreground">no passing run</span>
          ) : (
            <span className="text-muted-foreground">not tracked</span>
          )}
        </dd>
      </div>
      <div>
        <dt>Sources checked</dt>
        <dd>{formatDate(checkedAt) ?? "—"}</dd>
      </div>
    </dl>
  );
}
