import { CalendarCheck, FlaskConical, GitCommitHorizontal, Lock, ShieldQuestion } from "lucide-react";
import type {
  Evidence,
  FactsSnapshot,
  LedgerClaim,
  SourceState,
} from "@/data/registry/schema";
import { sourceStateCopy } from "@/data/registry/schema";

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
 * The per-project verification strip: where the source sits right now, what is
 * actually deployed, when CI last went green against it, and when a human last
 * checked the claims. Every generated value on it comes from the registry;
 * none is hand-written.
 *
 * It is built to be read sceptically. A green date from months ago, a carried
 * forward fact the importer could not refresh, and a failing newest run are all
 * surfaced as themselves rather than smoothed over — a reader deciding whether to
 * trust a number needs to know how fresh the thing backing it is.
 */
export function SourceVerificationRow({
  status,
  statusReason,
  sha,
  shaUrl,
  checkedAt,
  ci,
  deploy,
  release,
  vulnerabilities,
  sourceAccess,
  claimsCheckedAt,
  claimsAgeDays,
  freshWithinDays = 180,
  deployAgeDays = null,
  deployWindowDays = 14,
}: {
  status: SourceState;
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
  deploy?: FactsSnapshot["deploy"];
  release?: FactsSnapshot["release"];
  vulnerabilities?: FactsSnapshot["vulnerabilities"];
  sourceAccess?: "public" | "private";
  /** Authored date a human last re-checked these claims. */
  claimsCheckedAt?: string;
  /** How old that check is, so a stale date can say so in words. */
  claimsAgeDays?: number | null;
  freshWithinDays?: number;
  /**
   * Age of the generated deployment snapshot. The facts layer is refreshed by a
   * token-authenticated probe and never hand-edited, so an old snapshot means
   * the URL has not been re-checked — and may already be gone.
   */
  deployAgeDays?: number | null;
  deployWindowDays?: number;
}) {
  const copy = sourceStateCopy[status];
  const deployedBehind = deploy?.upToDate === false;
  const newestRunRed = ci?.conclusion === "failure";
  const claimsStale =
    typeof claimsAgeDays === "number" && claimsAgeDays > freshWithinDays;
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
      {sourceAccess === "private" && (
        <div>
          <dt>Repo access</dt>
          <dd title="Links point at private repositories. Their existence was verified through the GitHub API at the date shown; sign in to GitHub to open them.">
            <Lock className="inline size-3" aria-hidden="true" /> private · API-verified
          </dd>
        </div>
      )}
      {deploy && (
        <div>
          <dt>Deployment</dt>
          <dd>
            {deploy.state === "none" ? (
              <span className="text-muted-foreground">not deployed</span>
            ) : (
              <>
                {deploy.state ?? "?"}
                {deploy.sha && (
                  <>
                    {" @ "}
                    {deploy.url ? (
                      <a href={deploy.url} target="_blank" rel="noopener noreferrer" className="inline-link">
                        {deploy.sha}
                      </a>
                    ) : (
                      deploy.sha
                    )}
                  </>
                )}
                {deployedBehind && (
                  <span
                    className="freshness-stale"
                    title={`Repository HEAD (${sha?.slice(0, 7)}) is ahead of the deployment`}
                  >
                    {" "}
                    · behind HEAD
                  </span>
                )}
                {deployAgeDays !== null && deployAgeDays > deployWindowDays && (
                  <span
                    className="freshness-stale"
                    title={`The last probe of this deployment was ${deployAgeDays} days ago, beyond the ${deployWindowDays}-day window. The recorded state has not been re-checked since, and the URL may no longer resolve.`}
                  >
                    {" "}
                    · unchecked for {deployAgeDays}d
                  </span>
                )}
              </>
            )}
          </dd>
        </div>
      )}
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
          {newestRunRed && (
            <span
              className="freshness-stale"
              title="The newest run for this project did not succeed. The green date above is the last run that passed, not the current state of main."
            >
              {" "}
              · newest run red
            </span>
          )}
        </dd>
      </div>
      {claimsCheckedAt && (
        <div>
          <dt>Claims checked</dt>
          <dd
            title={
              claimsStale
                ? `A human last re-checked these claims ${claimsAgeDays} days ago, beyond the ${freshWithinDays}-day window this site treats as current.`
                : "The date a human last re-checked the claims in this case study against the source."
            }
          >
            {formatDate(claimsCheckedAt)}
            {claimsStale && (
              <span className="freshness-stale">
                {" "}
                · {claimsAgeDays}d old
              </span>
            )}
          </dd>
        </div>
      )}
      {release && (
        <div>
          <dt>Release</dt>
          <dd>
            {release.url ? (
              <a href={release.url} target="_blank" rel="noopener noreferrer" className="inline-link">
                {release.tag}
              </a>
            ) : (
              release.tag
            )}
          </dd>
        </div>
      )}
      {vulnerabilities && (
        <div>
          <dt>Dependabot</dt>
          <dd title={vulnerabilities.unavailable}>
            {typeof vulnerabilities.open === "number"
              ? `${vulnerabilities.open} open`
              : "untracked"}
          </dd>
        </div>
      )}
      <div>
        <dt>Sources checked</dt>
        <dd>{formatDate(checkedAt) ?? "—"}</dd>
      </div>
    </dl>
  );
}
