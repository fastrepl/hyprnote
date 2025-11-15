import { createClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { upgradeWebSocket, websocket } from "hono/bun";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import Stripe from "stripe";

type ChatCompletionPayload = Record<string, unknown> & {
  tools?: unknown;
  tool_choice?: unknown;
  model?: unknown;
};

const requireEnv = (key: keyof typeof Bun.env) => {
  const value = Bun.env[key];
  if (!value) {
    throw new Error(`Missing ${key} environment variable`);
  }
  return value;
};

const supabaseUrl = requireEnv("SUPABASE_URL");
const supabaseAnonKey = requireEnv("SUPABASE_ANON_KEY");
const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const stripeApiKey = requireEnv("STRIPE_API_KEY");
const stripeWebhookSecret = requireEnv("STRIPE_WEBHOOK_SIGNING_SECRET");
const openRouterApiKey = requireEnv("OPENROUTER_API_KEY");

const stripe = new Stripe(stripeApiKey, {
  apiVersion: "2025-10-29.clover",
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: [
      "authorization",
      "x-client-info",
      "apikey",
      "content-type",
      "user-agent",
    ],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

const requireSupabaseAuth = createMiddleware<{
  Variables: { supabaseUserId: string };
}>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.text("unauthorized", 401);
  }

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseClient.auth.getUser(token);

  if (error || !data.user) {
    return c.text("unauthorized", 401);
  }

  c.set("supabaseUserId", data.user.id);
  await next();
});

const verifyStripeWebhook = createMiddleware<{
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
      stripeWebhookSecret,
      undefined,
      cryptoProvider,
    );

    c.set("stripeEvent", event);
    await next();
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return c.text(message, 400);
  }
});

app.get("/health", (c) => c.json({ status: "ok" }));

app.post("/chat/completions", requireSupabaseAuth, async (c) => {
  const requestBody = await c.req.json<ChatCompletionPayload>();

  const toolChoice = requestBody.tool_choice;
  const needsToolCalling =
    Array.isArray(requestBody.tools) &&
    !(typeof toolChoice === "string" && toolChoice === "none");

  const modelsToUse = needsToolCalling
    ? ["anthropic/claude-haiku-4.5", "openai/gpt-oss-120b:nitro"]
    : ["openai/chatgpt-4o-latest", "moonshotai/kimi-k2-0905:nitro"];

  const { model: _ignoredModel, ...bodyWithoutModel } = requestBody;

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openRouterApiKey}`,
      },
      body: JSON.stringify({ ...bodyWithoutModel, models: modelsToUse }),
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

  console.log(`[STRIPE WEBHOOK] Event received: ${event.id}`);

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

app.get(
  "/listen",
  upgradeWebSocket(() => {
    let heartbeat: ReturnType<typeof setInterval> | undefined;

    return {
      onOpen(_event, ws) {
        ws.send(JSON.stringify({ type: "connected" }));
        heartbeat = setInterval(() => {
          ws.send(JSON.stringify({ type: "ping", at: Date.now() }));
        }, 15_000);
      },
      onMessage(event, ws) {
        ws.send(
          JSON.stringify({
            type: "echo",
            receivedAt: Date.now(),
            payload: event.data,
          }),
        );
      },
      onClose() {
        if (heartbeat) {
          clearInterval(heartbeat);
        }
      },
      onError(err) {
        console.error("[LISTEN SOCKET] error", err);
      },
    };
  }),
);

app.notFound((c) => c.text("not_found", 404));

const port = Number(Bun.env.PORT ?? 8787);

export default {
  port,
  fetch: app.fetch,
  websocket,
};
