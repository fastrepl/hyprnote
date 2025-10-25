import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { getSupabaseServerClient } from "@/functions/supabase";
import { useEffect } from "react";

const validateSearch = z.object({
  code: z.string().optional(),
  flow: z.enum(["desktop", "web"]).default("desktop"),
});

export const Route = createFileRoute("/callback/auth")({
  validateSearch,
  component: Component,
  beforeLoad: async ({ search }) => {
    if (search.flow === "web" && search.code) {
      const supabase = getSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(search.code);

      if (!error) {
        throw redirect({ to: "/app" });
      }
    }
  },
});

function Component() {
  const search = Route.useSearch();

  useEffect(() => {
    if (search.flow === "web") {
      throw redirect({ to: "/app" });
    }

    if (search.flow === "desktop") {
      setTimeout(() => {
        const params = new URLSearchParams(search as Record<string, string>);
        const deeplink = "hypr://auth/callback?" + params.toString();
        window.location.href = deeplink;
      }, 1500);
    }
  }, [search]);

  if (search.flow === "desktop") {
    return (
      <div>
        <p>Desktop</p>
        <p>Code: {search.code}</p>
        <p>Flow: {search.flow}</p>
      </div>
    );
  }

  if (search.flow === "web") {
    return <div>Redirecting...</div>;
  }
}
