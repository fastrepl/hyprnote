import { TABLE_NAME_MAPPING } from "@hypr/db";
import { createMergeableStore, createQueries, createRelationships } from "tinybase";
import { type DpcTabular } from "tinybase/persisters";

import { createCloudPersister } from "./cloudPersister";
import { createCloudSynchronizer } from "./cloudSynchronizer";
import { createLocalPersister } from "./localPersister";
import { createLocalSynchronizer } from "./localSynchronizer";

export const initMain = () => {
  const store = createMergeableStore();
  const relationships = createRelationships(
    store,
  ).setRelationshipDefinition(
    "sessionUser",
    TABLE_NAME_MAPPING.sessions,
    TABLE_NAME_MAPPING.users,
    "userId",
  );

  const queries = createQueries(store).setQueryDefinition(
    "recentSessions",
    TABLE_NAME_MAPPING.sessions,
    ({ select }) => {
      select("title");
      select("userId");
      select("createdAt");
    },
  );

  const cloudSync = createCloudSynchronizer(store);
  const localSync = createLocalSynchronizer(store);

  const localPersister = createLocalPersister(store);
  const cloudPersister = createCloudPersister(store);

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

  localSync.startSync().then(() => {
    console.log("local_sync_started");
  }).catch((e) => {
    console.error("local_sync_failed", e);
  });

  return {
    store,
    relationships,
    queries,
  };
};

export const mainTables = {
  load: {
    [TABLE_NAME_MAPPING.users]: { tableId: TABLE_NAME_MAPPING.users },
    [TABLE_NAME_MAPPING.sessions]: { tableId: TABLE_NAME_MAPPING.sessions },
  },
  save: {
    [TABLE_NAME_MAPPING.users]: { tableName: TABLE_NAME_MAPPING.users },
    [TABLE_NAME_MAPPING.sessions]: { tableName: TABLE_NAME_MAPPING.sessions },
  },
} satisfies DpcTabular["tables"];
