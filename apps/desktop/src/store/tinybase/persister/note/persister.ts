import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { createSessionDirPersister, type PersisterMode } from "../utils";
import { collectNoteWriteOps } from "./collect";

export function createNotePersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  handleSyncToSession: (sessionId: string, content: string) => void,
  config: { mode: PersisterMode } = { mode: "save-only" },
) {
  return createSessionDirPersister(store, {
    label: "NotePersister",
    mode: config.mode,
    collect: (store, tables, dataDir) =>
      collectNoteWriteOps(store, tables, dataDir, handleSyncToSession),
  });
}
