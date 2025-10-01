import { createMergeableStore } from "tinybase";
import { type DpcTabular } from "tinybase/persisters";
import { createBroadcastChannelSynchronizer } from "tinybase/synchronizers/synchronizer-broadcast-channel";

// import { localPersister } from "./localPersister";

const BROADCAST_CHANNEL_NAME = "hypr-window-sync";

export const mainStore = createMergeableStore();
export const mainTables = {
  load: {},
} satisfies DpcTabular["tables"];

const mainBroadcastSync = createBroadcastChannelSynchronizer(
  mainStore,
  BROADCAST_CHANNEL_NAME,
);

// localPersister.startAutoPersisting().then(() => {
//   console.log("local_persisting_started");
// }).catch((e) => {
//   console.error("local_persisting_failed", e);
// });

mainBroadcastSync.startSync().then(() => {
  console.log("sync_start_success", BROADCAST_CHANNEL_NAME);
}).catch((e) => {
  console.error("sync_start_failed", BROADCAST_CHANNEL_NAME, e);
});
