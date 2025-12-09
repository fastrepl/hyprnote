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

stt.post(
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
    const { transcribeBatch } = await import("../stt");
    type BatchProvider = "deepgram" | "assemblyai" | "soniox";

    const emit = c.get("emit");
    const userId = c.get("supabaseUserId");
    const span = c.get("sentrySpan");

    const clientUrl = new URL(c.req.url, "http://localhost");
    const provider =
      (clientUrl.searchParams.get("provider") as BatchProvider) ?? "deepgram";

    const languages = clientUrl.searchParams.getAll("language");
    const keywords = clientUrl.searchParams.getAll("keyword");
    const model = clientUrl.searchParams.get("model") ?? undefined;

    const contentType =
      c.req.header("content-type") ?? "application/octet-stream";

    const startTime = performance.now();

    try {
      const audioData = await c.req.arrayBuffer();

      if (!audioData || audioData.byteLength === 0) {
        return c.json(
          { error: "missing_audio_data", detail: "Request body is empty" },
          400,
        );
      }

      span?.setAttribute("stt.provider", provider);
      span?.setAttribute("stt.audio_size", audioData.byteLength);

      const response = await transcribeBatch(provider, audioData, contentType, {
        languages,
        keywords,
        model,
      });

      emit({
        type: "stt.batch.success",
        userId,
        provider,
        durationMs: performance.now() - startTime,
      });

      span?.setAttribute("http.status_code", 200);

      return c.json(response, 200);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "unknown error";
      const isUpstreamError = errorMessage.includes("failed:");

      emit({
        type: "stt.batch.error",
        userId,
        provider,
        error: error instanceof Error ? error : new Error(String(error)),
        durationMs: performance.now() - startTime,
      });

      span?.setAttribute("http.status_code", isUpstreamError ? 502 : 500);

      return c.json(
        { error: "transcription_failed", detail: errorMessage },
        isUpstreamError ? 502 : 500,
      );
    }
  },
);
