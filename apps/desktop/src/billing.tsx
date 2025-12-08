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

type BillingContextValue = {
  isPro: boolean;
  upgradeToPro: () => void;
};

export type BillingAccess = BillingContextValue;

const BillingContext = createContext<BillingContextValue | null>(null);

export function BillingProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  const isPro = useMemo(() => {
    if (!auth?.session?.access_token) {
      return false;
    }

    try {
      const decoded = jwtDecode<{ is_pro?: boolean }>(
        auth.session.access_token,
      );
      return decoded.is_pro ?? false;
    } catch {
      return false;
    }
  }, [auth?.session?.access_token]);

  const upgradeToPro = useCallback(() => {
    openUrl(`${env.VITE_APP_URL}/app/checkout?period=monthly`);
  }, []);

  const value = useMemo<BillingContextValue>(
    () => ({
      isPro,
      upgradeToPro,
    }),
    [isPro, upgradeToPro],
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
