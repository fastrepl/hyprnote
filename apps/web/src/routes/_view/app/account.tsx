import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";

import { signOutFn } from "@/functions/auth";
import {
  canStartTrial,
  createPortalSession,
  createTrialCheckoutSession,
  syncAfterSuccess,
} from "@/functions/billing";

const VALID_SCHEMES = [
  "hyprnote",
  "hyprnote-nightly",
  "hyprnote-staging",
  "hypr",
] as const;

const validateSearch = z.object({
  success: z.enum(["true"]).optional(),
  trial: z.enum(["started"]).optional(),
  scheme: z.enum(VALID_SCHEMES).optional(),
});

export const Route = createFileRoute("/_view/app/account")({
  validateSearch,
  component: Component,
  loader: async ({ context }) => ({ user: context.user }),
});

function Component() {
  const { user } = Route.useLoaderData();
  const search = Route.useSearch();

  useEffect(() => {
    if (
      (search.success === "true" || search.trial === "started") &&
      search.scheme
    ) {
      window.location.href = `${search.scheme}://billing/refresh`;
    }
  }, [search.success, search.trial, search.scheme]);

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="max-w-6xl mx-auto border-x border-neutral-100">
        <div className="flex items-center justify-center py-20 bg-linear-to-b from-stone-50/30 to-stone-100/30 border-b border-neutral-100">
          <h1 className="font-serif text-3xl font-medium text-center">
            Welcome back {user?.email?.split("@")[0] || "Guest"}
          </h1>
        </div>

        <div className="mt-8 flex flex-col gap-6 px-4 pb-20 max-w-4xl mx-auto">
          <section>
            <h2 className="text-lg font-medium mb-4 font-serif">
              Profile info
            </h2>
            <div className="flex flex-col gap-2">
              <div>
                <div className="text-sm text-neutral-500">Email</div>
                <div className="text-base">
                  {user?.email || "Not available"}
                </div>
              </div>
            </div>
          </section>

          <AccountSettingsCard />

          <IntegrationsSettingsCard />

          <SignOutSection />
        </div>
      </div>
    </div>
  );
}

function AccountSettingsCard() {
  const billingQuery = useQuery({
    queryKey: ["billing"],
    queryFn: () => syncAfterSuccess(),
  });

  const canTrialQuery = useQuery({
    queryKey: ["canStartTrial"],
    queryFn: () => canStartTrial(),
  });

  const manageBillingMutation = useMutation({
    mutationFn: async () => {
      const { url } = await createPortalSession();
      if (url) {
        window.location.href = url;
      }
    },
  });

  const startTrialMutation = useMutation({
    mutationFn: async () => {
      const { url } = await createTrialCheckoutSession({ data: {} });
      if (url) {
        window.location.href = url;
      }
    },
  });

  const currentPlan = (() => {
    if (!billingQuery.data || billingQuery.data.status === "none") {
      return "free";
    }
    const status = billingQuery.data.status;
    if (status === "trialing") return "trial";
    if (status === "active") return "pro";
    return "free";
  })();

  const renderPlanButton = () => {
    if (billingQuery.isLoading || canTrialQuery.isLoading) {
      return (
        <div className="px-4 h-8 flex items-center text-sm text-neutral-400">
          Loading...
        </div>
      );
    }

    if (currentPlan === "free") {
      if (canTrialQuery.data) {
        return (
          <button
            onClick={() => startTrialMutation.mutate()}
            disabled={startTrialMutation.isPending}
            className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            {startTrialMutation.isPending ? "Loading..." : "Start Free Trial"}
          </button>
        );
      }

      return (
        <Link
          to="/app/checkout/"
          search={{ period: "monthly" }}
          className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
        >
          Upgrade to Pro
        </Link>
      );
    }

    return (
      <button
        onClick={() => manageBillingMutation.mutate()}
        disabled={manageBillingMutation.isPending}
        className="cursor-pointer px-4 h-8 flex items-center text-sm bg-linear-to-b from-white to-stone-50 border border-neutral-300 text-neutral-700 rounded-full shadow-xs hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all disabled:opacity-50 disabled:hover:scale-100"
      >
        {manageBillingMutation.isPending ? "Loading..." : "Manage Billing"}
      </button>
    );
  };

  const getPlanDisplay = () => {
    if (billingQuery.isLoading) return "...";
    if (currentPlan === "trial") return "Trial";
    if (currentPlan === "pro") return "Pro";
    return "Free";
  };

  return (
    <div className="border border-neutral-100 rounded-xs">
      <div className="p-4">
        <h3 className="font-serif text-lg font-semibold mb-2">
          Account Settings
        </h3>
        <p className="text-sm text-neutral-600">
          Manage your account preferences and billing settings
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-neutral-100 p-4">
        <div className="text-sm">
          Current plan: <span className="font-medium">{getPlanDisplay()}</span>
        </div>
        {renderPlanButton()}
      </div>
    </div>
  );
}

function IntegrationsSettingsCard() {
  const connectedApps = 1;

  return (
    <div className="border border-neutral-100 rounded-xs">
      <div className="p-4">
        <h3 className="font-serif text-lg font-semibold mb-2">
          Integrations Settings
        </h3>
        <p className="text-sm text-neutral-600">
          Save your time by streamlining your work related to meetings
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-neutral-100 p-4">
        <div className="text-sm">
          {connectedApps} {connectedApps === 1 ? "app is" : "apps are"}{" "}
          connected to Hyprnote
        </div>
        <Link
          to="/app/integration/"
          className="px-4 h-8 flex items-center text-sm bg-linear-to-b from-white to-stone-50 border border-neutral-300 text-neutral-700 rounded-full shadow-xs hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all"
        >
          See all
        </Link>
      </div>
    </div>
  );
}

function SignOutSection() {
  const navigate = useNavigate();

  const signOut = useMutation({
    mutationFn: async () => {
      const res = await signOutFn();
      if (res.success) {
        return true;
      }

      throw new Error(res.message);
    },
    onSuccess: () => {
      navigate({ to: "/" });
    },
    onError: (error) => {
      console.error(error);
      navigate({ to: "/" });
    },
  });

  return (
    <section className="pt-6">
      <button
        onClick={() => signOut.mutate()}
        disabled={signOut.isPending}
        className="cursor-pointer px-4 h-8 flex items-center text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-full transition-all disabled:opacity-50 disabled:hover:border-red-200"
      >
        {signOut.isPending ? "Signing out..." : "Sign out"}
      </button>
    </section>
  );
}
