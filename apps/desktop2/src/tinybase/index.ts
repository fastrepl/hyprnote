import { createMergeableStore, createRelationships } from "tinybase";
import { type DpcTabular } from "tinybase/persisters";

import { TABLE_NAMES } from "@hypr/db";
import { createCloudPersister } from "./cloudPersister";
import { createCloudSynchronizer } from "./cloudSynchronizer";
import { createLocalPersister } from "./localPersister";
import { createLocalSynchronizer } from "./localSynchronizer";

export const mainStore = createMergeableStore();

export const mainTables = {
  load: {
    [TABLE_NAMES.users]: { tableId: TABLE_NAMES.users },
    [TABLE_NAMES.sessions]: { tableId: TABLE_NAMES.sessions },
  },
  save: {
    [TABLE_NAMES.users]: { tableName: TABLE_NAMES.users },
    [TABLE_NAMES.sessions]: { tableName: TABLE_NAMES.sessions },
  },
} satisfies DpcTabular["tables"];

export const mainRelationships = createRelationships(
  mainStore,
).setRelationshipDefinition(
  "sessionUser",
  TABLE_NAMES.sessions,
  TABLE_NAMES.users,
  "userId",
);

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
