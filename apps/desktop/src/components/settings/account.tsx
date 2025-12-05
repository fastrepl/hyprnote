import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLinkIcon } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import type Stripe from "stripe";

import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";

import { useAuth } from "../../auth";
import { useBillingAccess } from "../../billing";
import { env } from "../../env";

const WEB_APP_BASE_URL = env.VITE_APP_URL ?? "http://localhost:3000";

export function SettingsAccount() {
  const auth = useAuth();
  const billing = useBillingAccess();

  const isAuthenticated = !!auth?.session;
  const [isPending, setIsPending] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      setIsPending(false);
    }
  }, [isAuthenticated]);

  const handleOpenAccount = useCallback(() => {
    openUrl(`${WEB_APP_BASE_URL}/app/account`);
  }, []);

  const handleSignIn = useCallback(async () => {
    setIsPending(true);
    try {
      await auth?.signIn();
    } catch {
      setIsPending(false);
    }
  }, [auth]);

  if (!isAuthenticated) {
    if (isPending && devMode) {
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-sm font-medium">Manual callback</h2>
            <p className="text-xs text-neutral-500">
              Paste the callback URL from your browser
            </p>
          </div>
          <Input
            type="text"
            className="text-xs font-mono"
            placeholder="hyprnote://auth?access_token=...&refresh_token=..."
            value={callbackUrl}
            onChange={(e) => setCallbackUrl(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              onClick={() => auth?.handleAuthCallback(callbackUrl)}
              className="flex-1"
            >
              Submit
            </Button>
            <Button variant="outline" onClick={() => setDevMode(false)}>
              Back
            </Button>
          </div>
        </div>
      );
    }

    if (isPending) {
      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-sm font-medium">Waiting for sign-in...</h2>
            <p className="text-xs text-neutral-500">
              Complete the sign-in process in your browser
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={handleSignIn} variant="outline" className="w-full">
              Reopen sign-in page
            </Button>
            <Button
              onClick={() => setDevMode(true)}
              variant="ghost"
              className="w-full text-xs"
            >
              Having trouble? Paste callback URL manually
            </Button>
          </div>
        </div>
      );
    }

    return (
      <Container
        title="Sign in to Hyprnote"
        description="Hyprnote account is required to access pro plan."
        action={
          <Button onClick={handleSignIn}>
            <span>Get Started</span>
          </Button>
        }
      ></Container>
    );
  }

  const hasStripeCustomer = !!billing.data?.stripe_customer;

  return (
    <div className="flex flex-col gap-4">
      <Container
        title="Your Account"
        description="Redirect to the web app to manage your account."
        action={
          <Button
            variant="outline"
            onClick={handleOpenAccount}
            className="w-[100px] flex flex-row gap-1.5"
          >
            <span className="text-sm">Open</span>
            <ExternalLinkIcon className="text-neutral-600" />
          </Button>
        }
      ></Container>

      <Container
        title="Plan & Billing"
        description="View your current plan and manage billing on the web."
        action={
          hasStripeCustomer ? (
            <Button
              variant="outline"
              onClick={handleOpenAccount}
              className="w-[100px] flex flex-row gap-1.5"
            >
              <span className="text-sm">Manage</span>
              <ExternalLinkIcon className="text-neutral-600" size={12} />
            </Button>
          ) : undefined
        }
      >
        {billing.data?.stripe_subscription && (
          <SubscriptionDetails
            subscription={billing.data.stripe_subscription}
          />
        )}
      </Container>
    </div>
  );
}

function SubscriptionDetails({
  subscription,
}: {
  subscription: Stripe.Subscription;
}) {
  const {
    status,
    items: {
      data: [{ current_period_end, current_period_start }],
    },
  } = subscription;

  return (
    <div className="flex flex-row gap-1 text-xs text-neutral-600">
      <span className="capitalize">{status}:</span>
      <span>{new Date(current_period_start * 1000).toLocaleDateString()}</span>
      <span>~</span>
      <span>{new Date(current_period_end * 1000).toLocaleDateString()}</span>
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
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="bg-neutral-50 p-4 rounded-lg flex flex-col gap-4">
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-md font-semibold">{title}</h1>
          {description && (
            <p className="text-sm text-neutral-600">{description}</p>
          )}
        </div>
        {action ? <div className="flex-shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
