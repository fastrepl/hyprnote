import * as _UI from "tinybase/ui-react/with-schemas";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import type { Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { initSessionOps } from "./ops";
import { createSessionPersister } from "./persister";
import { startSessionWatcher } from "./watcher";

const { useCreatePersister } = _UI as _UI.WithSchemas<Schemas>;

export function useSessionPersister(store: Store) {
  return useCreatePersister(
    store,
    async (store) => {
      const persister = createSessionPersister(store as Store);
      await persister.startAutoPersisting();

      initSessionOps({
        store: store as Store,
        reloadSessions: async () => {
          await persister.load();
        },
      });

      if (getCurrentWebviewWindowLabel() === "main") {
        void startSessionWatcher(persister);
      }

      return persister;
    },
    [],
  );
}
