import { posthog } from "./posthog";

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

export async function getPricingConfig(): Promise<PricingConfig> {
  const payload = await posthog.getFeatureFlagPayload(FLAG_KEY, "");
  if (payload && typeof payload === "object") {
    return payload as PricingConfig;
  }
  throw new Error(
    "pricing-config feature flag not found or has invalid payload",
  );
}
