import { createFileRoute, Outlet, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";

import { events as deeplink2Events } from "@hypr/plugin-deeplink2";

import { useAuth } from "../../../auth";

export const Route = createFileRoute("/app/onboarding/_layout")({
  component: Component,
});

function Component() {
  useDeeplinkHandler();

  return <Outlet />;
}

function useDeeplinkHandler() {
  const auth = useAuth();
  const search = useSearch({ from: "/app/onboarding/_layout/" });

  useEffect(() => {
    const unlisten = deeplink2Events.deepLinkEvent.listen(
      async ({ payload }) => {
        if (payload.to !== "/auth/callback") return;

        const { access_token, refresh_token } = payload.search;
        if (access_token && refresh_token && auth) {
          await auth.setSessionFromTokens(access_token, refresh_token);
        }
      },
    );

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [auth, search]);
}
