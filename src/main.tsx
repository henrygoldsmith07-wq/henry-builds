import {
  Component,
  StrictMode,
  Suspense,
  lazy,
  useEffect,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import "./types/global.d.ts";

const Landing = lazy(() => import("./pages/Landing.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Projects = lazy(() => import("./pages/Projects.tsx"));
const CaseStudy = lazy(() => import("./pages/CaseStudy.tsx"));

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const PrivateRoute = convexUrl
  ? lazy(() => import("@/components/PrivateRoute"))
  : null;

const isVlyDeployment =
  typeof window !== "undefined" &&
  window.location.hostname.endsWith(".vly.sh");

const VlyToolbar = isVlyDeployment
  ? lazy(async () => {
      await import("@vly-ai/integrations");
      const module = await import("../vly-toolbar-readonly.tsx");
      return { default: module.VlyToolbar };
    })
  : null;

const vlyInstrumentationEnabled = Boolean(import.meta.env.VITE_VLY_APP_ID);
const VlyInstrumentation = vlyInstrumentationEnabled
  ? lazy(async () => {
      const module = await import("@/instrumentation.tsx");
      return { default: module.InstrumentationProvider };
    })
  : null;

function RouteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

function BackendNotConfigured() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">
          Sign-in is unavailable
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          This deployment has no backend configured, so accounts are switched
          off. Everything public still works.
        </p>
        <a href="/" className="inline-link mt-8">
          Back to the site
        </a>
      </div>
    </div>
  );
}

class PublicErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Portfolio render failed", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main
        id="main"
        className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground"
      >
        <div className="max-w-md text-center">
          <p className="eyebrow">Something went wrong</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            This page could not render.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Reload the page once. If the problem persists, return to the
            portfolio home page.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="button-primary"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
            <a href="/" className="button-secondary">
              Home
            </a>
          </div>
        </div>
      </main>
    );
  }
}

function OptionalVlyInstrumentation({ children }: { children: ReactNode }) {
  if (!VlyInstrumentation) return <>{children}</>;

  return (
    <Suspense fallback={null}>
      <VlyInstrumentation>{children}</VlyInstrumentation>
    </Suspense>
  );
}

/**
 * Restores scroll position across client-side navigations, and honours a hash
 * so links like /#about work from any page rather than only from the landing page.
 */
function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, left: 0 });
      return;
    }

    // A malformed percent escape can arrive through a pasted or external URL.
    // decodeURIComponent throws for those values, so keep navigation resilient
    // and treat the raw fragment as a non-matching target instead of crashing.
    let targetId: string;
    try {
      targetId = decodeURIComponent(location.hash.slice(1));
    } catch {
      targetId = location.hash.slice(1);
    }
    const scrollToTarget = () => {
      const target = document.getElementById(targetId);
      if (!target) return false;

      // The site header is fixed. Give fragment targets enough scroll margin
      // to remain visible below it instead of hiding their first line behind
      // the navigation after scrollIntoView aligns them with the viewport top.
      const header = document.querySelector<HTMLElement>(".site-nav");
      const headerHeight = header?.getBoundingClientRect().height ?? 0;
      target.style.scrollMarginTop = `${headerHeight + 16}px`;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
      return true;
    };

    // Route components are lazy-loaded. On a cross-page hash navigation the
    // destination section may not exist on the first effect, so wait for the
    // Suspense boundary to mount it instead of silently falling back to the top.
    if (scrollToTarget()) return;

    const observer = new MutationObserver(() => {
      if (scrollToTarget()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [location.pathname, location.hash]);

  return null;
}

/** Vly iframe navigation bridge. Never mounted on the public portfolio. */
function RouteSyncer() {
  const location = useLocation();

  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Only the embedding parent is allowed to drive browser history. Without
      // this guard, any window holding a reference to the preview could send a
      // forged navigation message because postMessage events are cross-origin.
      if (event.source !== window.parent) return;

      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      {isVlyDeployment && <RouteSyncer />}
      <ScrollManager />
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:slug" element={<CaseStudy />} />
          <Route
            path="/auth"
            element={
              PrivateRoute ? (
                <PrivateRoute page="auth" />
              ) : (
                <BackendNotConfigured />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              PrivateRoute ? (
                <PrivateRoute page="dashboard" />
              ) : (
                <BackendNotConfigured />
              )
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {VlyToolbar && (
      <Suspense fallback={null}>
        <VlyToolbar />
      </Suspense>
    )}
    <OptionalVlyInstrumentation>
      <PublicErrorBoundary>
        <AppRoutes />
      </PublicErrorBoundary>
    </OptionalVlyInstrumentation>
  </StrictMode>,
);
