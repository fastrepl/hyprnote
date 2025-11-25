import "./instrument";

import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { websocket } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { syncBillingForStripeEvent } from "./billing";
import { env } from "./env";
import { handleReleaseEvent, verifyGitHubWebhook } from "./github";
import { listenSocketHandler } from "./listen";
import { startSlackBot } from "./slack";
import { verifyStripeWebhook } from "./stripe";
import { requireSupabaseAuth } from "./supabase";

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

app.post("/webhook/stripe", verifyStripeWebhook, async (c) => {
  try {
    await syncBillingForStripeEvent(c.var.stripeEvent);
  } catch (error) {
    console.error(error);
    return c.json({ error: "stripe_billing_sync_failed" }, 500);
  }

  return c.json({ ok: true });
});

app.post("/webhook/github", verifyGitHubWebhook, async (c) => {
  try {
    await handleReleaseEvent(c.var.githubEvent);
  } catch (error) {
    console.error(error);
    return c.json({ error: "github_webhook_failed" }, 500);
  }

  return c.json({ ok: true });
});

if (env.NODE_ENV === "development") {
  app.get("/listen", listenSocketHandler);
} else {
  app.get("/listen", requireSupabaseAuth, listenSocketHandler);
}

startSlackBot();

export default {
  port: env.PORT,
  fetch: app.fetch,
  websocket,
};
