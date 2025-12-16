import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSupabaseServerClient } from "@/functions/supabase";

export const createUploadUrl = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      fileName: z.string(),
      fileType: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return { error: true as const, message: "Unauthorized" };
    }

    const filePath = `${userData.user.id}/${Date.now()}-${data.fileName}`;

    const { data: signedData, error } = await supabase.storage
      .from("audio-files")
      .createSignedUploadUrl(filePath);

    if (error) {
      return { error: true as const, message: error.message };
    }

    return {
      success: true as const,
      signedUrl: signedData.signedUrl,
      token: signedData.token,
      path: signedData.path,
      fileId: filePath,
    };
  });

export const uploadAudioFile = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      fileName: z.string(),
      fileType: z.string(),
      fileData: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return { error: true as const, message: "Unauthorized" };
    }

    const filePath = `${userData.user.id}/${Date.now()}-${data.fileName}`;
    const fileBuffer = Buffer.from(data.fileData, "base64");

    const { error } = await supabase.storage
      .from("audio-files")
      .upload(filePath, fileBuffer, {
        contentType: data.fileType,
      });

    if (error) {
      return { error: true as const, message: error.message };
    }

    return {
      success: true as const,
      fileId: filePath,
    };
  });
