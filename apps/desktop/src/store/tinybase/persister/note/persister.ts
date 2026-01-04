import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import { createSessionDirPersister, getDataDir } from "../utils";
import { collectNoteWriteOps } from "./collect";
import { loadAllNoteData } from "./load";

export function createNotePersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createSessionDirPersister(store, {
    label: "NotePersister",
    collect: collectNoteWriteOps,
    load: async (): Promise<Content<Schemas> | undefined> => {
      try {
        const dataDir = await getDataDir();
        const data = await loadAllNoteData(dataDir);

        // @ts-ignore - update session raw_md for memos
        store.transaction(() => {
          for (const [sessionId, rawMd] of Object.entries(
            data.session_raw_md,
          )) {
            // @ts-ignore
            if (store.hasRow("sessions", sessionId)) {
              // @ts-ignore
              store.setCell("sessions", sessionId, "raw_md", rawMd);
            }
          }
        });

        if (Object.keys(data.enhanced_notes).length === 0) {
          return undefined;
        }

        return [
          { enhanced_notes: data.enhanced_notes },
          {},
        ] as unknown as Content<Schemas>;
      } catch (error) {
        console.error("[NotePersister] load error:", error);
        return undefined;
      }
    },
  });
}
