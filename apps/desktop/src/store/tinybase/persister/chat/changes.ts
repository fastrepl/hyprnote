import type { Store } from "../../store/main";
import {
  type ChangedTables,
  createDeletionMarker,
  type TablesContent,
} from "../shared";
import type { LoadedChatData } from "./load";

export function createChatDeletionMarker(store: Store) {
  return createDeletionMarker<LoadedChatData>(store, [
    { tableName: "chat_groups", isPrimary: true },
    { tableName: "chat_messages", foreignKey: "chat_group_id" },
  ]);
}

export function parseGroupIdFromPath(path: string): string | null {
  const parts = path.split("/");
  const chatsIndex = parts.indexOf("chats");
  if (chatsIndex === -1 || chatsIndex + 1 >= parts.length) {
    return null;
  }
  return parts[chatsIndex + 1] || null;
}

export function getChangedChatGroupIds(
  tables: TablesContent,
  changedTables: ChangedTables,
): Set<string> | undefined {
  const changedGroupIds = new Set<string>();

  const changedGroups = changedTables.chat_groups;
  if (changedGroups) {
    for (const id of Object.keys(changedGroups)) {
      changedGroupIds.add(id);
    }
  }

  const changedMessages = changedTables.chat_messages;
  if (changedMessages) {
    for (const id of Object.keys(changedMessages)) {
      const message = tables.chat_messages?.[id];
      if (message?.chat_group_id) {
        changedGroupIds.add(message.chat_group_id);
      }
    }
  }

  if (changedGroupIds.size === 0) {
    return undefined;
  }

  return changedGroupIds;
}
