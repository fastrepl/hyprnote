import * as Sentry from "@sentry/bun";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";

import type { AppBindings } from "../hono-bindings";
import { getModels, openai } from "../integration/openrouter";
import { Metrics } from "../metrics";
import { API_TAGS } from "./constants";

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

export const llm = new Hono<AppBindings>();

llm.post(
  "/completions",
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
    const span = c.get("sentrySpan");

    const toolChoice = requestBody.tool_choice;
    const needsToolCalling =
      Array.isArray(requestBody.tools) &&
      !(typeof toolChoice === "string" && toolChoice === "none");

    span?.setAttribute("chat.tool_calling", needsToolCalling);
    span?.setAttribute("chat.streaming", requestBody.stream ?? false);

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
        model: "openrouter/auto",
        messages,
        tools,
        tool_choice,
        temperature,
        max_tokens,
      } as Parameters<typeof openai.chat.completions.create>[0];
      const extraBody = {
        ...restBody,
        models: getModels(needsToolCalling),
        provider: { sort: "latency" },
      };

      if (stream) {
        const streamResponse = await openai.chat.completions.create(
          { ...createParams, stream: true },
          { body: extraBody },
        );

        Metrics.upstreamLatency("openrouter", performance.now() - startTime);

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
              Metrics.chatCompletion(true, 200);
            } catch (error) {
              Metrics.chatCompletion(true, 500);
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

      return c.json(response, 200);
    } catch (error) {
      console.error(error);
      Metrics.upstreamLatency("openrouter", performance.now() - startTime);
      const isAPIError =
        error instanceof Error &&
        "status" in error &&
        typeof (error as { status?: number }).status === "number";
      const status = isAPIError ? (error as { status: number }).status : 500;
      Metrics.chatCompletion(stream ?? false, status);
      throw error;
    }
  },
);
