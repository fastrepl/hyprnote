import { createServerFn } from "@tanstack/react-start";
import { jwtDecode } from "jwt-decode";

import type { Claims } from "@hypr/plugin-auth";

import { getSupabaseServerClient } from "@/functions/supabase";

const PRO_ENTITLEMENT = "hyprnote_pro";

export type BillingAccess = {
  entitlements: string[];
  isPro: boolean;
  isTrialing: boolean;
  trialDaysRemaining: number | null;
};

export const fetchBillingAccess = createServerFn({ method: "GET" }).handler(
  async (): Promise<BillingAccess> => {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase.auth.getSession();

    if (!data.session?.access_token) {
      return {
        entitlements: [],
        isPro: false,
        isTrialing: false,
        trialDaysRemaining: null,
      };
    }

    let claims: Claims;
    try {
      claims = jwtDecode<Claims>(data.session.access_token);
    } catch {
      claims = { sub: "" };
    }

    const entitlements = claims.entitlements ?? [];
    const isPro = entitlements.includes(PRO_ENTITLEMENT);
    const isTrialing = claims.subscription_status === "trialing";

    let trialDaysRemaining: number | null = null;
    if (claims.trial_end) {
      const now = Math.floor(Date.now() / 1000);
      const secondsRemaining = claims.trial_end - now;
      if (secondsRemaining <= 0) {
        trialDaysRemaining = 0;
      } else {
        trialDaysRemaining = Math.ceil(secondsRemaining / (24 * 60 * 60));
      }
    }

    return {
      entitlements,
      isPro,
      isTrialing,
      trialDaysRemaining,
    };
  },
);
