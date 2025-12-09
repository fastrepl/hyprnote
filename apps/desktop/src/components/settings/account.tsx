import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLinkIcon, RefreshCwIcon } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";

import { useAuth } from "../../auth";
import { useBillingAccess } from "../../billing";
import { env } from "../../env";

const WEB_APP_BASE_URL = env.VITE_APP_URL ?? "http://localhost:3000";

export function SettingsAccount() {
  const auth = useAuth();
  const { isPro } = useBillingAccess();

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

  const handleSignOut = useCallback(async () => {
    await auth?.signOut();
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
            placeholder="hyprnote://auth/callback?access_token=...&refresh_token=..."
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
              <ExternalLinkIcon className="text-neutral-600" />
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        }
      ></Container>

      <Container
        title="Plan & Billing"
        description="View your current plan and manage billing on the web."
        action={
          <Button
            variant="outline"
            onClick={handleOpenAccount}
            className="w-[100px] flex flex-row gap-1.5"
          >
            <span className="text-sm">Manage</span>
            <ExternalLinkIcon className="text-neutral-600" size={12} />
          </Button>
        }
      >
        <PlanStatus isPro={isPro} onRefresh={auth?.refreshSession} />
      </Container>
    </div>
  );
}

function PlanStatus({
  isPro,
  onRefresh,
}: {
  isPro: boolean;
  onRefresh?: () => Promise<void>;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) {
      return;
    }
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-row items-center justify-between">
      {isPro ? (
        <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
          PRO
        </span>
      ) : (
        <span className="px-2 py-0.5 text-xs font-medium bg-neutral-200 text-neutral-600 rounded">
          FREE
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleRefresh}
        disabled={isRefreshing}
        title="Refresh plan status"
      >
        <RefreshCwIcon
          className={[
            "h-4 w-4 text-neutral-500",
            isRefreshing ? "animate-spin" : "",
          ].join(" ")}
        />
      </Button>
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
