import * as _UI from "tinybase/ui-react/with-schemas";

import type { Schemas, Store } from "../../store/settings";
import { createSettingsPersister } from "./persister";

const { useCreatePersister } = _UI as _UI.WithSchemas<Schemas>;

export function useSettingsPersister(store: Store) {
  return useCreatePersister(
    store,
    async (store) => {
      const persister = createSettingsPersister<Schemas>(store as Store);

      await persister.startAutoPersisting();
      return persister;
    },
    [],
  );
}
