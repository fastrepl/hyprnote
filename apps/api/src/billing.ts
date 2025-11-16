// https://github.com/t3dotgg/stripe-recommendations/blob/main/README.md
import Stripe from "stripe";

import { stripe } from "./stripe";
import { supabaseAdmin } from "./supabase";

const HANDLED_EVENTS: Stripe.Event.Type[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.upcoming",
  "invoice.marked_uncollectible",
  "invoice.payment_succeeded",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
];

export async function syncBillingState(customerId: string) {
  const customer = await getStripeCustomer(customerId);

  if (!customer) {
    return;
  }

  const userId = getUserIdFromCustomer(customer);

  if (!userId) {
    return;
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
    status: "all",
    expand: ["data.default_payment_method"],
  });

  const subscription =
    subscriptions.data.length > 0 ? subscriptions.data[0] : null;

  const payload: {
    user_id: string;
    stripe_customer: Stripe.Customer;
    updated_at: string;
    stripe_subscription?: Stripe.Subscription | null;
  } = {
    user_id: userId,
    stripe_customer: customer,
    updated_at: new Date().toISOString(),
  };

  if (subscription) {
    payload.stripe_subscription = subscription;
  }

  const { error } = await supabaseAdmin
    .from("billings")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    throw error;
  }
}

export async function syncBillingForStripeEvent(event: Stripe.Event) {
  if (!isHandledEvent(event.type)) {
    return;
  }

  const customerId = getCustomerId(event.data.object);

  if (!customerId) {
    return;
  }

  await syncBillingState(customerId);
}

const isHandledEvent = (eventType: string) =>
  HANDLED_EVENTS.includes(eventType as Stripe.Event.Type);

const getCustomerId = (
  eventObject: Stripe.Event.Data.Object,
): string | null => {
  const obj = eventObject as { customer?: string | { id: string } };

  if (typeof obj.customer === "string") {
    return obj.customer;
  }

  if (obj.customer && typeof obj.customer === "object") {
    return obj.customer.id;
  }

  return null;
};

const getStripeCustomer = async (customerId: string) => {
  const customer = await stripe.customers.retrieve(customerId);

  if (isDeletedCustomer(customer)) {
    console.warn(
      `[STRIPE WEBHOOK] Customer ${customerId} is deleted, skipping sync`,
    );
    return null;
  }

  return customer;
};

const isDeletedCustomer = (
  customer: Stripe.Customer | Stripe.DeletedCustomer,
): customer is Stripe.DeletedCustomer =>
  "deleted" in customer && customer.deleted === true;

const getUserIdFromCustomer = (customer: Stripe.Customer): string | null => {
  const metadata = customer.metadata ?? {};

  return (
    metadata["userId"] || metadata["user_id"] || metadata["userID"] || null
  );
};
