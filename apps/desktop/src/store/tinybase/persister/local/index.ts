import * as _UI from "tinybase/ui-react/with-schemas";

import { type Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { STORE_ID } from "../../store/main";
import { createLocalPersister } from "./persister";

const { useCreatePersister } = _UI as _UI.WithSchemas<Schemas>;

export function useLocalPersister(store: Store) {
  return useCreatePersister(
    store,
    async (store) => {
      const persister = createLocalPersister(store as Store, {
        storeTableName: STORE_ID,
        storeIdColumnName: "id",
      });

      return persister;
    },
    [],
  );
}
