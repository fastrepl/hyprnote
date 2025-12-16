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

export function getEntitlementsFromToken(accessToken: string): string[] {
  try {
    const decoded = jwtDecode<{ entitlements?: string[] }>(accessToken);
    return decoded.entitlements ?? [];
  } catch {
    return [];
  }
}

type BillingContextValue = {
  entitlements: string[];
  isPro: boolean;
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

  const isPro = useMemo(
    () => entitlements.includes("hyprnote_pro"),
    [entitlements],
  );

  const upgradeToPro = useCallback(() => {
    openUrl(`${env.VITE_APP_URL}/app/checkout?period=monthly`);
  }, []);

  const value = useMemo<BillingContextValue>(
    () => ({
      entitlements,
      isPro,
      upgradeToPro,
    }),
    [entitlements, isPro, upgradeToPro],
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
