import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";

import { env } from "../env";
import type { AppBindings } from "../hono-bindings";
import { getModels } from "../integration/openrouter";
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
    const toolChoice = requestBody.tool_choice;
    const needsToolCalling =
      Array.isArray(requestBody.tools) &&
      !(typeof toolChoice === "string" && toolChoice === "none");

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

    const timeoutController = new AbortController();
    const timeoutId = setTimeout(
      () => timeoutController.abort(),
      REQUEST_TIMEOUT_MS,
    );
    const signal = AbortSignal.any([
      c.req.raw.signal,
      timeoutController.signal,
    ]);

    const body = JSON.stringify({
      messages,
      tools,
      tool_choice,
      temperature,
      max_tokens,
      ...restBody,
      stream: stream ?? false,
      models: getModels(needsToolCalling),
      provider: { sort: "latency" },
    });

    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          },
          body,
          signal,
        },
      );

      if (stream) {
        return new Response(response.body, {
          status: response.status,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        });
      }

      return new Response(response.body, {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      if (signal.aborted) {
        const isTimeout = timeoutController.signal.aborted;
        return new Response(
          isTimeout ? "Request timeout" : "Client disconnected",
          { status: isTimeout ? 504 : 499 },
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  },
);
