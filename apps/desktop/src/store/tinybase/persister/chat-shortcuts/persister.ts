import type { Store } from "../../store/main";
import { createJsonFilePersister } from "../factories";

export function createChatShortcutPersister(store: Store) {
  return createJsonFilePersister(store, {
    tableName: "chat_shortcuts",
    filename: "chat_shortcuts.json",
    label: "ChatShortcutPersister",
  });
}
