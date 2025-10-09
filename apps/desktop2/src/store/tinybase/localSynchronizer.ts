import { createBroadcastChannelSynchronizer } from "tinybase/synchronizers/synchronizer-broadcast-channel/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { BROADCAST_CHANNEL_NAME } from "./shared";

export const createLocalSynchronizer = <Schemas extends OptionalSchemas>(store: MergeableStore<Schemas>) =>
  createBroadcastChannelSynchronizer(
    store,
    BROADCAST_CHANNEL_NAME,
  );
