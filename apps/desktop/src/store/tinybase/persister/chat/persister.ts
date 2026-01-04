import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { createSessionDirPersister } from "../utils";
import { collectChatWriteOps } from "./collect";

export function createChatPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createSessionDirPersister(store, {
    label: "ChatPersister",
    collect: (_store, tables, dataDir) => collectChatWriteOps(tables, dataDir),
  });
}
