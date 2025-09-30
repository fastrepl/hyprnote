import { createMergeableStore } from "tinybase";
import { type DpcTabular } from "tinybase/persisters";

import { createCloudPersister } from "./cloudPersister";
import { createCloudSynchronizer } from "./cloudSynchronizer";
import { createLocalPersister } from "./localPersister";
import { createLocalSynchronizer } from "./localSynchronizer";

export const mainStore = createMergeableStore();

export const mainTables = {
  load: {
    users: { tableId: "users" },
  },
  save: {
    users: { tableName: "users" },
  },
} satisfies DpcTabular["tables"];

export const mainCloudSync = createCloudSynchronizer(mainStore);
const mainBroadcastSync = createLocalSynchronizer(mainStore);

const localPersister = createLocalPersister(mainStore);
const cloudPersister = createCloudPersister(mainStore);

localPersister.startAutoPersisting().then(() => {
  console.log("local_persisting_started");
}).catch((e) => {
  console.error("local_persisting_failed", e);
});

cloudPersister.startAutoPersisting().then(() => {
  console.log("cloud_persisting_started");
}).catch((e) => {
  console.error("cloud_persisting_failed", e);
});

mainBroadcastSync.startSync().then(() => {
  console.log("broadcast_sync_started");
}).catch((e) => {
  console.error("broadcast_sync_failed", e);
});
