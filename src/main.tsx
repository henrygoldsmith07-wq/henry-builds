import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, useEffect, lazy, Suspense } from "react";
import Landing from "./pages/Landing.tsx";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import "./types/global.d.ts";

// Lazy load route components for better code splitting
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Projects = lazy(() => import("./pages/Projects.tsx"));
const CaseStudy = lazy(() => import("./pages/CaseStudy.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/**
 * The public portfolio — landing, archive and case studies — needs no backend.
 * Only /auth and /dashboard do.
 *
 * Constructing ConvexReactClient with no address throws during module
 * evaluation, which took down the whole site (blank page, no error shown) if
 * the environment variable was ever missing. Public content must not depend on
 * a backend it never calls, so the client is only built when an address exists
 * and the authenticated routes are gated behind it.
 */
const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

function BackendNotConfigured() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">Sign-in is unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          This deployment has no backend configured, so accounts are switched off. Everything
          public still works.
        </p>
        <a href="/" className="inline-link mt-8">
          Back to the site
        </a>
      </div>
    </div>
  );
}

/** Wraps children in the Convex providers only when there is a backend to talk to. */
function AppProviders({ children }: { children: React.ReactNode }) {
  if (!convex) return <>{children}</>;
  return (
    <ConvexAuthProvider client={convex}>
      {children}
      <Toaster />
    </ConvexAuthProvider>
  );
}



/**
 * Restores scroll position across client-side navigations, and honours a hash
 * so links like /#about work from any page rather than only from the landing page.
 */
function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0 });
  }, [location.pathname, location.hash]);

  return null;
}

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


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VlyToolbar />
    <InstrumentationProvider>
      <AppProviders>
        <BrowserRouter>
          <RouteSyncer />
          <ScrollManager />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:slug" element={<CaseStudy />} />
              <Route
                path="/auth"
                element={
                  convex ? <AuthPage redirectAfterAuth="/dashboard" /> : <BackendNotConfigured />
                }
              />
              <Route
                path="/dashboard"
                element={
                  convex ? (
                    <RequireAuth>
                      <Dashboard />
                    </RequireAuth>
                  ) : (
                    <BackendNotConfigured />
                  )
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AppProviders>
    </InstrumentationProvider>
  </StrictMode>,
);
