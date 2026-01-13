import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { signOutFn } from "@/functions/auth";
import {
  canStartTrial,
  createPortalSession,
  createTrialCheckoutSession,
} from "@/functions/billing";
import { useBillingAccess } from "@/hooks/use-billing-access";

export const Route = createFileRoute("/_view/app/account")({
  component: Component,
  loader: async ({ context }) => ({
    user: context.user,
    billingAccess: context.billingAccess,
  }),
});

function Component() {
  const { user } = Route.useLoaderData();

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="max-w-6xl mx-auto border-x border-neutral-100">
        <div className="flex items-center justify-center py-20 bg-linear-to-b from-stone-50/30 to-stone-100/30 border-b border-neutral-100">
          <h1 className="font-serif text-3xl font-medium text-center">
            Welcome back {user?.email?.split("@")[0] || "Guest"}
          </h1>
        </div>

        <div className="mt-8 space-y-6 px-4 pb-20 max-w-4xl mx-auto">
          <section>
            <h2 className="text-lg font-medium mb-4 font-serif">
              Profile info
            </h2>
            <div className="space-y-2">
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

function getPlanDescription(
  isPro: boolean,
  isTrialing: boolean,
  trialDaysRemaining: number | null,
): string {
  if (!isPro) {
    return "Free";
  }
  if (isTrialing && trialDaysRemaining !== null) {
    if (trialDaysRemaining === 0) {
      return "Trial (ends today)";
    }
    if (trialDaysRemaining === 1) {
      return "Trial (ends tomorrow)";
    }
    return `Trial (${trialDaysRemaining} days left)`;
  }
  return "Pro";
}

function AccountSettingsCard() {
  const { isPro, isTrialing, trialDaysRemaining } = useBillingAccess();

  const canTrialQuery = useQuery({
    queryKey: ["canStartTrial"],
    queryFn: () => canStartTrial(),
    enabled: !isPro,
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
      const { url } = await createTrialCheckoutSession();
      if (url) {
        window.location.href = url;
      }
    },
  });

  const renderPlanButton = () => {
    if (canTrialQuery.isLoading) {
      return (
        <div className="px-4 h-8 flex items-center text-sm text-neutral-400">
          Loading...
        </div>
      );
    }

    if (!isPro) {
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
          to="/app/checkout"
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
        className="cursor-pointer px-4 h-8 flex items-center text-sm bg-linear-to-b from-white to-stone-50 border border-neutral-300 text-neutral-700 rounded-full shadow-sm hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all disabled:opacity-50 disabled:hover:scale-100"
      >
        {manageBillingMutation.isPending ? "Loading..." : "Manage Billing"}
      </button>
    );
  };

  return (
    <div className="border border-neutral-100 rounded-sm">
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
          Current plan:{" "}
          <span className="font-medium">
            {getPlanDescription(isPro, isTrialing, trialDaysRemaining)}
          </span>
        </div>
        {renderPlanButton()}
      </div>
    </div>
  );
}

function IntegrationsSettingsCard() {
  const connectedApps = 1;

  return (
    <div className="border border-neutral-100 rounded-sm">
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
          to="/app/integration"
          className="px-4 h-8 flex items-center text-sm bg-linear-to-b from-white to-stone-50 border border-neutral-300 text-neutral-700 rounded-full shadow-sm hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all"
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
