import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { getSupabaseServerClient } from "@/functions/supabase";
import { useEffect } from "react";

const validateSearch = z.object({
  code: z.string().optional(),
  flow: z.enum(["desktop", "web"]).default("desktop"),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
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

    if (search.flow === "desktop" && search.code) {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(search.code);

      if (!error && data.session) {
        throw redirect({
          to: "/callback/auth",
          search: {
            flow: "desktop",
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          },
        });
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

    if (search.flow === "desktop" && search.access_token && search.refresh_token) {
      const accessToken = search.access_token!;
      const refreshToken = search.refresh_token!;
      setTimeout(() => {
        const params = new URLSearchParams();
        params.set("access_token", accessToken);
        params.set("refresh_token", refreshToken);
        const deeplink = "hypr://auth/callback?" + params.toString();
        window.location.href = deeplink;
      }, 1500);
    }
  }, [search]);

  if (search.flow === "desktop") {
    return (
      <div>
        <p>Desktop</p>
        <p>Authenticating...</p>
      </div>
    );
  }

  if (search.flow === "web") {
    return <div>Redirecting...</div>;
  }
}
