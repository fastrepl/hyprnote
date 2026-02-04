import { useMutation, useQuery } from "@tanstack/react-query";
import { Brain, Cloud, ExternalLinkIcon, Puzzle, Sparkle } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";

import { getRpcCanStartTrial, postBillingStartTrial } from "@hypr/api-client";
import { createClient } from "@hypr/api-client/client";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as openerCommands } from "@hypr/plugin-opener2";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Spinner } from "@hypr/ui/components/ui/spinner";

import { useAuth } from "../../../auth";
import { type BillingAccess, useBillingAccess } from "../../../billing";
import { env } from "../../../env";
import * as settings from "../../../store/tinybase/store/settings";
import { useWelcomeProModal } from "../../billing/welcome-pro-modal";

function getPlanDescription(billing: BillingAccess): string {
  if (!billing.isPro) {
    return "Free";
  }
  if (billing.isTrialing && billing.trialDaysRemaining !== null) {
    if (billing.trialDaysRemaining === 0) {
      return "Pro Trial (ends today)";
    }
    if (billing.trialDaysRemaining === 1) {
      return "Pro Trial (ends tomorrow)";
    }
    return `Pro Trial (${billing.trialDaysRemaining} days left)`;
  }
  return "Pro";
}

const WEB_APP_BASE_URL = env.VITE_APP_URL ?? "http://localhost:3000";

