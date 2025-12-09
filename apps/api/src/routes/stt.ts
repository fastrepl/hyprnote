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

const ListenWordSchema = z.object({
  word: z.string(),
  start: z.number(),
  end: z.number(),
  confidence: z.number(),
  speaker: z.number().optional(),
  speaker_confidence: z.number().optional(),
  punctuated_word: z.string().optional(),
});

const ListenSentenceSchema = z.object({
  text: z.string(),
  start: z.number(),
  end: z.number(),
});

const ListenParagraphSchema = z.object({
  sentences: z.array(ListenSentenceSchema),
  speaker: z.number().optional(),
  num_words: z.number().optional(),
  start: z.number(),
  end: z.number(),
});

const ListenParagraphsSchema = z.object({
  transcript: z.string(),
  paragraphs: z.array(ListenParagraphSchema),
});

const ListenAlternativesSchema = z.object({
  transcript: z.string(),
  confidence: z.number(),
  words: z.array(ListenWordSchema),
  paragraphs: ListenParagraphsSchema.optional(),
});

const ListenSearchHitSchema = z.object({
  confidence: z.number(),
  start: z.number(),
  end: z.number(),
  snippet: z.string(),
});

const ListenSearchSchema = z.object({
  query: z.string(),
  hits: z.array(ListenSearchHitSchema),
});

const ListenChannelSchema = z.object({
  search: z.array(ListenSearchSchema).optional(),
  alternatives: z.array(ListenAlternativesSchema),
  detected_language: z.string().optional(),
});

const ListenUtteranceSchema = z.object({
  start: z.number(),
  end: z.number(),
  confidence: z.number(),
  channel: z.number(),
  transcript: z.string(),
  words: z.array(ListenWordSchema),
  speaker: z.number().optional(),
  id: z.string().optional(),
});

const ListenSummarySchema = z.object({
  result: z.string().optional(),
  short: z.string().optional(),
});

const ListenMetadataSchema = z.object({
  transaction_key: z.string().optional(),
  request_id: z.string(),
  sha256: z.string(),
  created: z.string(),
  duration: z.number(),
  channels: z.number(),
  models: z.array(z.string()),
  model_info: z.record(z.unknown()),
});

const ListenResultsSchema = z.object({
  channels: z.array(ListenChannelSchema),
  utterances: z.array(ListenUtteranceSchema).optional(),
  summary: ListenSummarySchema.optional(),
});

const ListenResponseSchema = z.object({
  metadata: ListenMetadataSchema,
  results: ListenResultsSchema,
});

const ListenErrorSchema = z.object({
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
  "/listen",
  describeRoute({
    tags: [API_TAGS.APP],
    summary: "Pre-recorded speech-to-text transcription",
    description:
      "Deepgram-compatible HTTP endpoint for pre-recorded speech-to-text transcription. Accepts raw audio data or JSON with URL. Supports all Deepgram query parameters (model, language, diarize, punctuate, smart_format, utterances, paragraphs, etc.). Requires Supabase authentication.",
    security: [{ Bearer: [] }],
    responses: {
      200: {
        description: "Transcription completed successfully",
        content: {
          "application/json": {
            schema: resolver(ListenResponseSchema),
          },
        },
      },
      400: {
        description: "Bad request - missing or invalid audio data",
        content: {
          "application/json": {
            schema: resolver(ListenErrorSchema),
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
            schema: resolver(ListenErrorSchema),
          },
        },
      },
      502: {
        description: "Upstream STT service error",
        content: {
          "application/json": {
            schema: resolver(ListenErrorSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const { transcribeWithDeepgram } = await import("../stt");

    const emit = c.get("emit");
    const userId = c.get("supabaseUserId");
    const span = c.get("sentrySpan");

    const clientUrl = new URL(c.req.url, "http://localhost");
    const contentType =
      c.req.header("content-type") ?? "application/octet-stream";

    const startTime = performance.now();

    try {
      let body: ArrayBuffer | string;

      if (contentType.includes("application/json")) {
        body = await c.req.text();
      } else {
        body = await c.req.arrayBuffer();
      }

      if (
        (typeof body === "string" && body.length === 0) ||
        (body instanceof ArrayBuffer && body.byteLength === 0)
      ) {
        return c.json(
          { error: "missing_data", detail: "Request body is empty" },
          400,
        );
      }

      const bodySize = typeof body === "string" ? body.length : body.byteLength;
      span?.setAttribute("stt.provider", "deepgram");
      span?.setAttribute("stt.body_size", bodySize);

      const response = await transcribeWithDeepgram(body, contentType, {
        searchParams: clientUrl.searchParams,
      });

      emit({
        type: "stt.listen.success",
        userId,
        provider: "deepgram",
        durationMs: performance.now() - startTime,
      });

      span?.setAttribute("http.status_code", 200);

      return c.json(response, 200);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "unknown error";
      const isUpstreamError = errorMessage.includes("failed:");

      emit({
        type: "stt.listen.error",
        userId,
        provider: "deepgram",
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
