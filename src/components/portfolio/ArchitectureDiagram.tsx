import { Lock } from "lucide-react";
import { useContext } from "react";
import { EvidenceRow, EvidenceProjectContext } from "./Evidence";
import { repoTreeHrefFor, MONOREPO_BASE } from "@/data/registry";
import type { Architecture } from "@/data/registry/schema";

/**
 * Rendered as a semantic ordered list rather than an image: it stays readable
 * at any width, works in a screen reader, and needs no alt text that would
 * immediately go stale when a layer changes.
 *
 * A layer's `path` resolves against the repository that owns the project today
 * (see repoTreeHrefFor), not against a fixed monorepo the projects left behind.
 */
export function ArchitectureDiagram({ architecture }: { architecture: Architecture }) {
  const project = useContext(EvidenceProjectContext);
  const layerHref = (path: string) =>
    project ? repoTreeHrefFor(project, path) : `${MONOREPO_BASE}/tree/main/${path}`;

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
                {/* h3, not h4: this sits directly under the case study's <h2> section
                    heading, and an h4 skipped a level. */}
                <h3 className="text-sm font-semibold tracking-tight">{layer.name}</h3>
                {layer.path && (
                  <a
                    className="arch-path"
                    href={layerHref(layer.path)}
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
