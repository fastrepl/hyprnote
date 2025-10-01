import { createMergeableStore } from "tinybase";

import { createLocalSynchronizer } from "./localSynchronizer";

export const initTemp = () => {
  const store = createMergeableStore();

  const localSync = createLocalSynchronizer(store);

  localSync.startSync().then(() => {
    console.log("local_sync_started");
  }).catch((e) => {
    console.error("local_sync_failed", e);
  });

  return {
    store,
  };
};
