import { CallbackUrl, createClient } from "@deepgram/sdk";
import * as restate from "@restatedev/restate-sdk-cloudflare-workers/fetch";
import { serde } from "@restatedev/restate-sdk-zod";
import { z } from "zod";

import { type Env } from "./env";
import { limiter } from "./services/rate-limit";
import { createSignedUrl, deleteFile } from "./supabase";

const StartAudioPipeline = z.object({
  userId: z.string(),
  fileId: z.string(),
});

export type StartAudioPipelineInput = z.infer<typeof StartAudioPipeline>;

const PipelineStatus = z.enum(["QUEUED", "TRANSCRIBING", "DONE", "ERROR"]);

export type PipelineStatusType = z.infer<typeof PipelineStatus>;

const StatusState = z.object({
  status: PipelineStatus,
  transcript: z.string().optional(),
  error: z.string().optional(),
});

export type StatusStateType = z.infer<typeof StatusState>;

const DeepgramCallback = z.object({
  results: z
    .object({
      channels: z
        .array(
          z.object({
            alternatives: z
              .array(z.object({ transcript: z.string() }))
              .optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  channel: z
    .object({
      alternatives: z.array(z.object({ transcript: z.string() })).optional(),
    })
    .optional(),
});

export type DeepgramCallbackType = z.infer<typeof DeepgramCallback>;

async function transcribe(
  audioUrl: string,
  callbackUrl: string,
  apiKey: string,
): Promise<string> {
  const client = createClient(apiKey);
  const { result, error } =
    await client.listen.prerecorded.transcribeUrlCallback(
      { url: audioUrl },
      new CallbackUrl(callbackUrl),
      { model: "nova-3", smart_format: true },
    );

  if (error) throw new Error(`Deepgram: ${error.message}`);
  if (!result?.request_id) throw new Error("Deepgram: missing request_id");

  return result.request_id;
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
        ctx.set("fileId", req.fileId);

        const env = ctx.request().extraArgs[0] as Env;

        try {
          await limiter(ctx, req.userId).checkAndConsume({
            windowMs: 60_000,
            maxInWindow: 5,
          });

          ctx.set("status", "TRANSCRIBING" as PipelineStatusType);

          const audioUrl = await ctx.run("signed-url", () =>
            createSignedUrl(env, req.fileId, 3600),
          );

          const callbackUrl = `${env.RESTATE_INGRESS_URL.replace(/\/+$/, "")}/AudioPipeline/${encodeURIComponent(ctx.key)}/onDeepgramResult`;

          const requestId = await ctx.run("transcribe", () =>
            transcribe(audioUrl, callbackUrl, env.DEEPGRAM_API_KEY),
          );
          ctx.set("deepgramRequestId", requestId);

          const transcript = await ctx.promise<string>("deepgram-result");
          ctx.set("transcript", transcript);
          ctx.set("status", "DONE" as PipelineStatusType);

          return { status: "DONE", transcript };
        } catch (err) {
          const error = err instanceof Error ? err.message : "Unknown error";
          ctx.set("status", "ERROR" as PipelineStatusType);
          ctx.set("error", error);
          throw err;
        } finally {
          await ctx.run("cleanup", () =>
            deleteFile(env, req.fileId).catch(() => {}),
          );
        }
      },
    ),

    onDeepgramResult: restate.handlers.workflow.shared(
      { input: serde.zod(DeepgramCallback) },
      async (
        ctx: restate.WorkflowSharedContext,
        payload: DeepgramCallbackType,
      ): Promise<void> => {
        const existing = await ctx.get<string>("transcript");
        if (existing !== undefined) return;

        const transcript =
          payload.results?.channels?.[0]?.alternatives?.[0]?.transcript ??
          payload.channel?.alternatives?.[0]?.transcript ??
          "";

        ctx.promise<string>("deepgram-result").resolve(transcript);
      },
    ),

    getStatus: restate.handlers.workflow.shared(
      {},
      async (ctx: restate.WorkflowSharedContext): Promise<StatusStateType> => {
        const status =
          (await ctx.get<PipelineStatusType>("status")) ?? "QUEUED";
        const transcript = await ctx.get<string>("transcript");
        const error = await ctx.get<string>("error");

        return {
          status,
          transcript: transcript ?? undefined,
          error: error ?? undefined,
        };
      },
    ),
  },
});

export type AudioPipeline = typeof audioPipeline;
