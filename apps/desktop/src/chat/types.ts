import type { UIMessage } from "ai";
import { z } from "zod";

export const messageMetadataSchema = z.object({
  createdAt: z.number().optional(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

export type ChatFileReferencePart = {
  type: "chat-file";
  attachmentId: string;
  filename: string;
  mediaType: string;
  size: number;
  fileUrl: string;
};

export type ChatDataParts = {
  "chat-file": ChatFileReferencePart;
};

export type HyprUIMessage = UIMessage<MessageMetadata, ChatDataParts>;
