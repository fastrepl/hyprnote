import "./instrument";

import { OpenAPIHono } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";
import { websocket } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { syncBillingForStripeEvent } from "./billing";
import { env } from "./env";
import { listenSocketHandler } from "./listen";
import { OPENAPI_CONFIG } from "./openapi-config";
import {
  chatCompletionsRoute,
  healthRoute,
  listenRoute,
  stripeWebhookRoute,
} from "./routes";
import { verifyStripeWebhook } from "./stripe";
import { requireSupabaseAuth } from "./supabase";

const app = new OpenAPIHono();

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

app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
  type: "http",
  scheme: "bearer",
  description: "Supabase JWT token",
});

app.openapi(healthRoute, (c) => c.json({ status: "ok" }, 200));

app.notFound((c) => c.text("not_found", 404));

app.use("/chat/completions", requireSupabaseAuth);
app.openapi(chatCompletionsRoute, async (c) => {
  const requestBody = c.req.valid("json");

  const toolChoice = requestBody.tool_choice;
  const needsToolCalling =
    Array.isArray(requestBody.tools) &&
    !(typeof toolChoice === "string" && toolChoice === "none");

  // https://openrouter.ai/docs/features/exacto-variant
  const modelsToUse = needsToolCalling
    ? [
        "moonshotai/kimi-k2-0905:exacto",
        "anthropic/claude-haiku-4.5",
        "openai/gpt-oss-120b:exacto",
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

app.use("/webhook/stripe", verifyStripeWebhook);
app.openapi(stripeWebhookRoute, async (c) => {
  try {
    const stripeEvent = c.get("stripeEvent" as never);
    await syncBillingForStripeEvent(stripeEvent);
  } catch (error) {
    console.error(error);
    return c.json({ error: "stripe_billing_sync_failed" }, 500);
  }

  return c.json({ ok: true }, 200);
});

if (env.NODE_ENV === "development") {
  app.openapi(listenRoute, listenSocketHandler);
} else {
  app.use("/listen", requireSupabaseAuth);
  app.openapi(listenRoute, listenSocketHandler);
}

app.doc("/openapi.json", OPENAPI_CONFIG);

export default {
  port: env.PORT,
  fetch: app.fetch,
  websocket,
};
