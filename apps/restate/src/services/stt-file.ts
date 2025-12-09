import * as restate from "@restatedev/restate-sdk-cloudflare-workers/fetch";
import { serde } from "@restatedev/restate-sdk-zod";
import { z } from "zod";

import {
  DeepgramCallback,
  DeepgramCallbackType,
  extractTranscript,
  transcribeWithCallback as transcribeWithDeepgram,
} from "../deepgram";
import { type Env } from "../env";
import {
  fetchTranscript as fetchSonioxTranscript,
  SonioxCallback,
  SonioxCallbackType,
  transcribeWithCallback as transcribeWithSoniox,
} from "../soniox";
import { createSignedUrl, deleteFile } from "../supabase";
import { limiter } from "./rate-limit";

const SttProvider = z.enum(["deepgram", "soniox"]);

export type SttProviderType = z.infer<typeof SttProvider>;

const SttFileInput = z.object({
  userId: z.string(),
  fileId: z.string(),
  provider: SttProvider.optional().default("deepgram"),
});

export type SttFileInputType = z.infer<typeof SttFileInput>;

const SttStatus = z.enum(["QUEUED", "TRANSCRIBING", "DONE", "ERROR"]);

export type SttStatusType = z.infer<typeof SttStatus>;

export const sttFile = restate.workflow({
  name: "SttFile",
  handlers: {
    run: restate.handlers.workflow.workflow(
      { input: serde.zod(SttFileInput) },
      async (ctx: restate.WorkflowContext, input: SttFileInputType) => {
        ctx.set("status", "QUEUED" as SttStatusType);
        ctx.set("fileId", input.fileId);
        ctx.set("provider", input.provider);

        const env = ctx.request().extraArgs[0] as Env;

        try {
          await limiter(ctx, input.userId).checkAndConsume({
            windowMs: 60_000,
            maxInWindow: 5,
          });

          ctx.set("status", "TRANSCRIBING" as SttStatusType);

          const audioUrl = await ctx.run("signed-url", () =>
            createSignedUrl(env, input.fileId, 3600),
          );

          const callbackUrl = `${env.RESTATE_INGRESS_URL.replace(/\/+$/, "")}/SttFile/${encodeURIComponent(ctx.key)}/onTranscript`;

          if (input.provider === "soniox") {
            ctx.set("sonioxApiKey", env.SONIOX_API_KEY);
            const requestId = await ctx.run("transcribe", () =>
              transcribeWithSoniox(audioUrl, callbackUrl, env.SONIOX_API_KEY),
            );
            ctx.set("providerRequestId", requestId);
          } else {
            const requestId = await ctx.run("transcribe", () =>
              transcribeWithDeepgram(
                audioUrl,
                callbackUrl,
                env.DEEPGRAM_API_KEY,
              ),
            );
            ctx.set("providerRequestId", requestId);
          }

          const transcript = await ctx.promise<string>("transcript");
          ctx.set("transcript", transcript);
          ctx.set("status", "DONE" as SttStatusType);

          return { status: "DONE" as const, transcript };
        } catch (err) {
          const error = err instanceof Error ? err.message : "Unknown error";
          ctx.set("status", "ERROR" as SttStatusType);
          ctx.set("error", error);
          throw err;
        } finally {
          await ctx.run("cleanup", () =>
            deleteFile(env, input.fileId).catch(() => {}),
          );
        }
      },
    ),

    onTranscript: restate.handlers.workflow.shared(
      { input: serde.zod(z.union([DeepgramCallback, SonioxCallback])) },
      async (
        ctx: restate.WorkflowSharedContext,
        payload: DeepgramCallbackType | SonioxCallbackType,
      ): Promise<void> => {
        const existing = await ctx.get<string>("transcript");
        if (existing !== undefined) return;

        const provider = await ctx.get<SttProviderType>("provider");

        if (provider === "soniox" && "id" in payload && "status" in payload) {
          const sonioxPayload = payload as SonioxCallbackType;
          if (sonioxPayload.status === "error") {
            ctx
              .promise<string>("transcript")
              .reject("Soniox transcription failed");
            return;
          }
          const apiKey = await ctx.get<string>("sonioxApiKey");
          if (!apiKey) {
            ctx.promise<string>("transcript").reject("Missing Soniox API key");
            return;
          }
          const transcript = await fetchSonioxTranscript(
            sonioxPayload.id,
            apiKey,
          );
          ctx.promise<string>("transcript").resolve(transcript);
        } else {
          ctx
            .promise<string>("transcript")
            .resolve(extractTranscript(payload as DeepgramCallbackType));
        }
      },
    ),

    getStatus: restate.handlers.workflow.shared(
      {},
      async (ctx: restate.WorkflowSharedContext) => {
        const status = (await ctx.get<SttStatusType>("status")) ?? "QUEUED";
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

export type SttFile = typeof sttFile;
