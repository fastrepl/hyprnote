import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSupabaseServerClient } from "@/functions/supabase";

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
      return { error: true, message: "Unauthorized" };
    }

    const buffer = Buffer.from(data.fileData, "base64");
    const filePath = `${userData.user.id}/${Date.now()}-${data.fileName}`;

    const { data: uploadData, error } = await supabase.storage
      .from("audio-files")
      .upload(filePath, buffer, {
        contentType: data.fileType,
        upsert: false,
      });

    if (error) {
      return { error: true, message: error.message };
    }

    return { success: true, fileId: uploadData.path };
  });
