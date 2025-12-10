import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { env } from "@/env";
import { getStripeClient } from "@/functions/stripe";
import { getSupabaseServerClient } from "@/functions/supabase";

type SupabaseClient = ReturnType<typeof getSupabaseServerClient>;

type AuthUser = {
  id: string;
  user_metadata?: {
    stripe_customer_id?: string;
  } | null;
};

const getStripeCustomerIdForUser = async (
  supabase: SupabaseClient,
  user: AuthUser,
) => {
  const metadataCustomerId = user.user_metadata?.stripe_customer_id;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw profileError;
  }

  const profileCustomerId = profile?.stripe_customer_id as
    | string
    | null
    | undefined;

  const stripeCustomerId =
    profileCustomerId ?? (metadataCustomerId as string | undefined);

  if (profileCustomerId && profileCustomerId !== metadataCustomerId) {
    await supabase.auth.updateUser({
      data: {
        stripe_customer_id: profileCustomerId,
      },
    });
  }

  return stripeCustomerId;
};

const createCheckoutSessionInput = z.object({
  period: z.enum(["monthly", "yearly"]),
});

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator(createCheckoutSessionInput)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      throw new Error("Unauthorized");
    }

    const stripe = getStripeClient();

    let stripeCustomerId = await getStripeCustomerIdForUser(supabase, {
      id: user.id,
      user_metadata: user.user_metadata,
    });

    if (!stripeCustomerId) {
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });

      await Promise.all([
        supabase.auth.updateUser({
          data: {
            stripe_customer_id: newCustomer.id,
          },
        }),
        supabase
          .from("profiles")
          .update({ stripe_customer_id: newCustomer.id })
          .eq("id", user.id),
      ]);

      stripeCustomerId = newCustomer.id;
    }

    const priceId =
      data.period === "yearly"
        ? env.STRIPE_YEARLY_PRICE_ID
        : env.STRIPE_MONTHLY_PRICE_ID;

    const checkout = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      success_url: `${env.VITE_APP_URL}/app/account?success=true`,
      cancel_url: `${env.VITE_APP_URL}/app/account`,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
    });

    return { url: checkout.url };
  });

export const createPortalSession = createServerFn({ method: "POST" }).handler(
  async () => {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      throw new Error("Unauthorized");
    }

    const stripeCustomerId = await getStripeCustomerIdForUser(supabase, {
      id: user.id,
      user_metadata: user.user_metadata,
    });

    if (!stripeCustomerId) {
      throw new Error("No Stripe customer found");
    }

    const stripe = getStripeClient();

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${env.VITE_APP_URL}/app/account`,
    });

    return { url: portalSession.url };
  },
);

export const syncAfterSuccess = createServerFn({ method: "POST" }).handler(
  async () => {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      throw new Error("Unauthorized");
    }

    const stripeCustomerId = await getStripeCustomerIdForUser(supabase, {
      id: user.id,
      user_metadata: user.user_metadata,
    });

    if (!stripeCustomerId) {
      return { status: "none" };
    }

    const stripe = getStripeClient();

    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      limit: 1,
      status: "all",
    });

    if (subscriptions.data.length === 0) {
      return { status: "none" };
    }

    const subscription = subscriptions.data[0];

    return {
      subscriptionId: subscription.id,
      status: subscription.status,
      priceId: subscription.items.data[0].price.id,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  },
);
