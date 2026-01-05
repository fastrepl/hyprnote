import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { createJsonFilePersister } from "../utils";

export function createChatShortcutPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createJsonFilePersister(store, {
    tableName: "chat_shortcuts",
    filename: "chat_shortcuts.json",
    label: "ChatShortcutPersister",
  });
}
