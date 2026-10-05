import { lazy, type ComponentType, type ReactNode } from "react";

/**
 * The Vly editor integration, behind a module boundary.
 *
 * `vite.config.ts` aliases this module to `vly-disabled.ts` unless
 * `VITE_VLY_APP_ID` is set. A `lazy(() => import("@vly-ai/integrations"))` written
 * inline in `main.tsx` still emits its chunk, because as far as the bundler is
 * concerned the dynamic import remains reachable through `lazy()` and the guard
 * is only known to be false at runtime — so `dist/` carried ~289 KB of toolbar
 * and ~73 KB of instrumentation that no visitor on the production domain could
 * execute. Aliasing removes the module from the graph instead.
 *
 * The same flag decides whether `vlyPlugin()` is registered in the Vite config,
 * so the toolbar can never appear without the editor that drives it.
 */
export const VlyToolbar: ComponentType | null = lazy(async () => {
  await import("@vly-ai/integrations");
  const module = await import("../../vly-toolbar-readonly.tsx");
  return { default: module.VlyToolbar };
});

export const VlyInstrumentation: ComponentType<{ children: ReactNode }> = lazy(
  async () => {
    const module = await import("@/instrumentation.tsx");
    return { default: module.InstrumentationProvider };
  },
);