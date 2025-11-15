import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type Stripe from "stripe";

import { useAuth } from "../auth";

type BillingState = {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  stripe_customer: Stripe.Customer | null;
  stripe_subscription: Stripe.Subscription | null;
};

type SubscriptionStatus = Stripe.Subscription.Status;
type StoredSubscription = Record<string, unknown> & {
  status?: SubscriptionStatus;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
};

export function useBilling() {
  const auth = useAuth();

  return useQuery({
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

      return data as BillingState | null;
    },
    enabled: !!auth?.supabase && !!auth?.session?.user?.id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useBillingRealtime() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const billingQuery = useBilling();

  useEffect(() => {
    if (!auth?.supabase || !auth?.session?.user?.id) {
      return;
    }

    const channel = auth.supabase
      .channel("billing-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "billings",
          filter: `user_id=eq.${auth.session.user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["billing"] });
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [auth?.supabase, auth?.session?.user?.id, queryClient]);

  return billingQuery;
}

export function useSubscriptionStatus() {
  const { data: billing } = useBilling();

  const subscription = billing?.stripe_subscription as
    | StoredSubscription
    | null
    | undefined;
  const status = subscription?.status;

  const isActive = status === "active";
  const isTrial = status === "trialing";
  const isPastDue = status === "past_due";
  const isCanceled = status === "canceled";
  const isUnpaid = status === "unpaid";
  const isPaused = status === "paused";

  const isValidSubscription = isActive || isTrial || isPastDue || isPaused;

  const willCancelAtPeriodEnd = subscription?.cancel_at_period_end ?? false;

  const currentPeriodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  return {
    billing,
    subscription,
    status,
    isActive,
    isTrial,
    isPastDue,
    isCanceled,
    isUnpaid,
    isPaused,
    isValidSubscription,
    hasSubscription: !!subscription,
    willCancelAtPeriodEnd,
    currentPeriodEnd,
  };
}
