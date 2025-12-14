import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import type { AuthCallbackSearch } from "@hypr/plugin-deeplink2";
import { Button } from "@hypr/ui/components/ui/button";

import { useAuth } from "../../auth";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search): AuthCallbackSearch => {
    return {
      access_token: (search as AuthCallbackSearch).access_token ?? "",
      refresh_token: (search as AuthCallbackSearch).refresh_token ?? "",
    };
  },
  component: AuthCallbackRoute,
});

function AuthCallbackRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const auth = useAuth();
  const handledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const { access_token, refresh_token } = search;

    if (access_token && refresh_token && auth) {
      auth.setSessionFromTokens(access_token, refresh_token).then((result) => {
        if (result.success) {
          navigate({ to: "/app/main" });
        } else {
          setError(result.error || "Authentication failed. Please try again.");
        }
      });
    } else {
      setError("Missing authentication tokens. Please try signing in again.");
    }
  }, [search, auth, navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-4">
        <div className="text-center space-y-2">
          <h1 className="text-lg font-medium text-red-600">
            Authentication Failed
          </h1>
          <p className="text-sm text-neutral-600 max-w-md">{error}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/app/onboarding" })}
          >
            Back to Sign In
          </Button>
          <Button onClick={() => navigate({ to: "/app/main" })}>
            Continue Without Account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-sm text-neutral-500">Authenticating...</p>
    </div>
  );
}
