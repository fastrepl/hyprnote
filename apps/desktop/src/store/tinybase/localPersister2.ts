import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { EnhancedNote } from "./schema-external";

// https://tinybase.org/api/persisters/functions/creation/createcustompersister
export function createLocalPersister2<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  handlePersist: (enhancedNote: EnhancedNote & { id: string }) => Promise<void>,
) {
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
        promises.push(handlePersist(row as EnhancedNote & { id: string }));
      });
      await Promise.all(promises);
    },
    (listener) => setInterval(listener, 1000),
    (interval) => clearInterval(interval),
  );
}
