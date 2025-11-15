import { openUrl } from "@tauri-apps/plugin-opener";
import { Check, ExternalLinkIcon } from "lucide-react";
import { type ReactNode, useCallback } from "react";

import { Button } from "@hypr/ui/components/ui/button";

import { useAuth } from "../../auth";
import { type BillingAccess, useBillingAccess } from "../../billing";
import { env } from "../../env";

const WEB_APP_BASE_URL = env.VITE_APP_URL ?? "http://localhost:3000";

export function SettingsAccount() {
  const auth = useAuth();
  const billing = useBillingAccess();

  const isAuthenticated = !!auth?.session;

  const handleOpenAccount = useCallback(() => {
    openUrl(`${WEB_APP_BASE_URL}/app/account`);
  }, []);

  const handleUpgrade = useCallback(() => {
    openUrl(`${WEB_APP_BASE_URL}/app/checkout?period=monthly`);
  }, []);

  const handleSignIn = useCallback(() => {
    auth?.signIn();
  }, [auth]);

  if (!isAuthenticated) {
    return (
      <Container
        title="Sign in to manage your account"
        description="Sign in with your Hyprnote account to access billing and plan details."
        action={
          <Button onClick={handleSignIn}>
            <span>Sign in</span>
          </Button>
        }
      >
        <p className="text-sm text-neutral-600">
          The desktop app links directly to your web account for settings and
          billing changes.
        </p>
      </Container>
    );
  }

  const hasStripeCustomer = !!billing.data?.stripe_customer;
  const userEmail = auth?.session?.user?.email;
  const userId = auth?.session?.user?.id;

  return (
    <div className="flex flex-col gap-4">
      <Container
        title="Your Account"
        description="Redirect to the web app to manage your account."
        action={
          <Button variant="outline" onClick={handleOpenAccount}>
            <span>Open</span>
            <ExternalLinkIcon className="text-neutral-600" />
          </Button>
        }
      >
        <AccountDetails email={userEmail} userId={userId} />
      </Container>

      <Container
        title="Plan & Billing"
        description="View your current plan and manage billing on the web."
        action={
          hasStripeCustomer ? (
            <Button variant="outline" onClick={handleOpenAccount}>
              <span>Open</span>
              <ExternalLinkIcon className="text-neutral-600" />
            </Button>
          ) : undefined
        }
      >
        <SettingsBilling
          billing={billing}
          onManage={handleOpenAccount}
          onUpgrade={handleUpgrade}
        />
      </Container>
    </div>
  );
}

function Container({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="bg-neutral-50 p-4 rounded-lg flex flex-col gap-4">
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-md font-semibold">{title}</h1>
          <p className="text-sm text-neutral-600">{description}</p>
        </div>
        {action ? <div className="flex-shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function AccountDetails({
  email,
  userId,
}: {
  email?: string | null;
  userId?: string | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs uppercase text-neutral-500">Email</p>
        <p className="text-sm text-neutral-900">
          {email ?? "Email unavailable"}
        </p>
      </div>

      {userId ? (
        <div>
          <p className="text-xs uppercase text-neutral-500">User ID</p>
          <p className="font-mono text-xs text-neutral-500 break-all">
            {userId}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SettingsBilling({
  billing,
  onManage,
  onUpgrade,
}: {
  billing: BillingAccess;
  onManage: () => void;
  onUpgrade: () => void;
}) {
  if (billing.isPending && !billing.data) {
    return (
      <div className="text-sm text-neutral-600">Loading billing details...</div>
    );
  }

  const billingData = billing.data;
  const planId: PlanId = billingData?.isPro ? "pro" : "free";
  const plan = PLANS[planId];
  const hasStripeCustomer = !!billingData?.stripe_customer;
  const subscriptionStatus = billingData?.stripe_subscription?.status;
  const showErrorBanner = billing.isError;
  const errorMessage =
    billing.error instanceof Error
      ? billing.error.message
      : "Unable to load billing details.";

  return (
    <div className="space-y-4">
      {showErrorBanner && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>{errorMessage}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => billing.refetch()}
            disabled={billing.isRefetching}
          >
            Retry
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <p className="text-xs uppercase text-neutral-500">Active plan</p>
          <p className="text-lg font-semibold text-neutral-900">{plan.name}</p>
          <p className="text-sm text-neutral-600">{plan.description}</p>
          {subscriptionStatus && planId === "pro" ? (
            <p className="text-xs text-neutral-500">
              Subscription status:{" "}
              {formatSubscriptionStatus(subscriptionStatus)}
            </p>
          ) : null}
        </div>

        <div className="sm:w-auto">
          <PlanActions
            planId={planId}
            hasStripeCustomer={hasStripeCustomer}
            onManage={onManage}
            onUpgrade={onUpgrade}
          />
        </div>
      </div>

      <ul className="space-y-2">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-sm text-neutral-700"
          >
            <Check size={16} className="mt-0.5 text-emerald-500 shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlanActions({
  planId,
  hasStripeCustomer,
  onManage,
  onUpgrade,
}: {
  planId: PlanId;
  hasStripeCustomer: boolean;
  onManage: () => void;
  onUpgrade: () => void;
}) {
  if (planId === "pro" && hasStripeCustomer) {
    return (
      <Button variant="outline" onClick={onManage} className="w-full sm:w-auto">
        Manage billing
      </Button>
    );
  }

  return (
    <Button onClick={onUpgrade} className="w-full sm:w-auto">
      Upgrade to Pro
    </Button>
  );
}

type PlanId = "free" | "pro";

interface BillingPlan {
  id: PlanId;
  name: string;
  description: string;
  features: string[];
}

const PLANS: Record<PlanId, BillingPlan> = {
  free: {
    id: "free",
    name: "Free",
    description: "Local transcription with manual exports.",
    features: ["Local transcription", "Copy and PDF export"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Cloud transcription, collaboration, and sharing features.",
    features: ["Cloud transcription", "Shareable links"],
  },
};

function formatSubscriptionStatus(status: string) {
  const normalized = status.replace(/_/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
