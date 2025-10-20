import type { UIMessage } from "ai";
import { z } from "zod";

export const messageMetadataSchema = z.object({
  createdAt: z.number().optional(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;
export type HyprUIMessage = UIMessage<MessageMetadata>;
