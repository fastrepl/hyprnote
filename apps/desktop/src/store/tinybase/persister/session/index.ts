import * as _UI from "tinybase/ui-react/with-schemas";

import { type Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { createSessionPersister } from "./persister";

export { createSessionPersister } from "./persister";
export { collectSessionMeta, type SessionMetaJson } from "./collect";

const { useCreatePersister } = _UI as _UI.WithSchemas<Schemas>;

export function useSessionPersister(store: Store) {
  return useCreatePersister(
    store,
    async (store) => {
      const persister = createSessionPersister<Schemas>(store as Store);
      await persister.startAutoSave();
      return persister;
    },
    [],
  );
}
