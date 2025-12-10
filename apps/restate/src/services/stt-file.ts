import * as restate from "@restatedev/restate-sdk-cloudflare-workers/fetch";
import { serde } from "@restatedev/restate-sdk-zod";
import { z } from "zod";

import {
  DeepgramCallback,
  DeepgramCallbackType,
  DeepgramError,
  transcribeWithCallback as transcribeWithDeepgram,
} from "../deepgram";
import { type Env } from "../env";
import {
  fetchTranscript as fetchSonioxTranscript,
  SonioxCallback,
  SonioxCallbackType,
  SonioxError,
  type SonioxTranscriptResponse,
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
            const requestId = await ctx.run("transcribe", async () => {
              try {
                return await transcribeWithSoniox(
                  audioUrl,
                  callbackUrl,
                  env.SONIOX_API_KEY,
                );
              } catch (err) {
                if (err instanceof SonioxError && !err.isRetryable) {
                  throw new restate.TerminalError(err.message);
                }
                throw err;
              }
            });
            ctx.set("providerRequestId", requestId);
          } else {
            const requestId = await ctx.run("transcribe", async () => {
              try {
                return await transcribeWithDeepgram(
                  audioUrl,
                  callbackUrl,
                  env.DEEPGRAM_API_KEY,
                );
              } catch (err) {
                if (err instanceof DeepgramError && !err.isRetryable) {
                  throw new restate.TerminalError(err.message);
                }
                throw err;
              }
            });
            ctx.set("providerRequestId", requestId);
          }

          const providerResponse =
            await ctx.promise<string>("providerResponse");
          ctx.set("providerResponse", providerResponse);
          ctx.set("status", "DONE" as SttStatusType);

          return { status: "DONE" as const, providerResponse };
        } catch (err) {
          const error = err instanceof Error ? err.message : "Unknown error";
          ctx.set("status", "ERROR" as SttStatusType);
          ctx.set("error", error);
          throw err;
        } finally {
          await ctx.run("cleanup", async () => {
            try {
              await deleteFile(env, input.fileId);
            } catch (err) {
              console.error("Failed to delete audio file from storage", {
                fileId: input.fileId,
                error: err instanceof Error ? err.message : String(err),
              });
            }
          });
        }
      },
    ),

    onTranscript: restate.handlers.workflow.shared(
      { input: serde.zod(z.union([DeepgramCallback, SonioxCallback])) },
      async (
        ctx: restate.WorkflowSharedContext,
        payload: DeepgramCallbackType | SonioxCallbackType,
      ): Promise<void> => {
        const existing = await ctx.get<string>("providerResponse");
        if (existing !== undefined) return;

        const provider = await ctx.get<SttProviderType>("provider");

        if (provider === "soniox" && "id" in payload && "status" in payload) {
          const sonioxPayload = payload as SonioxCallbackType;
          if (sonioxPayload.status === "error") {
            ctx
              .promise<string>("providerResponse")
              .reject("Soniox transcription failed");
            return;
          }
          const env = ctx.request().extraArgs[0] as Env;
          const sonioxResponse = await fetchSonioxTranscript(
            sonioxPayload.id,
            env.SONIOX_API_KEY,
          );
          ctx
            .promise<string>("providerResponse")
            .resolve(
              JSON.stringify({ provider: "soniox", data: sonioxResponse }),
            );
        } else {
          ctx
            .promise<string>("providerResponse")
            .resolve(JSON.stringify({ provider: "deepgram", data: payload }));
        }
      },
    ),

    getStatus: restate.handlers.workflow.shared(
      {},
      async (ctx: restate.WorkflowSharedContext) => {
        const status = (await ctx.get<SttStatusType>("status")) ?? "QUEUED";
        const providerResponse = await ctx.get<string>("providerResponse");
        const error = await ctx.get<string>("error");

        return {
          status,
          providerResponse: providerResponse ?? undefined,
          error: error ?? undefined,
        };
      },
    ),
  },
});

export type SttFile = typeof sttFile;
