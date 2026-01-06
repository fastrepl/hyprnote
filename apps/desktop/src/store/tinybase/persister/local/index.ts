import * as _UI from "tinybase/ui-react/with-schemas";

import { type Schemas } from "@hypr/store";

import { DEFAULT_USER_ID } from "../../../../utils";
import type { Store } from "../../store/main";
import { STORE_ID } from "../../store/main";
import { createLocalPersister } from "./persister";

const { useCreatePersister } = _UI as _UI.WithSchemas<Schemas>;

export function useLocalPersister(store: Store) {
  return useCreatePersister(
    store,
    async (store) => {
      const persister = createLocalPersister<Schemas>(store as Store, {
        storeTableName: STORE_ID,
        storeIdColumnName: "id",
      });

      await persister.load();

      const initializer = async (cb: () => void) => {
        store.transaction(() => cb());
        await persister.save();
      };

      void initializer(() => {
        if (!store.hasValue("user_id")) {
          store.setValue("user_id", DEFAULT_USER_ID);
        }

        const userId = store.getValue("user_id") as string;
        if (!store.hasRow("humans", userId)) {
          store.setRow("humans", userId, {
            user_id: userId,
            created_at: new Date().toISOString(),
          });
        }

        if (
          !store.getTableIds().includes("sessions") ||
          store.getRowIds("sessions").length === 0
        ) {
          const sessionId = crypto.randomUUID();
          const now = new Date().toISOString();

          store.setRow("sessions", sessionId, {
            user_id: DEFAULT_USER_ID,
            created_at: now,
            title: "Welcome to Hyprnote",
            raw_md: "",
          });
        }
      });

      await persister.startAutoLoad();
      return persister;
    },
    [],
  );
}
