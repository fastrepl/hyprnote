import { type Message, type Offset, ShapeStream } from "@electric-sql/client";
import { useCallback } from "react";

import * as local from "./store/local";

const ELECTRIC_URL = "http://localhost:3001/v1/shape";

const TABLES = ["users", "sessions"];

export const useCloudPersister = (store: local.Store) => {
  const user_id = store.getValue("user_id");
  if (!user_id) {
    throw new Error("'user_id' is not set");
  }

  const metaTable = store.getTable("electric_meta")!;

  const save = useCallback(async () => {}, []);

  const load = useCallback(async () => {
    const steams = TABLES.map((table) => {
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

    const results = TABLES.reduce((acc, table, index) => {
      acc[table] = resultsArray[index];
      return acc;
    }, {} as Record<string, Message[]>);

    return results;
  }, [metaTable]);

  return { save, load };
};
