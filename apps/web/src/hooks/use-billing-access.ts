import { useMatch } from "@tanstack/react-router";

import type { BillingAccess } from "@/functions/billing-access";

export function useBillingAccess(): BillingAccess {
  const match = useMatch({ from: "/_view/app", shouldThrow: true });
  return match.context.billingAccess;
}
