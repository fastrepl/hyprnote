import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { signOutFn } from "@/functions/auth";
import { createCheckoutSession, createPortalSession } from "@/functions/billing";
import { useMutation } from "@tanstack/react-query";

export const Route = createFileRoute("/_view/app/account")({
  component: Component,
  loader: async ({ context }) => ({ user: context.user }),
});

function Component() {
  const { user } = Route.useLoaderData();

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="max-w-6xl mx-auto border-x border-neutral-100">
        <div className="flex items-center justify-center py-20 bg-linear-to-b from-stone-50/30 to-stone-100/30 border-b border-neutral-100">
          <h1 className="font-serif text-3xl font-medium text-center">Welcome back John</h1>
        </div>

        <div className="mt-8 space-y-6 px-4 pb-20 max-w-4xl mx-auto">
          {/* Profile Info Section */}
          <section>
            <h2 className="text-lg font-medium mb-4 font-serif">Profile info</h2>
            <div className="space-y-2">
              <div>
                <div className="text-sm text-neutral-500">Email</div>
                <div className="text-base">{user?.email || "Not available"}</div>
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
  const [loading, setLoading] = useState(false);
  const [currentPlan] = useState<"free" | "trial" | "trial_over" | "pro">("free");

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      // TODO: Implement trial start logic
      console.log("Starting trial...");
    } finally {
      setLoading(false);
    }
  };

  const handleStartProTrial = async () => {
    setLoading(true);
    try {
      // TODO: Implement pro trial start logic
      console.log("Starting pro trial...");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { url } = await createCheckoutSession();
      if (url) {
        window.location.href = url;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const { url } = await createPortalSession();
      if (url) {
        window.location.href = url;
      }
    } finally {
      setLoading(false);
    }
  };

  const renderPlanButton = () => {
    if (currentPlan === "free") {
      return (
        <button
          onClick={handleStartTrial}
          disabled={loading}
          className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? "Loading..." : "Start trial"}
        </button>
      );
    }

    if (currentPlan === "trial") {
      return (
        <button
          onClick={handleManageBilling}
          disabled={loading}
          className="px-4 h-8 flex items-center text-sm bg-linear-to-b from-white to-stone-50 border border-neutral-300 text-neutral-700 rounded-full shadow-sm hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? "Loading..." : "Manage Billing"}
        </button>
      );
    }

    if (currentPlan === "trial_over") {
      return (
        <div className="flex gap-2">
          <button
            onClick={handleStartProTrial}
            disabled={loading}
            className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? "Loading..." : "Start pro trial"}
          </button>
          <Link
            to="/pricing"
            className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
          >
            Upgrade
          </Link>
        </div>
      );
    }

    if (currentPlan === "pro") {
      return (
        <button
          onClick={handleManageBilling}
          disabled={loading}
          className="px-4 h-8 flex items-center text-sm bg-linear-to-b from-white to-stone-50 border border-neutral-300 text-neutral-700 rounded-full shadow-sm hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? "Loading..." : "Manage Billing"}
        </button>
      );
    }
  };

  const getPlanDisplay = () => {
    if (currentPlan === "free") {
      return "Free";
    }
    if (currentPlan === "trial") {
      return "Trial";
    }
    if (currentPlan === "trial_over") {
      return "Trial Ended";
    }
    if (currentPlan === "pro") {
      return "Pro";
    }
    return "Free";
  };

  return (
    <div className="border border-neutral-200 rounded-sm">
      <div className="p-4">
        <h3 className="font-serif text-lg font-semibold mb-2">Account Settings</h3>
        <p className="text-sm text-neutral-600">
          Manage your account preferences and billing settings
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-neutral-200 p-4">
        <div className="text-sm">
          Current plan: <span className="font-medium">{getPlanDisplay()}</span>
        </div>
        {renderPlanButton()}
      </div>
    </div>
  );
}

function IntegrationsSettingsCard() {
  const [connectedApps] = useState(0); // TODO: Get actual count from API

  return (
    <div className="border border-neutral-200 rounded-sm">
      <div className="p-4">
        <h3 className="font-serif text-lg font-semibold mb-2">Integrations Settings</h3>
        <p className="text-sm text-neutral-600">
          Save your time by streamlining your work related to meetings
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-neutral-200 p-4">
        <div className="text-sm">
          {connectedApps} {connectedApps === 1 ? "app is" : "apps are"} connected to Hyprnote
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
        className="px-4 h-8 flex items-center text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-full transition-all disabled:opacity-50 disabled:hover:border-red-200"
      >
        {signOut.isPending ? "Signing out..." : "Sign out"}
      </button>
    </section>
  );
}
