import { useCallback, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import Nango from "@nangohq/frontend";

import { createNangoSession } from "../client";

export const Route = createFileRoute("/integration")({
  component: Component,
});

const nango = new Nango();

function Component() {
  const navigate = useNavigate();
  const { isLoaded, userId } = useAuth();

  if (isLoaded && !userId) {
    throw navigate({ to: "/auth/sign-in" });
  }

  const start = useCallback(() => {
    if (!userId) {
      return;
    }

    const connect = nango.openConnectUI({
      onEvent: (event) => {
        if (event.type === "close") {
          // Handle modal closed.
        } else if (event.type === "connect") {
          // Handle auth flow successful.
        }
      },
    });

    createNangoSession({
      end_user: {
        id: userId,
      },
      allowed_integrations: ["google-calendar", "outlook-calendar"],
    }).then((res) => {
      if ("error" in res) {
        throw new Error(res.error.code);
      }
      connect.setSessionToken(res.data.token);
    });
  }, [userId]);

  return (
    <div>
      Hello "/integration"!
      <button onClick={start}>Connect</button>
    </div>
  );
}
