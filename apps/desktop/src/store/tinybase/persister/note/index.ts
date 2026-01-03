import * as _UI from "tinybase/ui-react/with-schemas";

import { type Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { createNotePersister } from "./persister";

export { createNotePersister } from "./persister";

const { useCreatePersister } = _UI as _UI.WithSchemas<Schemas>;

export function useNotePersister(
  store: Store,
  handleSyncToSession: (sessionId: string, content: string) => void,
) {
  return useCreatePersister(
    store,
    async (store) => {
      const persister = createNotePersister<Schemas>(
        store as Store,
        handleSyncToSession,
      );
      await persister.startAutoSave();
      return persister;
    },
    [],
  );
}
