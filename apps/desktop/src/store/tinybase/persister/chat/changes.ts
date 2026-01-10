import { type ChangedTables, type TablesContent } from "../shared";

export type ChatChangeResult = {
  changedChatGroupIds: Set<string>;
  hasUnresolvedDeletions: boolean;
};

export function parseChatGroupIdFromPath(path: string): string | null {
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
): ChatChangeResult | undefined {
  const changedChatGroupIds = new Set<string>();
  let hasUnresolvedDeletions = false;

  const changedGroups = changedTables.chat_groups;
  if (changedGroups) {
    for (const id of Object.keys(changedGroups)) {
      changedChatGroupIds.add(id);
    }
  }

  const changedMessages = changedTables.chat_messages;
  if (changedMessages) {
    for (const id of Object.keys(changedMessages)) {
      const message = tables.chat_messages?.[id];
      if (message?.chat_group_id) {
        changedChatGroupIds.add(message.chat_group_id);
      } else {
        hasUnresolvedDeletions = true;
      }
    }
  }

  if (changedChatGroupIds.size === 0 && !hasUnresolvedDeletions) {
    return undefined;
  }

  return { changedChatGroupIds, hasUnresolvedDeletions };
}
