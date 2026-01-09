import * as _UI from "tinybase/ui-react/with-schemas";

import { type Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { createHumanPersister } from "./persister";

const { useCreatePersister } = _UI as _UI.WithSchemas<Schemas>;

export function useHumanPersister(store: Store) {
  return useCreatePersister(
    store,
    async (store) => {
      const persister = createHumanPersister(store as Store);
      await persister.startAutoSave();
      return persister;
    },
    [],
  );
}
