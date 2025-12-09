import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";

import type { AppBindings } from "../hono-bindings";
import { getModels, openai } from "../integration/openrouter";
import { API_TAGS } from "./constants";

const REQUEST_TIMEOUT_MS = 120_000;

const ChatCompletionMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const ToolChoiceSchema = z.union([
  z.enum(["none", "auto", "required"]),
  z.object({
    type: z.literal("function"),
    function: z.object({ name: z.string() }),
  }),
]);

const ChatCompletionRequestSchema = z.looseObject({
  model: z.string().optional(),
  messages: z.array(ChatCompletionMessageSchema),
  tools: z.array(z.unknown()).optional(),
  tool_choice: ToolChoiceSchema.optional(),
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
    const emit = c.get("emit");
    const userId = c.get("supabaseUserId");

    const model = "openrouter/auto";
    const toolChoice = requestBody.tool_choice;
    const needsToolCalling =
      Array.isArray(requestBody.tools) &&
      !(typeof toolChoice === "string" && toolChoice === "none");
    const streaming = requestBody.stream ?? false;

    span?.setAttribute("chat.tool_calling", needsToolCalling);
    span?.setAttribute("chat.streaming", streaming);

    const {
      model: _,
      stream,
      messages,
      tools,
      tool_choice,
      temperature,
      max_tokens,
      ...restBody
    } = requestBody;

    const startTime = performance.now();
    const clientSignal = c.req.raw.signal;
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(
      () => timeoutController.abort(),
      REQUEST_TIMEOUT_MS,
    );

    const signal = AbortSignal.any([clientSignal, timeoutController.signal]);

    try {
      const baseParams = {
        model,
        messages,
        tools,
        tool_choice,
        temperature,
        max_tokens,
        ...restBody,
        models: getModels(needsToolCalling),
        provider: { sort: "latency" },
      } as Parameters<typeof openai.chat.completions.create>[0];

      if (stream) {
        const streamResponse = await openai.chat.completions.create(
          { ...baseParams, stream: true },
          { signal },
        );

        emit({
          type: "llm.request.success",
          userId,
          model,
          durationMs: performance.now() - startTime,
        });

        const encoder = new TextEncoder();
        const streamStartTime = performance.now();
        const iterator = streamResponse[Symbol.asyncIterator]();

        const readableStream = new ReadableStream<Uint8Array>({
          async pull(controller) {
            try {
              const { done, value } = await iterator.next();
              if (done || signal.aborted) {
                if (!signal.aborted) {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  emit({
                    type: "llm.stream.complete",
                    userId,
                    model,
                    durationMs: performance.now() - streamStartTime,
                  });
                }
                controller.close();
                return;
              }
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(value)}\n\n`),
              );
            } catch (error) {
              if (!signal.aborted) {
                emit({
                  type: "llm.request.error",
                  userId,
                  model,
                  error:
                    error instanceof Error ? error : new Error(String(error)),
                  durationMs: performance.now() - streamStartTime,
                });
                const errorEvent = {
                  error: {
                    message:
                      error instanceof Error
                        ? error.message
                        : "Stream processing failed",
                    type: "stream_error",
                  },
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`),
                );
              }
              controller.close();
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
        { ...baseParams, stream: false },
        { signal },
      );

      emit({
        type: "llm.request.success",
        userId,
        model,
        durationMs: performance.now() - startTime,
      });

      return c.json(response, 200);
    } catch (error) {
      if (signal.aborted) {
        const isTimeout = timeoutController.signal.aborted;
        return new Response(
          isTimeout ? "Request timeout" : "Client disconnected",
          { status: isTimeout ? 504 : 499 },
        );
      }

      emit({
        type: "llm.request.error",
        userId,
        model,
        error: error instanceof Error ? error : new Error(String(error)),
        durationMs: performance.now() - startTime,
      });

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  },
);
