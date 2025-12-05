import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi/zod";
import { z } from "zod";

import type { AppBindings } from "../hono-bindings";
import { API_TAGS } from "./constants";

const WebSocketErrorSchema = z.object({
  error: z.string(),
  detail: z.string().optional(),
});

export const stt = new Hono<AppBindings>();

stt.get(
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
    const { listenSocketHandler } = await import("../listen");
    return listenSocketHandler(c, next);
  },
);
