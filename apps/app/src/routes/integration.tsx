import { z } from "zod";
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import Nango from "@nangohq/frontend";
import { useMutation } from "@tanstack/react-query";

import { client, postApiWebIntegrationConnectionMutation } from "../client";
import type { NangoIntegration } from "../types";

const integrations: NangoIntegration[] = [
  "google-calendar",
  "outlook-calendar",
] as const;

const schema = z.object({
  provider: z.enum(integrations as unknown as [string, ...string[]]),
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

  if (isLoaded && !userId) {
    throw navigate({ to: "/auth/sign-in" });
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
        allowed_integrations: integrations,
        end_user: { id: userId },
      },
    });
  }, [userId]);

  useEffect(() => {
    if (
      connectMutation.status === "error" ||
      (connectMutation.data && "error" in connectMutation.data)
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

    // https://docs.nango.dev/guides/authorize-an-api-from-your-app-with-custom-ui
    new Nango({ connectSessionToken })
      .auth(provider)
      .then((_) => {
        setStep("success");
      })
      .catch((_) => {
        setStep("error");
      });
  }, [connectMutation.status]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      {step === "success" && <div>Success</div>}
      {step === "error" && <div>Error</div>}
    </div>
  );
}
