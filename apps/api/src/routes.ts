import { OpenAI as PostHogOpenAI } from "@posthog/ai";
import * as Sentry from "@sentry/bun";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver, validator } from "hono-openapi/zod";
import { z } from "zod";

import { env } from "./env";
import type { AppBindings } from "./hono-bindings";
import { posthog } from "./posthog";
import { Metrics } from "./sentry/metrics";

const openai = new PostHogOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: env.OPENROUTER_API_KEY,
  posthog,
});

export const API_TAGS = {
  INTERNAL: "internal",
  APP: "app",
  WEBHOOK: "webhook",
  PUBLIC: "public",
} as const;

const HealthResponseSchema = z.object({
  status: z.string(),
});

const ChatCompletionMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const ChatCompletionRequestSchema = z.looseObject({
  model: z.string().optional(),
  messages: z.array(ChatCompletionMessageSchema),
  tools: z.array(z.unknown()).optional(),
  tool_choice: z.union([z.string(), z.object({})]).optional(),
  stream: z.boolean().optional(),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
});

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

const BatchWordSchema = z.object({
  word: z.string(),
  start: z.number(),
  end: z.number(),
  confidence: z.number(),
  speaker: z.number().nullable().optional(),
  punctuated_word: z.string().nullable().optional(),
});

const BatchAlternativesSchema = z.object({
  transcript: z.string(),
  confidence: z.number(),
  words: z.array(BatchWordSchema),
});

const BatchChannelSchema = z.object({
  alternatives: z.array(BatchAlternativesSchema),
});

const BatchResultsSchema = z.object({
  channels: z.array(BatchChannelSchema),
});

const BatchResponseSchema = z.object({
  metadata: z.unknown(),
  results: BatchResultsSchema,
});

const BatchErrorSchema = z.object({
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

    return Sentry.startSpan(
      { op: "http.client", name: "openrouter.chat.completions" },
      async (span) => {
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

        span.setAttribute("chat.tool_calling", needsToolCalling);
        span.setAttribute("chat.streaming", requestBody.stream ?? false);

        const {
          model: _ignoredModel,
          stream,
          messages,
          tools,
          tool_choice,
          temperature,
          max_tokens,
          ...restBody
        } = requestBody;

        const startTime = performance.now();

        try {
          const createParams = {
            model: "",
            messages,
            tools,
            tool_choice,
            temperature,
            max_tokens,
          } as Parameters<typeof openai.chat.completions.create>[0];
          const extraBody = {
            ...restBody,
            models: modelsToUse,
            provider: { sort: "latency" },
          };

          if (stream) {
            const streamResponse = await openai.chat.completions.create(
              { ...createParams, stream: true },
              { body: extraBody },
            );

            Metrics.upstreamLatency(
              "openrouter",
              performance.now() - startTime,
            );
            Metrics.chatCompletion(true, 200);
            span.setAttribute("http.status_code", 200);

            const encoder = new TextEncoder();
            const readableStream = new ReadableStream({
              async start(controller) {
                try {
                  for await (const chunk of streamResponse) {
                    const data = `data: ${JSON.stringify(chunk)}\n\n`;
                    controller.enqueue(encoder.encode(data));
                  }
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  controller.close();
                } catch (error) {
                  Sentry.captureException(error, {
                    tags: { streaming: true },
                  });
                  controller.error(error);
                }
              },
            });

            return new Response(readableStream, {
              status: 200,
              headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
              },
            });
          }

          const response = await openai.chat.completions.create(
            { ...createParams, stream: false },
            { body: extraBody },
          );

          Metrics.upstreamLatency("openrouter", performance.now() - startTime);
          Metrics.chatCompletion(false, 200);
          span.setAttribute("http.status_code", 200);

          return c.json(response, 200);
        } catch (error) {
          Metrics.upstreamLatency("openrouter", performance.now() - startTime);
          const isAPIError =
            error instanceof Error &&
            "status" in error &&
            typeof (error as { status?: number }).status === "number";
          const status = isAPIError
            ? (error as { status: number }).status
            : 500;
          Metrics.chatCompletion(stream ?? false, status);
          span.setAttribute("http.status_code", status);
          throw error;
        }
      },
    );
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

    const stripeEvent = c.get("stripeEvent");

    try {
      await Sentry.startSpan(
        { op: "billing.sync", name: `stripe.${stripeEvent.type}` },
        async () => {
          await syncBillingForStripeEvent(stripeEvent);
        },
      );
      Metrics.billingSync(true, stripeEvent.type);
    } catch (error) {
      Metrics.billingSync(false, stripeEvent.type);
      Sentry.captureException(error, {
        tags: { webhook: "stripe", event_type: stripeEvent.type },
      });
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

routes.post(
  "/transcribe",
  describeRoute({
    tags: [API_TAGS.APP],
    summary: "Batch speech-to-text transcription",
    description:
      "HTTP endpoint for batch speech-to-text transcription via file upload. Supports Deepgram, AssemblyAI, and Soniox providers. Use query parameter ?provider=deepgram|assemblyai|soniox to select provider. Requires Supabase authentication.",
    security: [{ Bearer: [] }],
    responses: {
      200: {
        description: "Transcription completed successfully",
        content: {
          "application/json": {
            schema: resolver(BatchResponseSchema),
          },
        },
      },
      400: {
        description: "Bad request - missing or invalid audio file",
        content: {
          "application/json": {
            schema: resolver(BatchErrorSchema),
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
      500: {
        description: "Internal server error during transcription",
        content: {
          "application/json": {
            schema: resolver(BatchErrorSchema),
          },
        },
      },
      502: {
        description: "Upstream STT service error",
        content: {
          "application/json": {
            schema: resolver(BatchErrorSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const { transcribeBatch } = await import("./stt");
    type BatchProvider = "deepgram" | "assemblyai" | "soniox";

    const clientUrl = new URL(c.req.url, "http://localhost");
    const provider =
      (clientUrl.searchParams.get("provider") as BatchProvider) ?? "deepgram";

    const languages = clientUrl.searchParams.getAll("language");
    const keywords = clientUrl.searchParams.getAll("keyword");
    const model = clientUrl.searchParams.get("model") ?? undefined;

    const contentType =
      c.req.header("content-type") ?? "application/octet-stream";

    return Sentry.startSpan(
      { op: "http.client", name: `stt.batch.${provider}` },
      async (span) => {
        const startTime = performance.now();

        try {
          const audioData = await c.req.arrayBuffer();

          if (!audioData || audioData.byteLength === 0) {
            return c.json(
              { error: "missing_audio_data", detail: "Request body is empty" },
              400,
            );
          }

          span.setAttribute("stt.provider", provider);
          span.setAttribute("stt.audio_size", audioData.byteLength);

          const response = await transcribeBatch(
            provider,
            audioData,
            contentType,
            { languages, keywords, model },
          );

          Metrics.upstreamLatency(provider, performance.now() - startTime);
          span.setAttribute("http.status_code", 200);

          return c.json(response, 200);
        } catch (error) {
          Metrics.upstreamLatency(provider, performance.now() - startTime);

          const errorMessage =
            error instanceof Error ? error.message : "unknown error";
          const isUpstreamError = errorMessage.includes("failed:");

          Sentry.captureException(error, {
            tags: { provider, operation: "batch_transcribe" },
          });

          span.setAttribute("http.status_code", isUpstreamError ? 502 : 500);

          return c.json(
            { error: "transcription_failed", detail: errorMessage },
            isUpstreamError ? 502 : 500,
          );
        }
      },
    );
  },
);
