import type { ComponentType, ReactNode } from "react";

/**
 * The stub aliased in for `@/lib/vly-optional` when `VITE_VLY_APP_ID` is unset.
 *
 * Because it is aliased rather than conditionally imported, the editor's module
 * graph is absent from a normal production build: its chunks are never written
 * to `dist/` at all, instead of being emitted and left unreachable.
 *
 * `vlyParentOrigin` is not exported here — the parent-origin handshake is a
 * runtime check on `location.hostname`, and that logic lives with the rest of
 * the routing code where it stays readable.
 */
export const VlyToolbar: ComponentType | null = null;
export const VlyInstrumentation: ComponentType<{ children: ReactNode }> | null = null;