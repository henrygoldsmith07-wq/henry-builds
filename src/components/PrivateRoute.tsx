import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { RequireAuth } from "@/components/RequireAuth";
import { Toaster } from "@/components/ui/sonner";
import AuthPage from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

if (!convexUrl) {
  throw new Error("PrivateRoute loaded without VITE_CONVEX_URL");
}

const convex = new ConvexReactClient(convexUrl);

export default function PrivateRoute({
  page,
}: {
  page: "auth" | "dashboard";
}) {
  return (
    <ConvexAuthProvider client={convex}>
      {page === "auth" ? (
        <AuthPage redirectAfterAuth="/dashboard" />
      ) : (
        <RequireAuth>
          <Dashboard />
        </RequireAuth>
      )}
      <Toaster />
    </ConvexAuthProvider>
  );
}
