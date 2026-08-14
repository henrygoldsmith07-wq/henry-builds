import { Lock } from "lucide-react";
import { EvidenceRow } from "./Evidence";
import type { Architecture } from "@/data/registry/schema";

const REPO_BASE = "https://github.com/henrygoldsmith07-wq/Claude-Code";

/**
 * Rendered as a semantic ordered list rather than an image: it stays readable
 * at any width, works in a screen reader, and needs no alt text that would
 * immediately go stale when a layer changes.
 */
export function ArchitectureDiagram({ architecture }: { architecture: Architecture }) {
  return (
    <div>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
        {architecture.summary}
      </p>

      <ol className="arch-stack mt-8">
        {architecture.layers.map((layer, index) => (
          <li key={layer.name} className="arch-layer">
            <div className="arch-layer-index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h4 className="text-sm font-semibold tracking-tight">{layer.name}</h4>
                {layer.path && (
                  <a
                    className="arch-path"
                    href={`${REPO_BASE}/tree/main/${layer.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {layer.path}
                  </a>
                )}
              </div>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{layer.role}</p>
            </div>
          </li>
        ))}
      </ol>

      {architecture.invariant && (
        <div className="arch-invariant mt-6">
          <Lock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              The constraint this enforces
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground/85">{architecture.invariant}</p>
          </div>
        </div>
      )}

      <EvidenceRow items={architecture.evidence} />
    </div>
  );
}
