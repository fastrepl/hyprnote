import { createMiddleware } from "hono/factory";
import Stripe from "stripe";

import { env } from "./env";

export const stripe = new Stripe(env.STRIPE_API_KEY, {
  apiVersion: "2025-10-29.clover",
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

export const verifyStripeWebhook = createMiddleware<{
  Variables: { stripeEvent: Stripe.Event };
}>(async (c, next) => {
  const signature = c.req.header("Stripe-Signature");

  if (!signature) {
    return c.text("missing_stripe_signature", 400);
  }

  const body = await c.req.text();
  try {
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
      undefined,
      cryptoProvider,
    );

    c.set("stripeEvent", event);
    await next();
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "unknown_error";
    return c.text(message, 400);
  }
});
