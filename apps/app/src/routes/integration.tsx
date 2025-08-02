import { useAuth } from "@clerk/clerk-react";
import Nango, { ConnectUI } from "@nangohq/frontend";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

import { client, postApiWebIntegrationConnectionMutation } from "../client";
import type { NangoIntegration } from "../types";

const integrations: [NangoIntegration, NangoIntegration] = [
  "google-calendar",
  "outlook-calendar",
] as const;

const schema = z.object({
  provider: z.enum(integrations),
});

export const Route = createFileRoute("/integration")({
  component: Component,
  validateSearch: schema,
});

function Component() {
  const { provider } = Route.useSearch();
  const navigate = useNavigate();
  const { isLoaded, userId } = useAuth();
  const [step, setStep] = useState<"idle" | "success" | "error">("idle");
  const [modalOpened, setModalOpened] = useState(false);
  const [connect, setConnect] = useState<ConnectUI | null>(null);

  if (isLoaded && !userId) {
    // TODO
    throw navigate({ to: "/auth/sign-in", search: { c: provider, f: "web", p: 1 } });
  }

  const connectMutation = useMutation({
    ...postApiWebIntegrationConnectionMutation({ client }),
  });

  useEffect(() => {
    if (!userId) {
      return;
    }

    connectMutation.mutate({
      client,
      body: {
        allowed_integrations: [provider],
        end_user: { id: userId },
      },
    });
  }, [userId]);

  useEffect(() => {
    // https://docs.nango.dev/guides/api-authorization/authorize-in-your-app-default-ui
    const nango = new Nango();
    setModalOpened(true);
    const connect = nango.openConnectUI({
      onEvent: (event) => {
        if (event.type === "close") {
          setModalOpened(false);
        } else if (event.type === "connect") {
          setStep("success");
          connect.close();
        }
      },
    });

    setConnect(connect);
  }, []);

  useEffect(() => {
    if (
      connectMutation.status === "error"
      || (connectMutation.data && "error" in connectMutation.data)
    ) {
      setStep("error");
      return;
    }

    if (!connectMutation.data) {
      return;
    }

    const {
      data: { token: connectSessionToken },
    } = connectMutation.data;

    if (connectSessionToken && connect) {
      connect.setSessionToken(connectSessionToken);
    }
  }, [connectMutation.status]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      {step === "success" && <div>Success</div>}
      {step === "error" && <div>Error</div>}
      {!modalOpened && (
        <button
          onClick={() => {
            connect?.open();
            setModalOpened(true);
          }}
        >
          Modal
        </button>
      )}
    </div>
  );
}
