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

const GITHUB_ORG_REPO = "fastrepl/hyprnote";

interface StargazerCache {
  data: { username: string; avatar: string }[];
  timestamp: number;
}

let stargazerCache: StargazerCache | null = null;
const CACHE_TTL_MS = 1000 * 60 * 60;

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

const StargazersResponseSchema = z.object({
  stargazers: z.array(
    z.object({
      username: z.string(),
      avatar: z.string(),
    }),
  ),
});

routes.get(
  "/stargazers",
  describeRoute({
    tags: [API_TAGS.PUBLIC],
    summary: "Get GitHub stargazers",
    description:
      "Returns the most recent GitHub stargazers for the Hyprnote repository. Results are cached for 1 hour.",
    responses: {
      200: {
        description: "List of stargazers",
        content: {
          "application/json": {
            schema: resolver(StargazersResponseSchema),
          },
        },
      },
      500: {
        description: "Failed to fetch stargazers from GitHub",
        content: {
          "application/json": {
            schema: resolver(z.object({ error: z.string() })),
          },
        },
      },
    },
  }),
  async (c) => {
    const now = Date.now();

    if (stargazerCache && now - stargazerCache.timestamp < CACHE_TTL_MS) {
      return c.json({ stargazers: stargazerCache.data }, 200);
    }

    try {
      const repoResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_ORG_REPO}`,
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Hyprnote-API",
          },
        },
      );

      if (!repoResponse.ok) {
        throw new Error(`Failed to fetch repo info: ${repoResponse.status}`);
      }

      const repoData = await repoResponse.json();
      const totalStars = repoData.stargazers_count ?? 0;

      if (totalStars === 0) {
        return c.json({ stargazers: [] }, 200);
      }

      const count = 512;
      const perPage = 100;
      const numPages = Math.ceil(Math.min(count, totalStars) / perPage);
      const lastPage = Math.ceil(totalStars / perPage);
      const startPage = Math.max(1, lastPage - numPages + 1);

      const fetchPromises = [];
      for (let page = startPage; page <= lastPage; page++) {
        fetchPromises.push(
          fetch(
            `https://api.github.com/repos/${GITHUB_ORG_REPO}/stargazers?per_page=${perPage}&page=${page}`,
            {
              headers: {
                Accept: "application/vnd.github.v3+json",
                "User-Agent": "Hyprnote-API",
              },
            },
          ),
        );
      }

      const responses = await Promise.all(fetchPromises);
      const allStargazers: { username: string; avatar: string }[] = [];

      for (const response of responses) {
        if (!response.ok) continue;
        const data = await response.json();
        for (const user of data) {
          allStargazers.push({
            username: user.login,
            avatar: user.avatar_url,
          });
        }
      }

      const result = allStargazers.reverse().slice(0, count);

      stargazerCache = {
        data: result,
        timestamp: now,
      };

      return c.json({ stargazers: result }, 200);
    } catch {
      if (stargazerCache) {
        return c.json({ stargazers: stargazerCache.data }, 200);
      }
      return c.json({ error: "Failed to fetch stargazers" }, 500);
    }
  },
);
