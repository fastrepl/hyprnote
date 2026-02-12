import { createClient as createDeepgramClient } from "@deepgram/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { env, requireEnv } from "@/env";
import { getSupabaseServerClient } from "@/functions/supabase";

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

    const deepgram = createDeepgramClient(
      requireEnv(env.DEEPGRAM_API_KEY, "DEEPGRAM_API_KEY"),
    );

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
