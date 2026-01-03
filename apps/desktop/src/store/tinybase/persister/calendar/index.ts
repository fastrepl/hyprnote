import * as _UI from "tinybase/ui-react/with-schemas";

import { type Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { createCalendarPersister } from "./persister";

const { useCreatePersister } = _UI as _UI.WithSchemas<Schemas>;

export function useCalendarPersister(store: Store, persist: boolean) {
  return useCreatePersister(
    store,
    async (store) => {
      if (!persist) {
        return undefined;
      }

      const persister = createCalendarPersister<Schemas>(store as Store);
      await persister.startAutoSave();
      return persister;
    },
    [persist],
  );
}
