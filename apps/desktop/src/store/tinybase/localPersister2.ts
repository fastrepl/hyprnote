import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { type EnhancedNote } from "@hypr/store";

export function createLocalPersister2<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  handlePersistEnhancedNote: (
    enhancedNote: EnhancedNote & { id: string },
    filename: string,
  ) => Promise<void>,
  handleSyncToSession: (sessionId: string, content: string) => void,
) {
  // https://tinybase.org/api/persisters/functions/creation/createcustompersister
  return createCustomPersister(
    store,
    async () => {
      return undefined;
    },
    async (getContent, _changes) => {
      const [tables, _values] = getContent();

      const promises: Promise<void>[] = [];
      Object.entries(tables?.enhanced_notes ?? {}).forEach(([id, row]) => {
        // @ts-ignore
        row.id = id;
        const enhancedNote = row as EnhancedNote & { id: string };

        let filename: string;
        if (enhancedNote.template_id) {
          // @ts-ignore
          const templateTitle = store.getCell(
            "templates",
            enhancedNote.template_id,
            "title",
          ) as string | undefined;
          const safeName = sanitizeFilename(
            templateTitle || enhancedNote.template_id,
          );
          filename = `${safeName}.md`;
        } else {
          filename = "_summary.md";
          if (enhancedNote.session_id) {
            handleSyncToSession(enhancedNote.session_id, enhancedNote.content);
          }
        }

        promises.push(handlePersistEnhancedNote(enhancedNote, filename));
      });
      await Promise.all(promises);
    },
    (listener) => setInterval(listener, 1000),
    (interval) => clearInterval(interval),
  );
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}
