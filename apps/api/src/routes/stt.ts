import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi/zod";
import { z } from "zod";

import type { AppBindings } from "../hono-bindings";
import { listenSocketHandler } from "../listen";
import { transcribeBatch } from "../stt";
import { API_TAGS } from "./constants";

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

export const stt = new Hono<AppBindings>();

stt.get(
  "/listen",
  describeRoute({
    tags: [API_TAGS.PRIVATE_SKIP_OPENAPI],
    security: [{ Bearer: [] }],
    responses: {
      101: { description: "-" },
      400: { description: "-" },
      401: { description: "-" },
      502: { description: "-" },
      504: { description: "-" },
    },
  }),
  (c, next) => {
    return listenSocketHandler(c, next);
  },
);

stt.post(
  "/transcribe",
  describeRoute({
    tags: [API_TAGS.PRIVATE_SKIP_OPENAPI],
    security: [{ Bearer: [] }],
    responses: {
      200: {
        description: "result",
        content: {
          "application/json": {
            schema: resolver(BatchResponseSchema),
          },
        },
      },
      400: { description: "-" },
      401: { description: "-" },
      500: { description: "-" },
      502: { description: "-" },
    },
  }),
  async (c) => {
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
