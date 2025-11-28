import { CallbackUrl, createClient } from "@deepgram/sdk";
import * as restate from "@restatedev/restate-sdk-cloudflare-workers";
import { serde } from "@restatedev/restate-sdk-zod";
import { z } from "zod";

import { limiterForUser } from "./userRateLimiter.js";

const StartAudioPipeline = z.object({
  userId: z.string(),
  audioUrl: z.string(),
});

export type StartAudioPipelineInput = z.infer<typeof StartAudioPipeline>;

const PipelineStatus = z.enum([
  "QUEUED",
  "TRANSCRIBING",
  "TRANSCRIBED",
  "LLM_RUNNING",
  "DONE",
  "ERROR",
]);

export type PipelineStatusType = z.infer<typeof PipelineStatus>;

const StatusState = z.object({
  status: PipelineStatus,
  transcript: z.string().optional(),
  llmResult: z.unknown().optional(),
  error: z.string().optional(),
});

export type StatusStateType = z.infer<typeof StatusState>;

const DeepgramCallbackPayload = z.object({
  metadata: z
    .object({
      request_id: z.string().optional(),
    })
    .optional(),
  results: z
    .object({
      channels: z
        .array(
          z.object({
            alternatives: z
              .array(
                z.object({
                  transcript: z.string(),
                  confidence: z.number().optional(),
                }),
              )
              .optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  channel: z
    .object({
      alternatives: z
        .array(
          z.object({
            transcript: z.string(),
            confidence: z.number().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});

export type DeepgramCallbackPayloadType = z.infer<
  typeof DeepgramCallbackPayload
>;

async function callDeepgram(
  audioUrl: string,
  callbackUrl: string,
  apiKey: string,
): Promise<string> {
  const deepgram = createClient(apiKey);

  const { result, error } =
    await deepgram.listen.prerecorded.transcribeUrlCallback(
      { url: audioUrl },
      new CallbackUrl(callbackUrl),
      { model: "nova-3", smart_format: true },
    );

  if (error) {
    throw new Error(`Deepgram error: ${error.message}`);
  }

  if (!result?.request_id) {
    throw new Error("Deepgram response missing request_id");
  }

  return result.request_id;
}

async function callLLM(
  transcript: string,
  userId: string,
  apiUrl: string,
  apiKey?: string,
): Promise<unknown> {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      user_id: userId,
      input: transcript,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM error ${res.status}: ${body}`);
  }

  return res.json();
}

export const audioPipeline = restate.workflow({
  name: "AudioPipeline",
  handlers: {
    run: restate.handlers.workflow.workflow(
      { input: serde.zod(StartAudioPipeline) },
      async (
        ctx: restate.WorkflowContext,
        req: StartAudioPipelineInput,
      ): Promise<StatusStateType> => {
        ctx.set("status", "QUEUED" as PipelineStatusType);

        try {
          const limiter = limiterForUser(ctx, req.userId);
          await limiter.checkAndConsume({
            windowMs: 60_000,
            maxInWindow: 5,
          });

          ctx.set("status", "TRANSCRIBING" as PipelineStatusType);
          ctx.set("userId", req.userId);
          ctx.set("audioUrl", req.audioUrl);

          const ingressBase = (
            ctx as unknown as { env?: { RESTATE_INGRESS_URL?: string } }
          ).env?.RESTATE_INGRESS_URL;
          if (!ingressBase) {
            throw new restate.TerminalError(
              "RESTATE_INGRESS_URL env var is required for callback URL",
            );
          }

          const deepgramApiKey = (
            ctx as unknown as { env?: { DEEPGRAM_API_KEY?: string } }
          ).env?.DEEPGRAM_API_KEY;
          if (!deepgramApiKey) {
            throw new restate.TerminalError(
              "DEEPGRAM_API_KEY env var is required",
            );
          }

          const pipelineId = ctx.key;
          const callbackUrl = `${ingressBase.replace(/\/+$/, "")}/AudioPipeline/${encodeURIComponent(pipelineId)}/onDeepgramResult`;

          const requestId = await ctx.run("deepgram", () =>
            callDeepgram(req.audioUrl, callbackUrl, deepgramApiKey),
          );
          ctx.set("deepgramRequestId", requestId);

          const transcript = await ctx.promise<string>("deepgram-result");
          ctx.set("transcript", transcript);
          ctx.set("status", "TRANSCRIBED" as PipelineStatusType);

          ctx.set("status", "LLM_RUNNING" as PipelineStatusType);

          const llmApiUrl = (
            ctx as unknown as { env?: { LLM_API_URL?: string } }
          ).env?.LLM_API_URL;
          if (!llmApiUrl) {
            throw new restate.TerminalError("LLM_API_URL env var is required");
          }

          const llmApiKey = (
            ctx as unknown as { env?: { LLM_API_KEY?: string } }
          ).env?.LLM_API_KEY;

          const llmResult = await ctx.run("llm", () =>
            callLLM(transcript, req.userId, llmApiUrl, llmApiKey),
          );

          ctx.set("llmResult", llmResult);
          ctx.set("status", "DONE" as PipelineStatusType);

          return {
            status: "DONE",
            transcript,
            llmResult,
          };
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Unknown error in AudioPipeline";

          ctx.set("status", "ERROR" as PipelineStatusType);
          ctx.set("error", message);

          throw err;
        }
      },
    ),

    onDeepgramResult: restate.handlers.workflow.shared(
      { input: serde.zod(DeepgramCallbackPayload) },
      async (
        ctx: restate.WorkflowSharedContext,
        payload: DeepgramCallbackPayloadType,
      ): Promise<void> => {
        const existingTranscript = await ctx.get<string>("transcript");
        if (existingTranscript) {
          return;
        }

        const fromResults =
          payload.results?.channels?.[0]?.alternatives?.[0]?.transcript;
        const fromChannel = payload.channel?.alternatives?.[0]?.transcript;

        const transcript = fromResults ?? fromChannel ?? "";

        ctx.promise<string>("deepgram-result").resolve(transcript);
      },
    ),

    getStatus: restate.handlers.workflow.shared(
      {},
      async (ctx: restate.WorkflowSharedContext): Promise<StatusStateType> => {
        const status =
          (await ctx.get<PipelineStatusType>("status")) ?? "QUEUED";
        const transcript = await ctx.get<string>("transcript");
        const llmResult = await ctx.get<unknown>("llmResult");
        const error = await ctx.get<string>("error");

        return {
          status,
          transcript: transcript ?? undefined,
          llmResult,
          error: error ?? undefined,
        };
      },
    ),
  },
});

export type AudioPipeline = typeof audioPipeline;
