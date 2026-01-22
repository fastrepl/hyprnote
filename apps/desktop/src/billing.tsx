import { useQuery } from "@tanstack/react-query";
import { jwtDecode } from "jwt-decode";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from "react";

import { getRpcCanStartTrial } from "@hypr/api-client";
import { createClient } from "@hypr/api-client/client";
import { commands as openerCommands } from "@hypr/plugin-opener2";
import type { SubscriptionStatus } from "@hypr/supabase";

import { useAuth } from "./auth";
import { env } from "./env";
import { getScheme } from "./utils";

type JwtClaims = {
  entitlements?: string[];
  subscription_status?: SubscriptionStatus;
  trial_end?: number;
};

export function getEntitlementsFromToken(accessToken: string): string[] {
  try {
    const decoded = jwtDecode<JwtClaims>(accessToken);
    return decoded.entitlements ?? [];
  } catch {
    return [];
  }
}

export function getSubscriptionStatusFromToken(
  accessToken: string,
): SubscriptionStatus | undefined {
  try {
    const decoded = jwtDecode<JwtClaims>(accessToken);
    return decoded.subscription_status;
  } catch {
    return undefined;
  }
}

export function getTrialEndFromToken(accessToken: string): number | undefined {
  try {
    const decoded = jwtDecode<JwtClaims>(accessToken);
    return decoded.trial_end;
  } catch {
    return undefined;
  }
}

type BillingContextValue = {
  entitlements: string[];
  isPro: boolean;
  subscriptionStatus: SubscriptionStatus;
  isOnTrial: boolean;
  trialEnd: number | undefined;
  canStartTrial: boolean;
  upgradeToPro: () => void;
};

export type BillingAccess = BillingContextValue;

const BillingContext = createContext<BillingContextValue | null>(null);

export function BillingProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  const entitlements = useMemo(() => {
    if (!auth?.session?.access_token) {
      return [];
    }
    return getEntitlementsFromToken(auth.session.access_token);
  }, [auth?.session?.access_token]);

  const subscriptionStatus = useMemo<SubscriptionStatus>(() => {
    if (!auth?.session?.access_token) {
      return "none";
    }
    return getSubscriptionStatusFromToken(auth.session.access_token) ?? "none";
  }, [auth?.session?.access_token]);

  const trialEnd = useMemo(() => {
    if (!auth?.session?.access_token) {
      return undefined;
    }
    return getTrialEndFromToken(auth.session.access_token);
  }, [auth?.session?.access_token]);

  const isPro = useMemo(
    () => entitlements.includes("hyprnote_pro"),
    [entitlements],
  );

  const isOnTrial = useMemo(
    () => subscriptionStatus === "trialing",
    [subscriptionStatus],
  );

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
        return false;
      }
      return data?.canStartTrial ?? false;
    },
  });

  const canStartTrial = isPro ? false : (canTrialQuery.data ?? true);

  const upgradeToPro = useCallback(async () => {
    const scheme = await getScheme();
    void openerCommands.openUrl(
      `${env.VITE_APP_URL}/app/checkout?period=monthly&scheme=${scheme}`,
      null,
    );
  }, []);

  const value = useMemo<BillingContextValue>(
    () => ({
      entitlements,
      isPro,
      subscriptionStatus,
      isOnTrial,
      trialEnd,
      canStartTrial,
      upgradeToPro,
    }),
    [
      entitlements,
      isPro,
      subscriptionStatus,
      isOnTrial,
      trialEnd,
      canStartTrial,
      upgradeToPro,
    ],
  );

  return (
    <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
  );
}

export function useBillingAccess() {
  const context = useContext(BillingContext);

  if (!context) {
    throw new Error("useBillingAccess must be used within BillingProvider");
  }

  return context;
}
