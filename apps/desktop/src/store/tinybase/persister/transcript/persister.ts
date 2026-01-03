import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { createSessionDirPersister, type PersisterMode } from "../utils";
import { collectTranscriptWriteOps } from "./collect";

export function createTranscriptPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  config: { mode: PersisterMode } = { mode: "save-only" },
) {
  return createSessionDirPersister(store, {
    label: "TranscriptPersister",
    mode: config.mode,
    collect: collectTranscriptWriteOps,
  });
}
