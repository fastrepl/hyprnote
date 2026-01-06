import * as _UI from "tinybase/ui-react/with-schemas";

import { type Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { createValuesPersister } from "./persister";

const { useCreatePersister } = _UI as _UI.WithSchemas<Schemas>;

export function useValuesPersister(store: Store) {
  return useCreatePersister(
    store,
    async (store) => {
      const persister = createValuesPersister<Schemas>(store as Store);
      await persister.load();
      await persister.startAutoSave();
      return persister;
    },
    [],
  );
}
