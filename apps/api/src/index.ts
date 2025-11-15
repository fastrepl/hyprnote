import type { ServerWebSocket } from "bun";
import { Hono } from "hono";
import { upgradeWebSocket, websocket } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import Stripe from "stripe";

import { env } from "./env";
import { verifyStripeWebhook } from "./stripe";
import { requireSupabaseAuth, supabaseAdmin } from "./supabase";
import { normalizeWsData, type WsPayload } from "./ws";

const app = new Hono();

app.use(logger());
app.notFound((c) => c.text("not_found", 404));

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

const buildDeepgramUrl = (incomingUrl: URL) => {
  const target = new URL("wss://api.deepgram.com/v1/listen");

  incomingUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });

  return target;
};

app.get(
  "/listen",
  requireSupabaseAuth,
  upgradeWebSocket((c) => {
    const clientUrl = new URL(c.req.url, "http://localhost");
    const deepgramUrl = buildDeepgramUrl(clientUrl).toString();
    const supabaseUserId = c.var.supabaseUserId;

    let upstream: WebSocket | undefined;
    let upstreamReady = false;
    let shuttingDown = false;
    let clientSocket: ServerWebSocket<unknown> | null = null;
    const pending: WsPayload[] = [];

    const closeBoth = (code = 1011, reason = "connection_closed") => {
      if (shuttingDown) {
        return;
      }

      shuttingDown = true;

      if (clientSocket && clientSocket.readyState !== WebSocket.CLOSED) {
        try {
          clientSocket.close(code, reason);
        } catch (error) {
          console.error(
            `[LISTEN SOCKET] failed to close client (${supabaseUserId})`,
            error,
          );
        }
      }

      if (
        upstream &&
        upstream.readyState !== WebSocket.CLOSED &&
        upstream.readyState !== WebSocket.CLOSING
      ) {
        try {
          upstream.close(code, reason);
        } catch (error) {
          console.error(
            `[DEEPGRAM SOCKET] failed to close upstream (${supabaseUserId})`,
            error,
          );
        }
      }

      pending.length = 0;
      clientSocket = null;
      upstream = undefined;
    };

    const flushPending = () => {
      if (!upstream || !upstreamReady || pending.length === 0) {
        return;
      }

      while (pending.length > 0) {
        const message = pending.shift();
        if (!message) {
          continue;
        }

        try {
          upstream.send(message);
        } catch (error) {
          console.error(
            `[DEEPGRAM SOCKET] failed to flush queued message (${supabaseUserId})`,
            error,
          );
          closeBoth(1011, "upstream_send_failed");
          break;
        }
      }
    };

    return {
      onOpen(_event, ws) {
        clientSocket = ws.raw;

        const dgUrl = new URL(deepgramUrl);
        dgUrl.searchParams.set("access_token", env.DEEPGRAM_API_KEY);

        upstream = new WebSocket(dgUrl.toString());
        upstream.binaryType = "arraybuffer";

        upstream.addEventListener("open", () => {
          upstreamReady = true;
          flushPending();
        });

        upstream.addEventListener("message", async (event) => {
          if (!clientSocket || clientSocket.readyState !== WebSocket.OPEN) {
            return;
          }

          const payload = await normalizeWsData(event.data);
          if (!payload) {
            return;
          }

          try {
            clientSocket.send(payload);
          } catch (error) {
            console.error(
              `[LISTEN SOCKET] failed to forward upstream payload (${supabaseUserId})`,
              error,
            );
            closeBoth(1011, "downstream_send_failed");
          }
        });

        upstream.addEventListener("close", (event) => {
          closeBoth(event.code || 1011, event.reason || "upstream_closed");
        });

        upstream.addEventListener("error", (error) => {
          console.error(
            `[DEEPGRAM SOCKET] encountered error (${supabaseUserId})`,
            error,
          );
          closeBoth(1011, "upstream_error");
        });
      },
      async onMessage(event) {
        if (!upstream) {
          if (clientSocket) {
            closeBoth(1011, "upstream_unavailable");
          }
          return;
        }

        const payload = await normalizeWsData(event.data);
        if (!payload) {
          return;
        }

        if (!upstreamReady) {
          pending.push(payload);
          return;
        }

        try {
          upstream.send(payload);
        } catch (error) {
          console.error(
            `[LISTEN SOCKET] failed to forward client payload (${supabaseUserId})`,
            error,
          );
          closeBoth(1011, "upstream_send_failed");
        }
      },
      onClose(event) {
        const code = event?.code ?? 1000;
        const reason = event?.reason || "client_closed";
        closeBoth(code, reason);
      },
      onError(err) {
        console.error(`[LISTEN SOCKET] client error (${supabaseUserId})`, err);
        closeBoth(1011, "client_error");
      },
    };
  }),
);

export default {
  port: env.PORT,
  fetch: app.fetch,
  websocket,
};
