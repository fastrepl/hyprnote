import { type Message, type Offset, ShapeStream } from "@electric-sql/client";
import { useCallback } from "react";

import * as persisted from "./store/persisted";

const ELECTRIC_URL = "http://localhost:3001/v1/shape";

export const useCloudPersister = (store: persisted.Store) => {
  const save = useCloudSaver(store);
  const load = useCloudLoader(store);

  const sync = useCallback(
    () =>
      save()
        .then(() => new Promise((resolve) => setTimeout(resolve, 1000)))
        .then(() => load()),
    [save, load],
  );

  return sync;
};

const useCloudSaver = (store: persisted.Store) => {
  const user_id = store.getValue("_user_id");
  if (!user_id) {
    throw new Error("'_user_id' is not set");
  }

  const save = useCallback(async () => {}, []);

  return save;
};

const useCloudLoader = (store: persisted.Store) => {
  const user_id = store.getValue("_user_id");
  if (!user_id) {
    throw new Error("'_user_id' is not set");
  }

  const metaTable = store.getTable("_electric")!;

  const load = useCallback(async () => {
    const steams = persisted.TABLES_TO_SYNC.map((table) => {
      const metaRow = Object.values(metaTable).find((row) => row.table === table);

      const resumable: {
        offset?: Offset;
        handle?: string;
      } = (metaRow?.offset && metaRow?.handle)
        ? {
          offset: metaRow.offset as Offset,
          handle: metaRow.handle as string,
        }
        : {
          offset: "-1",
          handle: undefined,
        };

      return new ShapeStream({
        ...resumable,
        url: ELECTRIC_URL,
        params: {
          table,
          where: "user_id = $1",
          params: [user_id],
        },
        subscribe: false,
        fetchClient: fetch,
        onError: console.error,
      });
    });

    const resultsArray = await Promise.all(
      steams.map((stream) => {
        return new Promise<Message[]>((resolve) => {
          const messages: Message[] = [];

          const unsubscribe = stream.subscribe((batch) => {
            messages.push(...batch);

            if (batch.some((msg) => msg.headers?.control === "up-to-date")) {
              unsubscribe();
              resolve(messages);
            }
          }, (error) => {
            console.error(error);

            unsubscribe();
            resolve(messages);
          });
        });
      }),
    );

    const results = persisted.TABLES_TO_SYNC.reduce((acc, table, index) => {
      acc[table] = resultsArray[index];
      return acc;
    }, {} as Record<string, Message[]>);

    return results;
  }, [metaTable]);

  return load;
};
