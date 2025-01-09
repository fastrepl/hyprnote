import { z } from "zod";
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import Nango from "@nangohq/frontend";

import { createNangoSession } from "../client";

const integrations = ["google-calendar", "outlook-calendar"] as const;

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

  if (isLoaded && !userId) {
    throw navigate({ to: "/auth/sign-in" });
  }

  useEffect(() => {
    (async () => {
      if (step !== "idle" || !userId || !provider) {
        return;
      }

      const res = await createNangoSession({
        end_user: { id: userId },
        allowed_integrations: integrations as unknown as string[],
      });

      if ("error" in res) {
        setStep("error");
        return;
      }

      // https://docs.nango.dev/guides/authorize-an-api-from-your-app-with-custom-ui
      new Nango({ connectSessionToken: res.data.token })
        .auth(provider)
        .then((_) => {
          setStep("success");
        })
        .catch((_) => {
          setStep("error");
        });
    })();
  }, [step, userId, provider]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      {step === "success" && <div>Success</div>}
      {step === "error" && <div>Error</div>}
    </div>
  );
}
