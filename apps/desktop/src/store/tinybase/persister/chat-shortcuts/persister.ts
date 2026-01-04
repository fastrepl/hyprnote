import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { createSingleTablePersister } from "../utils";

export function createChatShortcutPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createSingleTablePersister(store, {
    tableName: "chat_shortcuts",
    filename: "chat_shortcuts.json",
    label: "ChatShortcutPersister",
  });
}
