import { PersistedStore } from "tinybase/persisters";
import { createBroadcastChannelSynchronizer } from "tinybase/synchronizers/synchronizer-broadcast-channel";

import { BROADCAST_CHANNEL_NAME, MergeableStoreOnly } from "./const";

export const createLocalSynchronizer = (store: PersistedStore<typeof MergeableStoreOnly>) =>
  createBroadcastChannelSynchronizer(
    store,
    BROADCAST_CHANNEL_NAME,
  );
