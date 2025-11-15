import { useQuery } from "@tanstack/react-query";
import type Stripe from "stripe";

import { useAuth } from "../auth";
import { env } from "../env";

export function useBilling() {
  const auth = useAuth();

  return useQuery({
    enabled: !!auth?.supabase && !!auth?.session?.user?.id,
    queryKey: ["billing", auth?.session?.user?.id],
    queryFn: async () => {
      if (!auth?.supabase || !auth?.session?.user?.id) {
        return null;
      }

      const { data, error } = await auth.supabase
        .from("billings")
        .select("*")
        .eq("user_id", auth.session.user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const billing = data as {
        id: string;
        user_id: string;
        created_at: string;
        updated_at: string;
        stripe_customer: Stripe.Customer | null;
        stripe_subscription: Stripe.Subscription | null;
      } | null;

      return { ...billing, isPro: isPro(billing?.stripe_subscription) };
    },
  });
}

function isPro(subscription: Stripe.Subscription | null | undefined): boolean {
  if (!subscription) {
    return false;
  }

  const hasValidStatus = ["active", "trialing"].includes(subscription.status);

  const hasProProduct = subscription.items.data.some((item) => {
    const product = item.price.product;

    return typeof product === "string"
      ? product === env.VITE_PRO_PRODUCT_ID
      : product.id === env.VITE_PRO_PRODUCT_ID;
  });

  return hasValidStatus && hasProProduct;
}
