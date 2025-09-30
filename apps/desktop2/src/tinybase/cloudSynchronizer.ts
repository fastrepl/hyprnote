import { type ChangeMessage, type Message, type Offset, ShapeStream } from "@electric-sql/client";
import { type PersistedStore } from "tinybase/persisters";

import { MergeableStoreOnly } from "./const";

const ELECTRIC_URL = "http://localhost:3001/v1/shape";

const TABLES = ["users"] as const;

export const createCloudSynchronizer = (
  store: PersistedStore<typeof MergeableStoreOnly>,
) => {
  const streams = new Map<string, ShapeStream>();
  const cleanupFns = new Map<string, () => void>();

  const getStoredOffset = (table: string): Offset | undefined => {
    const offsetValue = store.getValue(`_electric_offset_${table}`);
    if (!offsetValue || typeof offsetValue !== "string") {
      return undefined;
    }
    try {
      return BigInt(offsetValue) as unknown as Offset;
    } catch {
      return undefined;
    }
  };

  const getStoredHandle = (table: string): string | undefined => {
    const handleValue = store.getValue(`_electric_handle_${table}`);
    return typeof handleValue === "string" ? handleValue : undefined;
  };

  const setStoredOffset = (table: string, offset: Offset) => {
    store.setValue(`_electric_offset_${table}`, String(offset));
  };

  const setStoredHandle = (table: string, handle: string) => {
    store.setValue(`_electric_handle_${table}`, handle);
  };

  const syncTable = (table: string) => {
    const storedOffset = getStoredOffset(table);
    const storedHandle = getStoredHandle(table);

    const stream = new ShapeStream({
      url: ELECTRIC_URL,
      params: {
        table,
        // where: "user_id=1",
      },
      offset: storedOffset,
      // handle: storedHandle,
      subscribe: false,
      fetchClient: fetch,
      onError: console.error,
    });
    streams.set(table, stream);

    const unsubscribe = stream.subscribe(
      (messages: Message[]) => {
        console.log("Received messages:", messages);

        for (const msg of messages) {
          if ("control" in msg.headers) {
            console.log("control message:", msg);
          } else {
            console.log("data message:", msg);
          }
        }
      },
      console.error,
    );

    cleanupFns.set(table, unsubscribe);
  };

  const sync = async () => {
    for (const table of TABLES) {
      syncTable(table);
    }
  };

  return {
    sync,
  };
};
