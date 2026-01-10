import type { TablesContent } from "../shared";

export function getValidChatGroupIds(tables: TablesContent): Set<string> {
  return new Set(Object.keys(tables.chat_groups ?? {}));
}
