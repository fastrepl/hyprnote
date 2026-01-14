import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { GithubIcon } from "lucide-react";
import { z } from "zod";

import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/utils";

import { fetchAdminUser } from "@/functions/admin";
import { doAuth } from "@/functions/auth";

const validateSearch = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/admin/login/")({
  validateSearch,
  head: () => ({
    meta: [
      { title: "Login - Content Admin - Hyprnote" },
      {
        name: "description",
        content: "Sign in to manage content for Hyprnote.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async ({ search }) => {
    if (import.meta.env.DEV) {
      throw redirect({
        to: search.redirect || "/admin/collections/",
      });
    }

    const user = await fetchAdminUser();

    if (user?.isAdmin) {
      throw redirect({
        to: search.redirect || "/admin/collections/",
      });
    }

    return { redirectTo: search.redirect };
  },
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const { redirectTo } = Route.useRouteContext();

  const authMutation = useMutation({
    mutationFn: async () => {
      const result = await doAuth({
        data: {
          provider: "github",
          flow: "web",
          redirect: redirectTo || "/admin/collections/",
        },
      });

      if (result.error) {
        throw new Error(result.message);
      }

      return result;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const handleGitHubLogin = () => {
    authMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-white via-stone-50/20 to-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-serif tracking-tight text-stone-600">
            Content Admin
          </h1>
          <p className="text-neutral-600">
            Sign in with GitHub to manage content
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGitHubLogin}
            disabled={authMutation.isPending}
            className={cn([
              "w-full h-12 flex items-center justify-center gap-3 text-sm font-medium transition-all cursor-pointer",
              "bg-neutral-900 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
            ])}
          >
            {authMutation.isPending ? (
              <Spinner size={20} color="white" />
            ) : (
              <>
                <GithubIcon className="size-5" />
                Continue with GitHub
              </>
            )}
          </button>

          {authMutation.error && (
            <p className="text-sm text-red-600">
              {authMutation.error.message || "Failed to sign in"}
            </p>
          )}
        </div>

        <p className="text-xs text-neutral-500">
          Only authorized team members can access the admin panel.
        </p>
      </div>
    </div>
  );
}
