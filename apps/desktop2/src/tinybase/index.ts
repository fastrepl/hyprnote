import { createMergeableStore } from "tinybase";
import { type DpcTabular } from "tinybase/persisters";

import { createCloudPersister } from "./cloudPersister";
import { createCloudSynchronizer } from "./cloudSynchronizer";
import { createLocalPersister } from "./localPersister";
import { createLocalSynchronizer } from "./localSynchronizer";

export const mainStore = createMergeableStore();

mainStore.setTables({
  notes: {
    "1": { title: "First Note", content: "This is my first note", created_at: new Date().toISOString() },
    "2": { title: "Second Note", content: "Another note here", created_at: new Date().toISOString() },
  },
  users: {
    "1": { name: "John Doe", email: "john@example.com" },
    "2": { name: "Jane Smith", email: "jane@example.com" },
  },
  tasks: {
    "1": { title: "Buy groceries", completed: false, user_id: "1" },
    "2": { title: "Write docs", completed: true, user_id: "1" },
    "3": { title: "Review code", completed: false, user_id: "2" },
  },
});

export const mainTables = {
  load: {
    notes: { tableId: "notes" },
    users: { tableId: "users" },
    tasks: { tableId: "tasks" },
  },
  save: {
    notes: { tableName: "notes" },
    users: { tableName: "users" },
    tasks: { tableName: "tasks" },
  },
} satisfies DpcTabular["tables"];

const mainBroadcastSync = createLocalSynchronizer(mainStore);
const mainCloudSync = createCloudSynchronizer(mainStore);

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

mainCloudSync.startSync().then(() => {
  console.log("cloud_sync_started");
}).catch((e) => {
  console.error("cloud_sync_failed", e);
});
