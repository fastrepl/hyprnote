import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { createSessionDirPersister } from "../utils";
import { collectNoteWriteOps } from "./collect";

export function createNotePersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createSessionDirPersister(store, {
    label: "NotePersister",
    collect: collectNoteWriteOps,
  });
}
