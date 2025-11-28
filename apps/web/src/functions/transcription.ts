import { createClient } from "@deepgram/sdk";
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
  llmResult: z.unknown().optional(),
  error: z.string().optional(),
});

export type StatusStateType = z.infer<typeof StatusState>;

type AudioPipeline = {
  run: (input: { userId: string; fileId: string }) => Promise<StatusStateType>;
  getStatus: () => Promise<StatusStateType>;
};

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

    const pipelineId = data.pipelineId ?? crypto.randomUUID();

    try {
      const restateClient = getRestateClient();
      const handle = await restateClient
        .workflowClient<AudioPipeline>({ name: "AudioPipeline" }, pipelineId)
        .workflowSubmit({ userId: userData.user.id, fileId: data.fileId });

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
      const status = await restateClient
        .workflowClient<AudioPipeline>(
          { name: "AudioPipeline" },
          data.pipelineId,
        )
        .getStatus();

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
      const workflowClient = restateClient.workflowClient<AudioPipeline>(
        { name: "AudioPipeline" },
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
