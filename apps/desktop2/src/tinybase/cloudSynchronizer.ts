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

  const resetSync = (table: string) => {
    store.delValue(`_electric_offset_${table}`);
    store.delValue(`_electric_handle_${table}`);
  };

  const syncTable = (table: string) => {
    const storedOffset = getStoredOffset(table);
    const storedHandle = getStoredHandle(table);

    // Create ShapeStream with stored offset and handle if available for resumption
    const stream = new ShapeStream({
      url: ELECTRIC_URL,
      params: {
        table,
      },
      offset: storedOffset,
      handle: storedHandle,
      subscribe: true,
      onError: (error) => {
        console.error(`Electric ShapeStream error for table ${table}:`, error);

        // On error, reset offset and handle to force full re-sync from scratch
        resetSync(table);

        // ShapeStream will automatically retry with exponential backoff
      },
    });

    streams.set(table, stream);

    // Subscribe to the ShapeStream to receive messages
    const unsubscribe = stream.subscribe(
      (messages: Message[]) => {
        console.log("Received messages:", messages);
        for (const msg of messages) {
          // Check if it's a ChangeMessage (not a ControlMessage)
          if ("key" in msg && "value" in msg) {
            const changeMsg = msg as ChangeMessage;
            const { headers, value, key } = changeMsg;
            const operation = headers.operation;

            // Apply changes directly to the TinyBase store
            switch (operation) {
              case "insert":
              case "update":
                // For inserts and updates, set the row in the store
                store.setRow(table, key, value as Record<string, any>);
                break;

              case "delete":
                // For deletes, remove the row from the store
                store.delRow(table, key);
                break;
            }

            // Store the offset after successfully processing each message
            if (headers.offset !== undefined && headers.offset !== null) {
              setStoredOffset(table, headers.offset as Offset);
            }
          }
          // ControlMessages (like "up-to-date" or "must-refetch") are handled internally by ShapeStream
        }

        // Store the shape handle for resumption
        const handle = (stream as any)._shapeHandle;
        if (handle && typeof handle === "string") {
          setStoredHandle(table, handle);
        }
      },
      (error) => {
        console.error(`Electric subscription error for table ${table}:`, error);
      },
    );

    cleanupFns.set(table, unsubscribe);
  };

  const sync = async () => {
    // Start syncing all tables
    for (const table of TABLES) {
      syncTable(table);
    }
  };

  const cleanup = () => {
    // Cleanup all streams
    for (const unsubscribe of cleanupFns.values()) {
      unsubscribe();
    }
    cleanupFns.clear();

    for (const stream of streams.values()) {
      stream.unsubscribeAll();
    }
    streams.clear();
  };

  return {
    sync,
    cleanup,
  };
};
