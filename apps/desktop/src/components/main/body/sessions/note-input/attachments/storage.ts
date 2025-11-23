import { ATTACHMENT_SIZE_LIMIT } from "../../../../../../shared/attachments/constants";
import {
  createAttachmentStorage,
  ManifestCorruptionError,
  type ManifestEntry,
} from "../../../../../../shared/attachments/storage";

export type PersistedAttachment = ManifestEntry & {
  title: string;
  filePath: string;
  fileUrl: string;
};

export { ManifestCorruptionError };

const sessionStorage = createAttachmentStorage<
  ManifestEntry & { title: string }
>({
  getBasePath: (sessionId: string) => `hyprnote/sessions/${sessionId}`,
  entityName: "session",
  maxSize: ATTACHMENT_SIZE_LIMIT,
  includeTitle: true,
});

export async function loadSessionAttachments(
  sessionId: string,
): Promise<PersistedAttachment[]> {
  return await sessionStorage.load(sessionId);
}

export async function saveSessionAttachment(
  sessionId: string,
  file: File,
  attachmentId = crypto.randomUUID(),
): Promise<PersistedAttachment> {
  return await sessionStorage.save(
    sessionId,
    file,
    { title: file.name || file.name || "attachment" },
    attachmentId,
  );
}

export async function removeSessionAttachment(
  sessionId: string,
  attachmentId: string,
) {
  return await sessionStorage.remove(sessionId, attachmentId);
}
