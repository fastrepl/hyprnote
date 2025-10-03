import { type ChangeMessage as IncomingChangeMessage, type Offset, ShapeStream } from "@electric-sql/client";
import { useCallback } from "react";

import * as internal from "./store/internal";
import * as persisted from "./store/persisted";

const ELECTRIC_URL = "http://localhost:3001/v1/shape";

type OutgoingChangeMessage<T extends Record<string, unknown>> = {
  table: string;
  row_id: string;
  operation: "delete";
} | {
  table: string;
  row_id: string;
  data: T;
  operation: "insert" | "update";
};

export const useCloudPersister = () => {
  const save = useCloudSaver();
  const load = useCloudLoader();

  const sync = useCallback(
    () =>
      save()
        .then(() => new Promise((resolve) => setTimeout(resolve, 1000)))
        .then(() => load()),
    [save, load],
  );

  return sync;
};

const useCloudSaver = () => {
  const store = persisted.UI.useStore(persisted.STORE_ID)!;
  const store2 = internal.UI.useStore(internal.STORE_ID)!;

  const user_id = store.getValue("_user_id");
  if (!user_id) {
    throw new Error("'_user_id' is not set");
  }

  const save = useCallback(async () => {
    const changesTable = store2.getTable("_changes")!;
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
          if (changeRow?.deleted) {
            return {
              table: tableName,
              row_id: rowId,
              operation: "delete",
            } satisfies OutgoingChangeMessage<typeof rowData>;
          }

          const operation = changeRow ? "update" : "insert";
          return {
            table: tableName,
            row_id: rowId,
            data: rowData,
            operation,
          } satisfies OutgoingChangeMessage<typeof rowData>;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
    });

    // TODO
    console.log(changes);
  }, [store]);

  return save;
};

const useCloudLoader = () => {
  const store = persisted.UI.useStore(persisted.STORE_ID)!;

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
        return new Promise<IncomingChangeMessage[]>((resolve) => {
          const messages: IncomingChangeMessage[] = [];

          const unsubscribe = stream.subscribe((batch) => {
            messages.push(...batch.filter((msg) => !msg.headers?.control) as IncomingChangeMessage[]);

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
    }, {} as Record<typeof persisted.TABLES_TO_SYNC[number], IncomingChangeMessage[]>);

    for (
      const [table, messages] of Object.entries(results) as [
        typeof persisted.TABLES_TO_SYNC[number],
        IncomingChangeMessage[],
      ][]
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
