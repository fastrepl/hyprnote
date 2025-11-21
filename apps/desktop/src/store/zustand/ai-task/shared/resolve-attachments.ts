import { readFile } from "@tauri-apps/plugin-fs";
import { BaseDirectory, exists } from "@tauri-apps/plugin-fs";
import type { FilePart } from "ai";

import { ATTACHMENT_SIZE_LIMIT } from "../../../../shared/attachments/constants";

type AttachmentReference = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  fileUrl: string;
};

export async function resolveSessionAttachments(
  sessionId: string,
  attachments: AttachmentReference[],
): Promise<Array<FilePart>> {
  const resolved: Array<FilePart> = [];

  for (const attachment of attachments) {
    if (attachment.size > ATTACHMENT_SIZE_LIMIT) {
      console.warn(
        `[resolve-attachments] skipping ${attachment.fileName}: exceeds ${ATTACHMENT_SIZE_LIMIT / 1024 / 1024}MB limit`,
      );
      continue;
    }

    if (!attachment.mimeType.startsWith("image/")) {
      console.warn(
        `[resolve-attachments] skipping ${attachment.fileName}: unsupported type ${attachment.mimeType}`,
      );
      continue;
    }

    try {
      const dataUrl = await readAttachmentAsDataURL(
        sessionId,
        attachment.id,
        attachment.fileName,
        attachment.mimeType,
      );

      if (!dataUrl) {
        console.warn(
          `[resolve-attachments] skipping ${attachment.fileName}: failed to read`,
        );
        continue;
      }

      resolved.push({
        type: "file",
        data: dataUrl,
        mediaType: attachment.mimeType,
      });
    } catch (error) {
      console.error(
        `[resolve-attachments] error reading ${attachment.fileName}:`,
        error,
      );
    }
  }

  return resolved;
}

async function readAttachmentAsDataURL(
  sessionId: string,
  attachmentId: string,
  fileName: string,
  mimeType: string,
): Promise<string | null> {
  const relativePath = `hyprnote/sessions/${sessionId}/attachments/${attachmentId}/${fileName}`;

  const existsOnDisk = await exists(relativePath, {
    baseDir: BaseDirectory.Data,
  });

  if (!existsOnDisk) {
    return null;
  }

  try {
    const fileData = await readFile(relativePath, {
      baseDir: BaseDirectory.Data,
    });

    const base64 = btoa(String.fromCharCode(...new Uint8Array(fileData)));

    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(
      `[resolve-attachments] failed to read ${relativePath}:`,
      error,
    );
    return null;
  }
}
