import { getSupabaseServerClient } from "@/functions/supabase";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

const validateSearch = z.object({
  code: z.string().optional(),
  flow: z.enum(["desktop", "web"]).default("desktop"),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
});

export const Route = createFileRoute("/_view/callback/auth")({
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
      const { data, error } = await supabase.auth.exchangeCodeForSession(
        search.code,
      );

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
  const [attempted, setAttempted] = useState(false);

  const handleDeeplink = () => {
    if (
      search.flow === "desktop" &&
      search.access_token &&
      search.refresh_token
    ) {
      const params = new URLSearchParams();
      params.set("access_token", search.access_token);
      params.set("refresh_token", search.refresh_token);
      const deeplink = "hypr://auth/callback?" + params.toString();
      window.location.href = deeplink;
      setAttempted(true);
    }
  };

  useEffect(() => {
    if (search.flow === "web") {
      throw redirect({ to: "/app" });
    }

    if (
      search.flow === "desktop" &&
      search.access_token &&
      search.refresh_token
    ) {
      setTimeout(() => {
        handleDeeplink();
      }, 2000);
    }
  }, [search]);

  if (search.flow === "desktop") {
    return (
      <div className="min-h-screen bg-linear-to-b from-white via-stone-50/20 to-white flex items-start justify-center pt-32">
        <div className="max-w-md mx-auto px-6 text-center space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-serif tracking-tight text-stone-600">
              Redirecting to Hyprnote app...
            </h1>
            <p className="text-neutral-600">
              Please allow the popup to open Hyprnote
            </p>
          </div>

          {attempted && (
            <div className="pt-8 space-y-2">
              <p className="text-sm text-neutral-600">Popup didn't appear?</p>
              <button
                onClick={handleDeeplink}
                className="px-6 py-3 bg-stone-600 hover:bg-stone-700 text-white rounded-lg transition-colors font-medium"
              >
                Click here to retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (search.flow === "web") {
    return <div>Redirecting...</div>;
  }
}
