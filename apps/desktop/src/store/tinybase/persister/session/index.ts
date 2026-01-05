import { BaseDirectory, exists, mkdir } from "@tauri-apps/plugin-fs";
import * as _UI from "tinybase/ui-react/with-schemas";

import { type Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { createSessionPersister } from "./persister";

export { createSessionPersister } from "./persister";
export type { SessionDataLoad } from "./load";

const { useCreatePersister } = _UI as _UI.WithSchemas<Schemas>;

export function useSessionPersister(store: Store) {
  return useCreatePersister(
    store,
    async (store) => {
      try {
        const dirExists = await exists("hyprnote/sessions", {
          baseDir: BaseDirectory.Data,
        });
        if (!dirExists) {
          await mkdir("hyprnote/sessions", {
            baseDir: BaseDirectory.Data,
            recursive: true,
          });
        }
      } catch (error) {
        console.error("Failed to create sessions directory:", error);
        throw error;
      }

      const persister = createSessionPersister<Schemas>(store as Store);
      await persister.startAutoSave();
      return persister;
    },
    [],
  );
}

