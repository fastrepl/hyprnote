import { type ChangeMessage, type Offset, ShapeStream } from "@electric-sql/client";
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

  const save = useCallback(async () => {
    const changesTable = store.getTable("_changes")!;
    const tables = store.getTables();

    const changesLookup = new Map(
      Object.values(changesTable).map((change) => [
        `${change.table}:${change.row_id}`,
        change,
      ]),
    );

    const changes = persisted.TABLES_TO_SYNC.flatMap((tableName) => {
      const table = tables[tableName];
      if (!table) {
        return [];
      }

      return Object.entries(table)
        .map(([rowId, rowData]) => {
          const changeRow = changesLookup.get(`${tableName}:${rowId}`);
          return changeRow?.dont_send
            ? null
            : { table: tableName, row_id: rowId, data: rowData };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
    });

    // TODO
    console.log(changes);
  }, [store]);

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
        return new Promise<ChangeMessage[]>((resolve) => {
          const messages: ChangeMessage[] = [];

          const unsubscribe = stream.subscribe((batch) => {
            messages.push(...batch.filter((msg) => !msg.headers?.control) as ChangeMessage[]);

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
    }, {} as Record<typeof persisted.TABLES_TO_SYNC[number], ChangeMessage[]>);

    for (
      const [table, messages] of Object.entries(results) as [typeof persisted.TABLES_TO_SYNC[number], ChangeMessage[]][]
    ) {
      for (const message of messages) {
        const rowId = String(message.value.id);

        if (message.headers?.operation === "insert") {
          store.setRow(table, rowId, message.value);
        } else if (message.headers?.operation === "update") {
          store.setRow(table, rowId, message.value);
        } else if (message.headers?.operation === "delete") {
          store.delRow(table, rowId);
        }
      }
    }

    return results;
  }, [metaTable]);

  return load;
};
