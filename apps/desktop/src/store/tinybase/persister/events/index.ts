import * as _UI from "tinybase/ui-react/with-schemas";

import { type Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { createEventMdPersister } from "./md-persister";
import { createEventPersister } from "./persister";

const { useCreatePersister } = _UI as _UI.WithSchemas<Schemas>;

export function useEventsPersister(store: Store) {
  return useCreatePersister(
    store,
    async (store) => {
      const persister = createEventPersister<Schemas>(store as Store);
      await persister.startAutoSave();
      return persister;
    },
    [],
  );
}

export function useEventsMdPersister(store: Store) {
  return useCreatePersister(
    store,
    async (store) => {
      const persister = createEventMdPersister<Schemas>(store as Store);
      await persister.startAutoSave();
      return persister;
    },
    [],
  );
}
