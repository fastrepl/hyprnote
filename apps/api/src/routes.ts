import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver, validator } from "hono-openapi/zod";
import { z } from "zod";

import type { AppBindings } from "./hono-bindings";

export const API_TAGS = {
  INTERNAL: "internal",
  APP: "app",
  WEBHOOK: "webhook",
} as const;

const HealthResponseSchema = z.object({
  status: z.string(),
});

const ChatCompletionMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const ChatCompletionRequestSchema = z
  .object({
    model: z.string().optional(),
    messages: z.array(ChatCompletionMessageSchema),
    tools: z.array(z.unknown()).optional(),
    tool_choice: z.union([z.string(), z.object({})]).optional(),
    stream: z.boolean().optional(),
    temperature: z.number().optional(),
    max_tokens: z.number().optional(),
  })
  .passthrough();

const WebhookSuccessSchema = z.object({
  ok: z.boolean(),
});

const WebhookErrorSchema = z.object({
  error: z.string(),
});

const WebSocketErrorSchema = z.object({
  error: z.string(),
  detail: z.string().optional(),
});

export const routes = new Hono<AppBindings>();

routes.get(
  "/health",
  describeRoute({
    tags: [API_TAGS.INTERNAL],
    summary: "Health check",
    description: "Returns the health status of the API server.",
    responses: {
      200: {
        description: "API is healthy",
        content: {
          "application/json": {
            schema: resolver(HealthResponseSchema),
          },
        },
      },
    },
  }),
  (c) => c.json({ status: "ok" }, 200),
);

routes.post(
  "/chat/completions",
  describeRoute({
    tags: [API_TAGS.APP],
    summary: "Chat completions",
    description:
      "OpenAI-compatible chat completions endpoint. Proxies requests to OpenRouter with automatic model selection. Requires Supabase authentication.",
    security: [{ Bearer: [] }],
    responses: {
      200: {
        description: "Chat completion response (streamed or non-streamed)",
      },
      401: {
        description: "Unauthorized - missing or invalid authentication",
        content: {
          "text/plain": {
            schema: { type: "string", example: "unauthorized" },
          },
        },
      },
    },
  }),
  validator("json", ChatCompletionRequestSchema),
  async (c) => {
    const requestBody = c.req.valid("json");

    const { env } = await import("./env");

    const toolChoice = requestBody.tool_choice;
    const needsToolCalling =
      Array.isArray(requestBody.tools) &&
      !(typeof toolChoice === "string" && toolChoice === "none");

    const modelsToUse = needsToolCalling
      ? [
          "moonshotai/kimi-k2-0905:exacto",
          "anthropic/claude-haiku-4.5",
          "openai/gpt-oss-120b:exacto",
        ]
      : ["moonshotai/kimi-k2-0905", "openai/gpt-5.1-chat"];

    const { model: _ignoredModel, ...bodyWithoutModel } = requestBody;

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
  },
);

routes.post(
  "/webhook/stripe",
  describeRoute({
    tags: [API_TAGS.WEBHOOK],
    summary: "Stripe webhook",
    description:
      "Handles Stripe webhook events for billing synchronization. Requires valid Stripe signature.",
    responses: {
      200: {
        description: "Webhook processed successfully",
        content: {
          "application/json": {
            schema: resolver(WebhookSuccessSchema),
          },
        },
      },
      400: {
        description: "Invalid or missing Stripe signature",
        content: {
          "text/plain": {
            schema: { type: "string", example: "missing_stripe_signature" },
          },
        },
      },
      500: {
        description: "Internal server error during billing sync",
        content: {
          "application/json": {
            schema: resolver(WebhookErrorSchema),
          },
        },
      },
    },
  }),
  validator(
    "header",
    z.object({
      "stripe-signature": z.string(),
    }),
  ),
  async (c) => {
    const { syncBillingForStripeEvent } = await import("./billing");

    try {
      const stripeEvent = c.get("stripeEvent");
      await syncBillingForStripeEvent(stripeEvent);
    } catch (error) {
      console.error(error);
      return c.json({ error: "stripe_billing_sync_failed" }, 500);
    }

    return c.json({ ok: true }, 200);
  },
);

routes.get(
  "/listen",
  describeRoute({
    tags: [API_TAGS.APP],
    summary: "Speech-to-text WebSocket",
    description:
      "WebSocket endpoint for real-time speech-to-text transcription via Deepgram. Requires Supabase authentication in production.",
    security: [{ Bearer: [] }],
    responses: {
      101: {
        description: "WebSocket upgrade successful",
      },
      400: {
        description: "WebSocket upgrade failed",
        content: {
          "application/json": {
            schema: resolver(WebSocketErrorSchema),
          },
        },
      },
      401: {
        description: "Unauthorized - missing or invalid authentication",
        content: {
          "text/plain": {
            schema: { type: "string", example: "unauthorized" },
          },
        },
      },
      502: {
        description: "Upstream STT service unavailable",
        content: {
          "application/json": {
            schema: resolver(WebSocketErrorSchema),
          },
        },
      },
      504: {
        description: "Upstream STT service timeout",
        content: {
          "application/json": {
            schema: resolver(WebSocketErrorSchema),
          },
        },
      },
    },
  }),
  async (c, next) => {
    const { listenSocketHandler } = await import("./listen");
    return listenSocketHandler(c, next);
  },
);
