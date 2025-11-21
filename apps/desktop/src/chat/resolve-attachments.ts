import type { FileUIPart } from "ai";

import { readChatAttachmentAsDataURL } from "../components/chat/attachments/storage";
import type { HyprUIMessage } from "./types";

export async function resolveChatFileReferences(
  messages: HyprUIMessage[],
  chatGroupId?: string,
): Promise<HyprUIMessage[]> {
  const resolved: HyprUIMessage[] = [];

  for (const message of messages) {
    const resolvedParts = await Promise.all(
      message.parts.map(async (part) => {
        if (part.type === "data-chat-file") {
          if (!chatGroupId) {
            return part;
          }

          const dataUrl = await readChatAttachmentAsDataURL(
            chatGroupId,
            part.data.attachmentId,
          );

          if (!dataUrl) {
            return part;
          }

          return {
            type: "file",
            filename: part.data.filename,
            mediaType: part.data.mediaType,
            url: dataUrl,
          } satisfies FileUIPart;
        }

        if (part.type === "file" && part.url.startsWith("blob:")) {
          return part;
        }

        return part;
      }),
    );

    resolved.push({
      ...message,
      parts: resolvedParts,
    });
  }

  return resolved;
}
