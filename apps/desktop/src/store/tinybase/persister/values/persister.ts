import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import { commands } from "../../../../types/tauri.gen";
import { StoreOrMergeableStore } from "../../store/shared";

export function createValuesPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createCustomPersister(
    store,
    async (): Promise<Content<Schemas> | undefined> => {
      const result = await commands.getTinybaseValues();
      if (result.status === "error") {
        console.error("[ValuesPersister] load error:", result.error);
        return undefined;
      }

      if (!result.data) {
        return undefined;
      }

      try {
        const values = JSON.parse(result.data) as Record<string, unknown>;
        return [{}, values] as unknown as Content<Schemas>;
      } catch (e) {
        console.error("[ValuesPersister] parse error:", e);
        return undefined;
      }
    },
    async () => {
      const values = store.getValues();
      const serialized = JSON.stringify(values);

      const result = await commands.setTinybaseValues(serialized);
      if (result.status === "error") {
        console.error("[ValuesPersister] save error:", result.error);
      }
    },
    () => null,
    () => {},
    (error) => console.error("[ValuesPersister]:", error),
    StoreOrMergeableStore,
  );
}
