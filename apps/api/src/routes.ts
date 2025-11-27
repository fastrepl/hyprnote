import { createRoute, z } from "@hono/zod-openapi";

export const API_TAGS = {
  INTERNAL: "internal",
  APP: "app",
  WEBHOOK: "webhook",
} as const;

export const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: [API_TAGS.INTERNAL],
  summary: "Health check",
  description: "Returns the health status of the API server.",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            status: z.string().openapi({ example: "ok" }),
          }),
        },
      },
      description: "API is healthy",
    },
  },
});

const ChatCompletionMessageSchema = z
  .object({
    role: z.enum(["system", "user", "assistant"]).openapi({ example: "user" }),
    content: z.string().openapi({ example: "Hello, how are you?" }),
  })
  .openapi("ChatCompletionMessage");

const ChatCompletionRequestSchema = z
  .object({
    model: z.string().optional().openapi({ example: "gpt-4" }),
    messages: z.array(ChatCompletionMessageSchema).openapi({
      example: [{ role: "user", content: "Hello!" }],
    }),
    tools: z.array(z.unknown()).optional(),
    tool_choice: z.union([z.string(), z.object({})]).optional(),
    stream: z.boolean().optional().openapi({ example: false }),
    temperature: z.number().optional().openapi({ example: 0.7 }),
    max_tokens: z.number().optional().openapi({ example: 1000 }),
  })
  .passthrough()
  .openapi("ChatCompletionRequest");

export const chatCompletionsRoute = createRoute({
  method: "post",
  path: "/chat/completions",
  tags: [API_TAGS.APP],
  summary: "Chat completions",
  description:
    "OpenAI-compatible chat completions endpoint. Proxies requests to OpenRouter with automatic model selection. Requires Supabase authentication.",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: ChatCompletionRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Chat completion response (streamed or non-streamed)",
    },
    401: {
      content: {
        "text/plain": {
          schema: z.string().openapi({ example: "unauthorized" }),
        },
      },
      description: "Unauthorized - missing or invalid authentication",
    },
  },
});

export const stripeWebhookRoute = createRoute({
  method: "post",
  path: "/webhook/stripe",
  tags: [API_TAGS.WEBHOOK],
  summary: "Stripe webhook",
  description:
    "Handles Stripe webhook events for billing synchronization. Requires valid Stripe signature.",
  request: {
    headers: z.object({
      "stripe-signature": z.string().openapi({
        description: "Stripe webhook signature for verification",
        example: "t=1234567890,v1=...",
      }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            ok: z.boolean().openapi({ example: true }),
          }),
        },
      },
      description: "Webhook processed successfully",
    },
    400: {
      content: {
        "text/plain": {
          schema: z.string().openapi({ example: "missing_stripe_signature" }),
        },
      },
      description: "Invalid or missing Stripe signature",
    },
    500: {
      content: {
        "application/json": {
          schema: z.object({
            error: z
              .string()
              .openapi({ example: "stripe_billing_sync_failed" }),
          }),
        },
      },
      description: "Internal server error during billing sync",
    },
  },
});

export const listenRoute = createRoute({
  method: "get",
  path: "/listen",
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
      content: {
        "application/json": {
          schema: z.object({
            error: z.string().openapi({ example: "upgrade_failed" }),
          }),
        },
      },
      description: "WebSocket upgrade failed",
    },
    401: {
      content: {
        "text/plain": {
          schema: z.string().openapi({ example: "unauthorized" }),
        },
      },
      description: "Unauthorized - missing or invalid authentication",
    },
    502: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string().openapi({ example: "upstream_unavailable" }),
            detail: z.string().openapi({ example: "upstream_connect_timeout" }),
          }),
        },
      },
      description: "Upstream STT service unavailable",
    },
    504: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string().openapi({ example: "upstream_unavailable" }),
            detail: z.string().openapi({ example: "upstream_connect_timeout" }),
          }),
        },
      },
      description: "Upstream STT service timeout",
    },
  },
});
