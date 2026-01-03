import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { createSessionDirPersister } from "../utils";
import { collectNoteWriteOps } from "./collect";

export function createNotePersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  handleSyncToSession: (sessionId: string, content: string) => void,
) {
  return createSessionDirPersister(store, {
    label: "NotePersister",
    collect: (store, tables, dataDir) =>
      collectNoteWriteOps(store, tables, dataDir, handleSyncToSession),
  });
}
