import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { createCheckoutSession, createPortalSession } from "@/functions/billing";

export const Route = createFileRoute("/_view/app/account")({
  component: Component,
  loader: async ({ context }) => ({ user: context.user }),
});

function Component() {
  const [activeTab, setActiveTab] = useState<"overview" | "billing">("overview");

  return (
    <div className="flex gap-6 max-w-6xl mx-auto p-6 min-h-[calc(100vh-200px)]">
      <aside className="w-48">
        <nav className="flex flex-col gap-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`text-left px-3 py-2 rounded ${
              activeTab === "overview"
                ? "bg-neutral-100 font-medium"
                : "hover:bg-neutral-50"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`text-left px-3 py-2 rounded ${
              activeTab === "billing"
                ? "bg-neutral-100 font-medium"
                : "hover:bg-neutral-50"
            }`}
          >
            Plan & Billing
          </button>
        </nav>
      </aside>

      <main className="flex-1">
        {activeTab === "overview" && <Overview />}
        {activeTab === "billing" && <Billing />}
      </main>
    </div>
  );
}

function Overview() {
  const { user } = Route.useLoaderData();

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Overview</h1>
      <div className="space-y-4">
        <div>
          <div className="text-sm text-neutral-500">Email</div>
          <div className="text-base">{user?.email || "Not available"}</div>
        </div>
      </div>
    </div>
  );
}

function Billing() {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
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

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Plan & Billing</h1>
      <div className="flex gap-2">
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? "Loading..." : "Subscribe"}
        </button>
        <button
          onClick={handleManageBilling}
          disabled={loading}
          className="px-4 py-2 border border-neutral-300 rounded disabled:opacity-50"
        >
          {loading ? "Loading..." : "Manage Billing"}
        </button>
      </div>
    </div>
  );
}