export function AccountSettings() {
  const auth = useAuth();
  const billing = useBillingAccess();
  const store = settings.UI.useStore(settings.STORE_ID);

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
    void openerCommands.openUrl(`${WEB_APP_BASE_URL}/app/account`, null);
  }, []);

  const handleSignIn = useCallback(async () => {
    setIsPending(true);
    try {
      await auth?.signIn();
    } catch {
      setIsPending(false);
    }
  }, [auth]);

  const handleSignOut = useCallback(async () => {
    void analyticsCommands.event({
      event: "user_signed_out",
    });
    void analyticsCommands.setProperties({
      set: {
        is_signed_up: false,
      },
    });

    if (store) {
      const currentSttProvider = store.getValue("current_stt_provider");
      const currentSttModel = store.getValue("current_stt_model");
      const currentLlmProvider = store.getValue("current_llm_provider");

      if (currentSttProvider === "hyprnote" && currentSttModel === "cloud") {
        store.setValue("current_stt_model", "");
      }

      if (currentLlmProvider === "hyprnote") {
        store.setValue("current_llm_provider", "");
        store.setValue("current_llm_model", "");
      }
    }

    await auth?.signOut();
  }, [auth, store]);

  const handleRefreshPlan = useCallback(async () => {
    await auth?.refreshSession();
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
            placeholder="hyprnote://deeplink/auth?access_token=...&refresh_token=..."
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
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold font-serif">
              Waiting for sign-in...
            </h2>
            <p className="text-base text-neutral-500">
              Complete the sign-in process in your browser
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Button onClick={handleSignIn} variant="outline" className="w-full">
              Reopen sign-in page
            </Button>
            <Button
              onClick={() => setDevMode(true)}
              variant="ghost"
              className="w-full text-sm"
            >
              Having trouble? Paste callback URL manually
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold font-serif">
            Sign in to Hyprnote
          </h2>
          <p className="text-base text-neutral-500">
            Get started without an account. Sign in to unlock more.
          </p>
        </div>

        <button
          onClick={handleSignIn}
          className="px-6 h-[42px] rounded-full bg-linear-to-t from-stone-600 to-stone-500 text-white text-sm font-mono text-center transition-opacity duration-150 hover:opacity-90"
        >
          Get Started
        </button>

        <div className="flex gap-3 overflow-x-auto scrollbar-hide mt-4">
          {[
            { label: "Pro AI models", icon: Sparkle, comingSoon: false },
            { label: "Cloud sync", icon: Cloud, comingSoon: true },
            { label: "Memory", icon: Brain, comingSoon: true },
            { label: "Integrations", icon: Puzzle, comingSoon: true },
          ].map(({ label, icon: Icon, comingSoon }) => (
            <div
              key={label}
              className="relative overflow-hidden flex flex-col items-center justify-center gap-2 w-20 h-20 shrink-0 rounded-lg bg-linear-to-b from-white to-stone-50 border border-neutral-200 text-neutral-600"
            >
              {comingSoon && (
                <span className="absolute top-0 px-1.5 py-0.5 text-[10px] rounded-b bg-neutral-200 text-neutral-500 opacity-50">
                  Soon
                </span>
              )}
              <Icon className="h-5 w-5" />
              <span className="text-xs text-center leading-tight">{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Container
        title="Your Account"
        description="Redirect to the web app to manage your account."
        action={
          <div className="flex flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleOpenAccount}
              className="w-[100px] flex flex-row gap-1.5"
            >
              <span className="text-sm">Open</span>
              <ExternalLinkIcon className="text-neutral-600" size={12} />
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        }
      ></Container>

      <Container
        title="Plan & Billing"
        description={`Your current plan is ${getPlanDescription(billing)}.`}
        action={<BillingButton />}
      >
        <p className="text-sm text-neutral-600 flex items-center gap-1">
          {auth?.isRefreshingSession ? (
            <>
              <Spinner size={14} />
              <span>Refreshing plan status...</span>
            </>
          ) : (
            <>
              Click{" "}
              <span
                onClick={handleRefreshPlan}
                className="text-primary underline cursor-pointer"
              >
                here
              </span>
              <span className="text-neutral-600"> to refresh plan status.</span>
            </>
          )}
        </p>
      </Container>
    </div>
  );
}

function BillingButton() {
  const auth = useAuth();
  const { isPro } = useBillingAccess();
  const { open: openWelcomeProModal } = useWelcomeProModal();

  const canTrialQuery = useQuery({
    enabled: !!auth?.session && !isPro,
    queryKey: [auth?.session?.user.id ?? "", "canStartTrial"],
    queryFn: async () => {
      const headers = auth?.getHeaders();
      if (!headers) {
        return false;
      }
      const client = createClient({ baseUrl: env.VITE_API_URL, headers });
      const { data, error } = await getRpcCanStartTrial({ client });
      if (error) {
        throw error;
      }

      return data?.canStartTrial ?? false;
    },
  });

  const startTrialMutation = useMutation({
    mutationFn: async () => {
      const headers = auth?.getHeaders();
      if (!headers) {
        throw new Error("Not authenticated");
      }
      const client = createClient({ baseUrl: env.VITE_API_URL, headers });
      const { error } = await postBillingStartTrial({
        client,
        query: { interval: "monthly" },
      });
      if (error) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    },
    onSuccess: async () => {
      void analyticsCommands.event({
        event: "trial_started",
        plan: "pro",
      });
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14);
      void analyticsCommands.setProperties({
        email: auth?.session?.user.email,
        user_id: auth?.session?.user.id,
        set: {
          plan: "pro",
          trial_end_date: trialEndDate.toISOString(),
        },
      });
      await auth?.refreshSession();
      openWelcomeProModal();
    },
  });

  const handleProUpgrade = useCallback(() => {
    void analyticsCommands.event({
      event: "upgrade_clicked",
      plan: "pro",
    });
    void openerCommands.openUrl(
      `${WEB_APP_BASE_URL}/app/checkout?period=monthly`,
      null,
    );
  }, []);

  const handleOpenAccount = useCallback(() => {
    void openerCommands.openUrl(`${WEB_APP_BASE_URL}/app/account`, null);
  }, []);

  if (isPro) {
    return (
      <Button
        variant="outline"
        onClick={handleOpenAccount}
        className="w-[100px] flex flex-row gap-1.5"
      >
        <span className="text-sm">Manage</span>
        <ExternalLinkIcon className="text-neutral-600" size={12} />
      </Button>
    );
  }

  if (canTrialQuery.data) {
    return (
      <Button
        variant="outline"
        onClick={() => startTrialMutation.mutate()}
        disabled={startTrialMutation.isPending}
      >
        <span> Start Pro Trial</span>
      </Button>
    );
  }

  return (
    <Button variant="outline" onClick={handleProUpgrade}>
      <span>Upgrade to Pro</span>
      <ExternalLinkIcon className="text-neutral-600" size={12} />
    </Button>
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
      <div className="flex flex-col gap-2">
        <h1 className="text-md font-semibold font-serif">{title}</h1>
        {description && (
          <p className="text-sm text-neutral-600">{description}</p>
        )}
      </div>
      {action ? <div>{action}</div> : null}
      {children}
    </section>
  );
}
