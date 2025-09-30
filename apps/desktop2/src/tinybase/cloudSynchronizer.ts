import { type ChangeMessage, type Message, type Offset, ShapeStream } from "@electric-sql/client";
import { type PersistedStore } from "tinybase/persisters";

import { MergeableStoreOnly } from "./const";

const ELECTRIC_URL = "http://localhost:3001/v1/shape";

export const createCloudSynchronizer = (
  store: PersistedStore<typeof MergeableStoreOnly>,
) => {
  let stream: ShapeStream | null = null;
  let cleanupFn: (() => void) | null = null;
  let isStarted = false;

  // Get stored offset and handle from TinyBase store
  const getStoredOffset = (): Offset | undefined => {
    const offsetValue = store.getValue("_electric_offset");
    if (!offsetValue || typeof offsetValue !== "string") {
      return undefined;
    }
    try {
      return BigInt(offsetValue) as unknown as Offset;
    } catch {
      return undefined;
    }
  };

  const getStoredHandle = (): string | undefined => {
    const handleValue = store.getValue("_electric_handle");
    return typeof handleValue === "string" ? handleValue : undefined;
  };

  const setStoredOffset = (offset: Offset) => {
    store.setValue("_electric_offset", String(offset));
  };

  const setStoredHandle = (handle: string) => {
    store.setValue("_electric_handle", handle);
  };

  const resetSync = () => {
    store.delValue("_electric_offset");
    store.delValue("_electric_handle");
  };

  const startSync = async () => {
    if (isStarted) {
      return;
    }

    const storedOffset = getStoredOffset();
    const storedHandle = getStoredHandle();

    // Create ShapeStream with stored offset and handle if available for resumption
    stream = new ShapeStream({
      url: ELECTRIC_URL,
      params: {
        // TODO
        table: "notes",
      },
      offset: storedOffset,
      handle: storedHandle,
      subscribe: true,
      onError: (error) => {
        console.error("Electric ShapeStream error:", error);

        // On error, reset offset and handle to force full re-sync from scratch
        resetSync();

        // ShapeStream will automatically retry with exponential backoff
      },
    });

    // Subscribe to the ShapeStream to receive messages
    cleanupFn = stream.subscribe(
      (messages: Message[]) => {
        console.log(messages);

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
                store.setRow("load", key, value as Record<string, any>);
                break;

              case "delete":
                // For deletes, remove the row from the store
                store.delRow("load", key);
                break;
            }

            // Store the offset after successfully processing each message
            if (headers.offset !== undefined && headers.offset !== null) {
              setStoredOffset(headers.offset as Offset);
            }
          }
          // ControlMessages (like "up-to-date" or "must-refetch") are handled internally by ShapeStream
        }

        // Store the shape handle for resumption
        const handle = (stream as any)._shapeHandle;
        if (handle && typeof handle === "string") {
          setStoredHandle(handle);
        }
      },
      (error) => {
        console.error("Electric subscription error:", error);
      },
    );

    isStarted = true;
  };

  const stopSync = () => {
    if (cleanupFn) {
      cleanupFn();
      cleanupFn = null;
    }
    if (stream) {
      stream.unsubscribeAll();
      stream = null;
    }
    isStarted = false;
  };

  const destroy = async () => {
    stopSync();
  };

  return {
    startSync,
    stopSync,
    destroy,
  };
};
