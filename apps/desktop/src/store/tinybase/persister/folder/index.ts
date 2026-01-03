import * as _UI from "tinybase/ui-react/with-schemas";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { type Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { initFolderOps } from "./ops";
import { createFolderPersister, startFolderWatcher } from "./persister";

export { createFolderPersister, startFolderWatcher } from "./persister";
export {
  createFolder,
  deleteFolder,
  folderOps,
  initFolderOps,
  moveSessionToFolder,
  renameFolder,
} from "./ops";

const { useCreatePersister } = _UI as _UI.WithSchemas<Schemas>;

export function useFolderPersister(store: Store) {
  return useCreatePersister(
    store,
    async (store) => {
      const persister = createFolderPersister<Schemas>(store as Store);
      await persister.load();
      await persister.startAutoLoad();

      initFolderOps({
        store: store as Store,
        reloadFolders: async () => {
          await persister.load();
        },
      });

      if (getCurrentWebviewWindowLabel() === "main") {
        void startFolderWatcher(persister);
      }

      return persister;
    },
    [],
  );
}
