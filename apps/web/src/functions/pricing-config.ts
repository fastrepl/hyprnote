import { createServerOnlyFn } from "@tanstack/react-start";
import { PostHog } from "posthog-node";

import { env } from "@/env";

export type PricingConfig = {
  monthly_price_id: string;
  yearly_price_id: string;
  monthly_display_price: number;
  yearly_display_price: number;
  monthly_original_price: number | null;
  yearly_original_price: number | null;
  promo_text: string | null;
  promo_active: boolean;
  save_percentage: string | null;
};

const FLAG_KEY = "pricing-config";

let posthogClient: PostHog | null = null;

function getPostHogClient(): PostHog {
  if (!posthogClient) {
    posthogClient = new PostHog(env.VITE_POSTHOG_API_KEY!, {
      host: env.VITE_POSTHOG_HOST,
    });
  }
  return posthogClient;
}

export const getPricingConfig = createServerOnlyFn(
  async (): Promise<PricingConfig> => {
    const client = getPostHogClient();
    const payload = await client.getFeatureFlagPayload(FLAG_KEY, "");
    if (payload && typeof payload === "object") {
      return payload as PricingConfig;
    }
    throw new Error(
      "pricing-config feature flag not found or has invalid payload",
    );
  },
);
