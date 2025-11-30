import { createClient } from "@deepgram/sdk";
import type { IngressWorkflowClient } from "@restatedev/restate-sdk-clients";
import * as clients from "@restatedev/restate-sdk-clients";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { env } from "@/env";
import { getSupabaseServerClient } from "@/functions/supabase";

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
  llmResult: z.string().optional(),
  error: z.string().optional(),
});

export type StatusStateType = z.infer<typeof StatusState>;

type SttFileInput = {
  userId: string;
  fileId: string;
};

// Workflow definition type matching the server-side handler signatures.
// The first parameter (ctx) is the Restate context, which is stripped by IngressWorkflowClient.
type SttFileDefinition = {
  run: (ctx: unknown, input: SttFileInput) => Promise<StatusStateType>;
  getStatus: (ctx: unknown) => Promise<StatusStateType>;
};

// Client type with workflowSubmit, workflowAttach, and other client methods
type SttFileClient = IngressWorkflowClient<SttFileDefinition>;

function getRestateClient() {
  return clients.connect({ url: env.RESTATE_INGRESS_URL });
}

export const startAudioPipeline = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      fileId: z.string(),
      pipelineId: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return { error: true, message: "Unauthorized" };
    }

    const userId = userData.user.id;

    // Validate fileId belongs to the authenticated user
    // fileId format: {userId}/{timestamp}-{fileName}
    const segments = data.fileId.split("/").filter(Boolean);
    const [ownerId, ...rest] = segments;

    if (
      !ownerId ||
      ownerId !== userId ||
      rest.length === 0 ||
      rest.some((s) => s === "." || s === "..")
    ) {
      return { error: true, message: "Invalid fileId" };
    }

    const safeFileId = `${userId}/${rest.join("/")}`;
    const pipelineId = data.pipelineId ?? crypto.randomUUID();

    try {
      const restateClient = getRestateClient();
      const workflowClient: SttFileClient =
        restateClient.workflowClient<SttFileDefinition>(
          { name: "SttFile" },
          pipelineId,
        );
      const handle = await workflowClient.workflowSubmit({
        userId,
        fileId: safeFileId,
      });

      return {
        success: true,
        pipelineId,
        invocationId: handle.invocationId,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return { error: true, message: errorMessage };
    }
  });

export const getAudioPipelineStatus = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      pipelineId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return { error: true, message: "Unauthorized" };
    }

    try {
      const restateClient = getRestateClient();
      const workflowClient: SttFileClient =
        restateClient.workflowClient<SttFileDefinition>(
          { name: "SttFile" },
          data.pipelineId,
        );
      const status = await workflowClient.getStatus();

      return {
        success: true,
        status,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return { error: true, message: errorMessage };
    }
  });

export const getAudioPipelineResult = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      pipelineId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return { error: true, message: "Unauthorized" };
    }

    try {
      const restateClient = getRestateClient();
      const workflowClient: SttFileClient =
        restateClient.workflowClient<SttFileDefinition>(
          { name: "SttFile" },
          data.pipelineId,
        );

      const result = await workflowClient.workflowAttach();

      return {
        success: true,
        result,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return { error: true, message: errorMessage };
    }
  });

export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      audioUrl: z.string(),
      fileName: z.string(),
      fileSize: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return { error: true, message: "Unauthorized" };
    }

    const deepgram = createClient(env.DEEPGRAM_API_KEY);

    const transcriptionRecord = await supabase
      .from("transcriptions")
      .insert({
        user_id: userData.user.id,
        file_name: data.fileName,
        file_size: data.fileSize,
        status: "processing",
        progress: 0,
      })
      .select()
      .single();

    if (transcriptionRecord.error) {
      return { error: true, message: transcriptionRecord.error.message };
    }

    try {
      const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
        {
          url: data.audioUrl,
        },
        {
          model: "nova-2",
          smart_format: true,
        },
      );

      if (error) {
        await supabase
          .from("transcriptions")
          .update({
            status: "failed",
            error: error.message,
            updated_at: new Date().toISOString(),
          })
          .eq("id", transcriptionRecord.data.id);

        return { error: true, message: error.message };
      }

      const transcript =
        result.results.channels[0].alternatives[0].transcript || "";

      await supabase
        .from("transcriptions")
        .update({
          status: "completed",
          progress: 100,
          transcript,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transcriptionRecord.data.id);

      return {
        success: true,
        transcriptionId: transcriptionRecord.data.id,
        transcript,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      await supabase
        .from("transcriptions")
        .update({
          status: "failed",
          error: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transcriptionRecord.data.id);

      return { error: true, message: errorMessage };
    }
  });

export const getTranscription = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return { error: true, message: "Unauthorized" };
    }

    const { data: transcription, error } = await supabase
      .from("transcriptions")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userData.user.id)
      .single();

    if (error) {
      return { error: true, message: error.message };
    }

    return { success: true, transcription };
  });
