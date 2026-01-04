import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { createSessionDirPersister } from "../utils";
import { collectTranscriptWriteOps } from "./collect";

export function createTranscriptPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createSessionDirPersister(store, {
    label: "TranscriptPersister",
    collect: collectTranscriptWriteOps,
  });
}
