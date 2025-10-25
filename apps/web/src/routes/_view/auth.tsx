import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { doAuth } from "@/functions/auth";

const validateSearch = z.object({
  flow: z.enum(["desktop", "web"]).default("web"),
});

export const Route = createFileRoute("/_view/auth")({
  validateSearch,
  component: Component,
});

function Component() {
  const { flow } = Route.useSearch();

  const handleSignInWithGithub = async () => {
    const res = await doAuth({
      data: {
        method: "oauth",
        provider: "github",
        flow,
      },
    });

    if (res && res.success && res.url) {
      window.location.href = res.url;
    }
  };

  return (
    <div>
      <button onClick={handleSignInWithGithub}>
        Sign in with Github ({flow})
      </button>
    </div>
  );
}
