import { createServerFn } from "@tanstack/react-start";

import { getSupabaseServerClient } from "@/functions/supabase";

const PRO_ENTITLEMENT = "hyprnote_pro";

type JwtClaims = {
  entitlements?: string[];
  subscription_status?: "trialing" | "active";
  trial_end?: number;
};

function decodeJwtPayload(accessToken: string): JwtClaims {
  try {
    const [, payloadBase64] = accessToken.split(".");
    if (!payloadBase64) return {};

    return JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString("utf-8"),
    );
  } catch {
    return {};
  }
}

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

    const claims = decodeJwtPayload(data.session.access_token);
    const entitlements = Array.isArray(claims.entitlements)
      ? claims.entitlements
      : [];
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
