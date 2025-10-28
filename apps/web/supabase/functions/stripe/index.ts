import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import Stripe from "stripe";
import { createClient } from "supabase-js";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY") as string, {
  apiVersion: "2025-09-30.clover",
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

const app = new Hono().basePath("/stripe");

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const verifyStripeWebhook = createMiddleware<{ Variables: { stripeEvent: Stripe.Event } }>(async (c, next) => {
  const signature = c.req.header("Stripe-Signature");

  if (!signature) {
    return c.text("missing_stripe_signature", 400);
  }

  const body = await c.req.text();

  try {
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET")!,
      undefined,
      cryptoProvider,
    );

    c.set("stripeEvent", event);
    await next();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return c.text(errorMessage, 400);
  }
});

app.post("/webhook", verifyStripeWebhook, async (c) => {
  const event = c.var.stripeEvent;

  console.log(`[STRIPE WEBHOOK] Event received: ${event.id}`);

  const eventType = event.type;
  const eventData = event.data.object as Stripe.Subscription | Stripe.Customer;

  const userId = eventData.metadata?.user_id;

  if (userId && (eventType.startsWith("customer.") || eventType.startsWith("customer.subscription."))) {
    const customerId = "customer" in eventData ? eventData.customer as string : eventData.id;
    const subscriptionId = "object" in eventData && eventData.object === "subscription" ? eventData.id : null;

    const updateData: {
      stripe_customer_id?: string;
      stripe_subscription_id?: string;
    } = {};

    if (customerId) {
      updateData.stripe_customer_id = customerId;
    }
    if (subscriptionId) {
      updateData.stripe_subscription_id = subscriptionId;
    }

    const { error } = await supabaseAdmin
      .from("billings")
      .update(updateData)
      .eq("user_id", userId);

    if (error) {
      console.error(`[STRIPE WEBHOOK] Failed to update billings for user ${userId}:`, error);
      return c.json({ error: error.message }, 500);
    }

    console.log(`[STRIPE WEBHOOK] Updated billings for user ${userId}`);
  }

  return c.json({ ok: true }, 200);
});

app.notFound((c) => c.text("not_found", 404));

Deno.serve(app.fetch);
