import * as _UI from "tinybase/ui-react/with-schemas";

import { type Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { createTemplatePersister } from "./persister";

const { useCreatePersister } = _UI as _UI.WithSchemas<Schemas>;

export function useTemplatePersister(store: Store) {
  return useCreatePersister(
    store,
    async (store) => {
      const persister = createTemplatePersister(store as Store);
      await persister.startAutoPersisting();
      return persister;
    },
    [],
  );
}
