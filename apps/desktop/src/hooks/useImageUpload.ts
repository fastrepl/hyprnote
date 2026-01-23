import { convertFileSrc } from "@tauri-apps/api/core";
import { useCallback } from "react";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";

export function useImageUpload(sessionId: string) {
  return useCallback(
    async (file: File): Promise<string> => {
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

      return convertFileSrc(result.data);
    },
    [sessionId],
  );
}
