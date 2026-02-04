import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from "react";

import { getRpcCanStartTrial } from "@hypr/api-client";
import { createClient } from "@hypr/api-client/client";
import { commands as authCommands, type Claims } from "@hypr/plugin-auth";
import { commands as openerCommands } from "@hypr/plugin-opener2";

import { useAuth } from "./auth";
import { env } from "./env";
import { getScheme } from "./utils";

async function getEntitlementsFromToken(
  accessToken: string,
): Promise<Claims["entitlements"]> {
  const result = await authCommands.decodeClaims(accessToken);
  if (result.status === "error") {
    return [];
  }
  return result.data.entitlements ?? [];
}

type BillingContextValue = {
  entitlements: string[];
  isPro: boolean;
  canStartTrial: { data: boolean; isPending: boolean };
  upgradeToPro: () => void;
};

export type BillingAccess = BillingContextValue;

const BillingContext = createContext<BillingContextValue | null>(null);

export function BillingProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  const entitlementsQuery = useQuery({
    queryKey: ["entitlements", auth?.session?.access_token ?? ""],
    queryFn: () => getEntitlementsFromToken(auth!.session!.access_token),
    enabled: !!auth?.session?.access_token,
  });

  const entitlements = entitlementsQuery.data ?? [];

  const isPro = useMemo(
    () => entitlements.includes("hyprnote_pro"),
    [entitlements],
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

  const canStartTrial = useMemo(
    () => ({
      data: isPro ? false : (canTrialQuery.data ?? false),
      isPending: canTrialQuery.isPending,
    }),
    [isPro, canTrialQuery.data, canTrialQuery.isPending],
  );

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
      canStartTrial,
      upgradeToPro,
    }),
    [entitlements, isPro, canStartTrial, upgradeToPro],
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
