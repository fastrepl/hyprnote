import { createServerFn } from "@tanstack/react-start";

import { getStripeClient } from "@/functions/stripe";
import { getSupabaseServerClient } from "@/functions/supabase";

import { env } from "@/env";

export const createCheckoutSession = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  const stripe = getStripeClient();

  let stripeCustomerId = user.user_metadata?.stripe_customer_id as string | undefined;

  if (!stripeCustomerId) {
    const newCustomer = await stripe.customers.create({
      email: user.email,
      metadata: {
        userId: user.id,
      },
    });

    await supabase.auth.updateUser({
      data: {
        stripe_customer_id: newCustomer.id,
      },
    });

    stripeCustomerId = newCustomer.id;
  }

  const checkout = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    success_url: `${env.VITE_APP_URL}/app/account?success=true`,
    cancel_url: `${env.VITE_APP_URL}/app/account`,
    line_items: [
      {
        price: env.STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    mode: "subscription",
  });

  return { url: checkout.url };
});

export const createPortalSession = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  const stripeCustomerId = user.user_metadata?.stripe_customer_id as string | undefined;

  if (!stripeCustomerId) {
    throw new Error("No Stripe customer found");
  }

  const stripe = getStripeClient();

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${env.VITE_APP_URL}/app/account`,
  });

  return { url: portalSession.url };
});

export const syncAfterSuccess = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  const stripeCustomerId = user.user_metadata?.stripe_customer_id as string | undefined;

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
});
