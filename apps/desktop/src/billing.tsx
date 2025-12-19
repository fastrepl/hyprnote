import { openUrl } from "@tauri-apps/plugin-opener";
import { jwtDecode } from "jwt-decode";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from "react";

import { useAuth } from "./auth";
import { env } from "./env";

type JwtClaims = {
  entitlements?: string[];
  subscription_status?: "trialing" | "active";
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

export function getSubscriptionInfoFromToken(accessToken: string): {
  status: "trialing" | "active" | null;
  trialEnd: number | null;
} {
  try {
    const decoded = jwtDecode<JwtClaims>(accessToken);
    return {
      status: decoded.subscription_status ?? null,
      trialEnd: decoded.trial_end ?? null,
    };
  } catch {
    return { status: null, trialEnd: null };
  }
}

type BillingContextValue = {
  entitlements: string[];
  isPro: boolean;
  isTrialing: boolean;
  trialDaysRemaining: number | null;
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

  const subscriptionInfo = useMemo(() => {
    if (!auth?.session?.access_token) {
      return { status: null, trialEnd: null };
    }
    return getSubscriptionInfoFromToken(auth.session.access_token);
  }, [auth?.session?.access_token]);

  const isPro = useMemo(
    () => entitlements.includes("hyprnote_pro"),
    [entitlements],
  );

  const isTrialing = useMemo(
    () => subscriptionInfo.status === "trialing",
    [subscriptionInfo.status],
  );

  const trialDaysRemaining = useMemo(() => {
    if (!subscriptionInfo.trialEnd) {
      return null;
    }
    const now = Math.floor(Date.now() / 1000);
    const secondsRemaining = subscriptionInfo.trialEnd - now;
    if (secondsRemaining <= 0) {
      return 0;
    }
    return Math.ceil(secondsRemaining / (24 * 60 * 60));
  }, [subscriptionInfo.trialEnd]);

  const upgradeToPro = useCallback(() => {
    void openUrl(`${env.VITE_APP_URL}/app/checkout?period=monthly`);
  }, []);

  const value = useMemo<BillingContextValue>(
    () => ({
      entitlements,
      isPro,
      isTrialing,
      trialDaysRemaining,
      upgradeToPro,
    }),
    [entitlements, isPro, isTrialing, trialDaysRemaining, upgradeToPro],
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
