import {
  Beaker,
  CheckCircle2,
  FileText,
  FolderGit2,
  Globe,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import type { Claim, Evidence, LedgerClaim, Metric } from "@/data/registry/schema";
import { FreshnessChip, LedgerBadge } from "@/components/portfolio/EvidenceMeta";

const FRESH_KINDS = new Set(["screenshot", "video", "benchmark"]);

const REPO_BASE = "https://github.com/henrygoldsmith07-wq/Claude-Code";

const evidenceIcon = {
  repo: FolderGit2,
  ci: CheckCircle2,
  benchmark: Beaker,
  doc: FileText,
  screenshot: ImageIcon,
  video: Video,
  live: Globe,
} as const;

const evidenceNoun = {
  repo: "Source",
  ci: "CI",
  benchmark: "Benchmark",
  doc: "Docs",
  screenshot: "Screenshot",
  video: "Video",
  live: "Live",
} as const;

function evidenceHref(item: Evidence): string | undefined {
  if (item.href) return item.href;
  if (item.path) return `${REPO_BASE}/blob/main/${item.path}`;
  return item.src;
}

/** A single "go and check this yourself" pointer. */
export function EvidenceChip({ item }: { item: Evidence }) {
  const Icon = evidenceIcon[item.kind];
  const href = evidenceHref(item);
  const label = `${evidenceNoun[item.kind]}: ${item.label}`;

  if (!href) {
    return (
      <span className="evidence-chip" title={label}>
        <Icon className="size-3" aria-hidden="true" />
        {item.label}
      </span>
    );
  }

  return (
    <a
      className="evidence-chip evidence-chip-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
    >
      <Icon className="size-3" aria-hidden="true" />
      {item.label}
    </a>
  );
}

export function EvidenceRow({ items }: { items: Evidence[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.map((item, index) => (
        <EvidenceChip key={`${item.kind}-${item.label}-${index}`} item={item} />
      ))}
      {items.some((item) => FRESH_KINDS.has(item.kind) && item.capturedAt) && (
        <div className="flex w-full flex-wrap gap-1.5">
          {items
            .filter((item) => FRESH_KINDS.has(item.kind) && item.capturedAt)
            .map((item, index) => (
              <FreshnessChip key={index} item={item} />
            ))}
        </div>
      )}
    </div>
  );
}

/**
 * A claim is only ever rendered with its evidence attached. The registry
 * validator guarantees the array is non-empty, so there is no unevidenced path.
 * When the claim links into the ecosystem's evidence ledger, its grade, sample
 * size and last-validated date render straight from that ledger.
 */
export function ClaimItem({
  claim,
  ledgerClaim,
}: {
  claim: Claim;
  ledgerClaim?: LedgerClaim;
}) {
  return (
    <li className="claim-item">
      <p className="text-sm leading-6 text-foreground/85">{claim.statement}</p>
      <EvidenceRow items={claim.evidence} />
      {ledgerClaim && <LedgerBadge claim={ledgerClaim} />}
    </li>
  );
}

/**
 * A number, with how it was measured shown next to it rather than in a footnote.
 * `source: "ci"` means the figure was read from a workflow run at build time.
 */
export function MetricCard({ metric }: { metric: Metric }) {
  return (
    <div className="metric-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {metric.label}
        </p>
        {metric.source === "ci" && (
          <span className="metric-source" title="Read from a CI run at build time">
            from CI
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-[-0.04em]">{metric.value}</p>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        <span className="font-medium text-foreground/70">How this was measured: </span>
        {metric.method}
      </p>
      <EvidenceRow items={metric.evidence} />
    </div>
  );
}
