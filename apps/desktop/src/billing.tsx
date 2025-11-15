import { useQuery } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import type Stripe from "stripe";

import { useAuth } from "./auth";
import { env } from "./env";

type BillingRow = {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  stripe_customer: Stripe.Customer | null;
  stripe_subscription: Stripe.Subscription | null;
};

type BillingData = (BillingRow & { isPro: boolean }) | null;

type BillingContextValue = {
  data: BillingData;
  isPro: boolean;
  isLoading: boolean;
  isPending: boolean;
  isFetching: boolean;
  isRefetching: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
};

export type BillingAccess = BillingContextValue;

const BillingContext = createContext<BillingContextValue | null>(null);

export function BillingProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  const {
    data: queryData,
    isLoading,
    isPending,
    isFetching,
    isRefetching,
    isError,
    error,
    refetch,
  } = useQuery({
    enabled: !!auth?.supabase && !!auth?.session?.user?.id,
    queryKey: ["billing", auth?.session?.user?.id],
    queryFn: async (): Promise<BillingData> => {
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

      if (!data) {
        return null;
      }

      const billing = data as BillingRow;
      return {
        ...billing,
        isPro: computeIsPro(billing.stripe_subscription),
      };
    },
  });

  const data = queryData ?? null;

  const value = useMemo<BillingContextValue>(
    () => ({
      data,
      isPro: !!data?.isPro,
      isLoading,
      isPending,
      isFetching,
      isRefetching,
      isError,
      error,
      refetch: () => refetch(),
    }),
    [
      data,
      error,
      isError,
      isFetching,
      isLoading,
      isPending,
      isRefetching,
      refetch,
    ],
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

function computeIsPro(
  subscription: Stripe.Subscription | null | undefined,
): boolean {
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
