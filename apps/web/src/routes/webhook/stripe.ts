import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";

import { env } from "@/env";
import { getStripeClient } from "@/functions/stripe";

const ALLOWED_EVENTS: Stripe.Event.Type[] = [
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

async function processEvent(event: Stripe.Event) {
  if (!ALLOWED_EVENTS.includes(event.type)) {
    return;
  }

  const { customer: customerId } = event?.data?.object as { customer: string };

  if (typeof customerId !== "string") {
    throw new Error(
      `[STRIPE WEBHOOK] Customer ID isn't string. Event type: ${event.type}`,
    );
  }

  console.log(`[STRIPE WEBHOOK] Processing event ${event.type} for customer ${customerId}`);
}

export const Route = createFileRoute("/webhook/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const signature = request.headers.get("Stripe-Signature");

        if (!signature) {
          return new Response(JSON.stringify({ error: "No signature" }), { status: 400 });
        }

        try {
          const stripe = getStripeClient();

          const event = stripe.webhooks.constructEvent(
            body,
            signature,
            env.STRIPE_WEBHOOK_SECRET,
          );

          await processEvent(event);

          return new Response(JSON.stringify({ received: true }), { status: 200 });
        } catch (error) {
          console.error("[STRIPE WEBHOOK] Error processing event", error);
          return new Response(JSON.stringify({ received: true }), { status: 200 });
        }
      },
    },
  },
});
