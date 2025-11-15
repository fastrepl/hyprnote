import "./instrument";

import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { websocket } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import Stripe from "stripe";

import { env } from "./env";
import { listenSocketHandler } from "./listen";
import { verifyStripeWebhook } from "./stripe";
import { requireSupabaseAuth, supabaseAdmin } from "./supabase";

const app = new Hono();

app.use(logger());
app.use(bodyLimit({ maxSize: 1024 * 1024 * 5 }));

const corsMiddleware = cors({
  origin: "*",
  allowHeaders: [
    "authorization",
    "x-client-info",
    "apikey",
    "content-type",
    "user-agent",
  ],
  allowMethods: ["GET", "POST", "OPTIONS"],
});

app.use("*", (c, next) => {
  if (c.req.path === "/listen") {
    return next();
  }
  return corsMiddleware(c, next);
});

app.get("/health", (c) => c.json({ status: "ok" }));
app.notFound((c) => c.text("not_found", 404));

app.post("/chat/completions", requireSupabaseAuth, async (c) => {
  const requestBody = await c.req.json<
    {
      model?: unknown;
      tools?: unknown;
      tool_choice?: unknown;
    } & Record<string, unknown>
  >();

  const toolChoice = requestBody.tool_choice;
  const needsToolCalling =
    Array.isArray(requestBody.tools) &&
    !(typeof toolChoice === "string" && toolChoice === "none");

  const modelsToUse = needsToolCalling
    ? [
        "moonshotai/kimi-k2-0905",
        "anthropic/claude-haiku-4.5",
        "openai/gpt-oss-120b",
      ]
    : ["openai/chatgpt-4o-latest", "moonshotai/kimi-k2-0905"];

  const { model: _ignoredModel, ...bodyWithoutModel } = requestBody;

  // https://openrouter.ai/docs/features/provider-routing#provider-sorting
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        ...bodyWithoutModel,
        models: modelsToUse,
        provider: { sort: "latency" },
      }),
    },
  );

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("Content-Type") ?? "application/json",
    },
  });
});

app.post("/webhook/stripe", verifyStripeWebhook, async (c) => {
  const event = c.var.stripeEvent;

  const eventType = event.type;
  const eventData = event.data.object as Stripe.Subscription | Stripe.Customer;
  const userId = eventData.metadata?.user_id;

  if (
    userId &&
    (eventType.startsWith("customer.") ||
      eventType.startsWith("customer.subscription."))
  ) {
    const customerId =
      "customer" in eventData ? (eventData.customer as string) : eventData.id;
    const subscriptionId =
      "object" in eventData && eventData.object === "subscription"
        ? eventData.id
        : null;

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
      console.error(
        `[STRIPE WEBHOOK] Failed to update billings for user ${userId}`,
        error,
      );
      return c.json({ error: error.message }, 500);
    }

    console.log(`[STRIPE WEBHOOK] Updated billings for user ${userId}`);
  }

  return c.json({ ok: true });
});

if (env.NODE_ENV === "development") {
  app.get("/listen", listenSocketHandler);
} else {
  app.get("/listen", requireSupabaseAuth, listenSocketHandler);
}

export default {
  port: env.PORT,
  fetch: app.fetch,
  websocket,
};
