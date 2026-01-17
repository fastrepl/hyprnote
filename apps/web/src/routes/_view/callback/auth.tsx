import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { cn } from "@hypr/utils";

import { exchangeOAuthCode, exchangeOtpToken } from "@/functions/auth";

const validateSearch = z.object({
  code: z.string().optional(),
  token_hash: z.string().optional(),
  type: z.literal("email").optional(),
  flow: z.enum(["desktop", "web"]).default("desktop"),
  scheme: z.string().default("hyprnote"),
  redirect: z.string().optional(),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
});

export const Route = createFileRoute("/_view/callback/auth")({
  validateSearch,
  component: Component,
  beforeLoad: async ({ search }) => {
    if (search.flow === "web" && search.code) {
      const result = await exchangeOAuthCode({ data: { code: search.code } });

      if (result.success) {
        throw redirect({ to: search.redirect || "/app/account/" });
      } else {
        console.error(result.error);
      }
    }

    if (search.flow === "desktop" && search.code) {
      const result = await exchangeOAuthCode({ data: { code: search.code } });

      if (result.success) {
        throw redirect({
          to: "/callback/auth/",
          search: {
            flow: "desktop",
            scheme: search.scheme,
            access_token: result.access_token,
            refresh_token: result.refresh_token,
          },
        });
      } else {
        console.error(result.error);
      }
    }

    if (search.token_hash && search.type) {
      const result = await exchangeOtpToken({
        data: {
          token_hash: search.token_hash,
          type: search.type,
        },
      });

      if (result.success) {
        if (search.flow === "web") {
          throw redirect({ to: search.redirect || "/app/account/" });
        }

        if (search.flow === "desktop") {
          throw redirect({
            to: "/callback/auth/",
            search: {
              flow: "desktop",
              scheme: search.scheme,
              access_token: result.access_token,
              refresh_token: result.refresh_token,
            },
          });
        }
      } else {
        console.error(result.error);
      }
    }
  },
});

function Component() {
  const search = Route.useSearch();
  const navigate = useNavigate();
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
      navigate({ to: search.redirect || "/app/account/" });
      return;
    }

    if (
      search.flow === "desktop" &&
      search.access_token &&
      search.refresh_token
    ) {
      setTimeout(() => {
        handleDeeplink();
      }, 200);
    }
  }, [search, navigate]);

  if (search.flow === "desktop") {
    return (
      <div className="min-h-screen bg-linear-to-b from-white via-stone-50/20 to-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-serif tracking-tight text-stone-600">
              Redirecting to Hyprnote
            </h1>
            <p className="text-neutral-600">
              Please allow the popup to open the app
            </p>
          </div>

          {attempted && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <div className="p-6 bg-stone-50 rounded-lg border border-stone-100">
                  <p className="text-sm text-stone-700 mb-3">
                    App didn't open?
                  </p>
                  <button
                    onClick={handleDeeplink}
                    className={cn([
                      "w-full h-10 flex items-center justify-center text-sm font-medium transition-all cursor-pointer",
                      "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
                    ])}
                  >
                    Try Again
                  </button>
                </div>

                <div className="p-6 bg-stone-50 rounded-lg border border-stone-100">
                  <p className="text-sm text-stone-700 mb-3">
                    Or copy the URL manually
                  </p>
                  <button
                    onClick={handleCopy}
                    className={cn([
                      "w-full h-10 flex items-center justify-center gap-2 text-sm font-medium transition-all cursor-pointer",
                      "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-xs hover:shadow-md hover:scale-[102%] active:scale-[98%]",
                    ])}
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
