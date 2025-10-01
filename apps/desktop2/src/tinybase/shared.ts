import { createMergeableStore } from "tinybase/with-schemas";
import { createLocalSynchronizer } from "./localSynchronizer";

export const MergeableStoreOnly = 2;
export const StoreOrMergeableStore = 3;

export const BROADCAST_CHANNEL_NAME = "hypr-window-sync";

export const createMergeableStoreWithSync = () => {
  const store = createMergeableStore();

  const localSync = createLocalSynchronizer(store as any);

  localSync.startSync().then(() => {
    console.log("local_sync_started");
  }).catch((e) => {
    console.error("local_sync_failed", e);
  });

  return store;
};
