import { ATTACHMENT_SIZE_LIMIT } from "../../../shared/attachments/constants";
import {
  createAttachmentStorage,
  ManifestCorruptionError,
  type ManifestEntry,
} from "../../../shared/attachments/storage";

export type PersistedChatAttachment = ManifestEntry & {
  filePath: string;
  fileUrl: string;
};

export { ManifestCorruptionError };

const chatStorage = createAttachmentStorage<ManifestEntry>({
  getBasePath: (groupId: string) => `hyprnote/chat/${groupId}`,
  entityName: "chat group",
  maxSize: ATTACHMENT_SIZE_LIMIT,
  includeTitle: false,
});

export async function loadChatAttachments(
  groupId: string,
): Promise<PersistedChatAttachment[]> {
  return await chatStorage.load(groupId);
}

export async function saveChatAttachment(
  groupId: string,
  file: File,
  attachmentId = crypto.randomUUID(),
): Promise<PersistedChatAttachment> {
  return await chatStorage.save(groupId, file, {}, attachmentId);
}

export async function removeChatAttachment(
  groupId: string,
  attachmentId: string,
) {
  return await chatStorage.remove(groupId, attachmentId);
}

export async function removeChatGroupAttachments(groupId: string) {
  return await chatStorage.removeAll(groupId);
}

export async function readChatAttachmentAsDataURL(
  groupId: string,
  attachmentId: string,
): Promise<string | null> {
  return await chatStorage.readAsDataURL(groupId, attachmentId);
}
