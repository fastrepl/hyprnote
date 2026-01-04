import * as _UI from "tinybase/ui-react/with-schemas";

import { type Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { createCalendarMdPersister } from "./md-persister";
import { createCalendarPersister } from "./persister";

const { useCreatePersister } = _UI as _UI.WithSchemas<Schemas>;

export function useCalendarPersister(store: Store) {
  return useCreatePersister(
    store,
    async (store) => {
      const persister = createCalendarPersister<Schemas>(store as Store);
      await persister.startAutoSave();
      return persister;
    },
    [],
  );
}

export function useCalendarMdPersister(store: Store) {
  return useCreatePersister(
    store,
    async (store) => {
      const persister = createCalendarMdPersister<Schemas>(store as Store);
      await persister.startAutoSave();
      return persister;
    },
    [],
  );
}
