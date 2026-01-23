import { convertFileSrc } from "@tauri-apps/api/core";
import { useCallback } from "react";

import {
  type AttachmentSaveResult,
  commands as fsSyncCommands,
} from "@hypr/plugin-fs-sync";

export type ImageUploadResult = AttachmentSaveResult & {
  url: string;
};

export function useImageUpload(sessionId: string) {
  return useCallback(
    async (file: File): Promise<ImageUploadResult> => {
      const parts = file.name.split(".");
      const extension = parts.length > 1 ? parts.pop() || "png" : "png";
      const arrayBuffer = await file.arrayBuffer();
      const data = Array.from(new Uint8Array(arrayBuffer));

      const result = await fsSyncCommands.attachmentSave(
        sessionId,
        data,
        extension,
      );

      if (result.status === "error") {
        throw new Error(result.error);
      }

      const { path, attachmentId } = result.data;
      return { path, attachmentId, url: convertFileSrc(path) };
    },
    [sessionId],
  );
}
