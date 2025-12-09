import { createFileRoute, redirect } from "@tanstack/react-router";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { getSupabaseServerClient } from "@/functions/supabase";

const validateSearch = z.object({
  code: z.string().optional(),
  flow: z.enum(["desktop", "web"]).default("desktop"),
  scheme: z.string().default("hyprnote"),
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
      } else {
        console.error(error);
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
            scheme: search.scheme,
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          },
        });
      } else {
        console.error(error);
      }
    }
  },
});

function Component() {
  const search = Route.useSearch();
  const [attempted, setAttempted] = useState(false);
  const [copied, setCopied] = useState(false);

  const getDeeplink = () => {
    if (search.access_token && search.refresh_token) {
      const params = new URLSearchParams();
      params.set("access_token", search.access_token);
      params.set("refresh_token", search.refresh_token);
      return `${search.scheme}://auth/callback?${params.toString()}`;
    }
    return null;
  };

  const handleDeeplink = () => {
    const deeplink = getDeeplink();
    if (search.flow === "desktop" && deeplink) {
      window.location.href = deeplink;
      setAttempted(true);
    }
  };

  const handleCopy = async () => {
    const deeplink = getDeeplink();
    if (deeplink) {
      await navigator.clipboard.writeText(deeplink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
            <div className="pt-8 space-y-4">
              <h2 className="text-lg font-medium text-stone-700">
                Not redirected?
              </h2>

              <div className="space-y-3">
                <div className="flex flex-col gap-2 p-4 bg-stone-50 rounded-lg">
                  <p className="text-sm font-medium text-stone-700">
                    Not redirected to the app?
                  </p>
                  <button
                    onClick={handleDeeplink}
                    className="w-full px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-lg transition-colors font-medium text-sm"
                  >
                    Reopen
                  </button>
                </div>

                <div className="flex flex-col gap-2 p-4 bg-stone-50 rounded-lg">
                  <p className="text-sm font-medium text-stone-700">
                    Still having trouble?
                  </p>
                  <button
                    onClick={handleCopy}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm text-stone-600 border border-stone-300 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="size-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <CopyIcon className="size-4" />
                        Copy URL
                      </>
                    )}
                  </button>
                </div>
              </div>
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
