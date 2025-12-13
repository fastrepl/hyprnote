import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import type { AuthCallbackSearch } from "@hypr/plugin-deeplink2";

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

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const { access_token, refresh_token } = search;

    if (access_token && refresh_token && auth) {
      const params = new URLSearchParams();
      params.set("access_token", access_token);
      params.set("refresh_token", refresh_token);
      const url = `hyprnote://auth/callback?${params.toString()}`;
      auth.handleAuthCallback(url).finally(() => {
        navigate({ to: "/app/main" });
      });
    } else {
      navigate({ to: "/app/main" });
    }
  }, [search, auth, navigate]);

  return null;
}
