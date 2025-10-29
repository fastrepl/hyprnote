import { type ChangeMessage as IncomingChangeMessage, type Offset, ShapeStream } from "@electric-sql/client";
import { useCallback } from "react";

import { useAuth } from "../../auth";
import * as internal from "./internal";
import * as main from "./main";

const ELECTRIC_URL = "http://localhost:3001/v1/shape";

type OutgoingChangeMessage<T extends Record<string, unknown>> = {
  table: string;
  row_id: string;
  operation: "delete";
} | {
  table: string;
  row_id: string;
  data: T;
  operation: "update";
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
  const auth = useAuth();
  if (!auth) {
    throw new Error("'auth' is not set");
  }

  const store = main.UI.useStore(main.STORE_ID)!;
  const store2 = internal.UI.useStore(internal.STORE_ID)!;

  const user_id = store2.getValue("user_id");
  if (!user_id) {
    throw new Error("'user_id' is not set");
  }

  const save = useCallback(async () => {
    const changesTable = store2.getTable("changes")!;
    const tables = store.getTables();

    const changes = main.TABLES.flatMap((tableName) => {
      const table = tables[tableName];
      if (!table) {
        return [];
      }

      return Object.entries(table)
        .map(([rowId, rowData]) => {
          const changeRow = changesTable[rowId];

          if (changeRow?.deleted) {
            return {
              table: tableName,
              row_id: rowId,
              operation: "delete",
            } satisfies OutgoingChangeMessage<typeof rowData>;
          } else {
            return {
              table: tableName,
              row_id: rowId,
              data: rowData,
              operation: "update",
            } satisfies OutgoingChangeMessage<typeof rowData>;
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
    });
    console.log(changes);

    return null;
  }, [store]);

  return save;
};

const useCloudLoader = () => {
  const store = main.UI.useStore(main.STORE_ID)!;
  const store2 = internal.UI.useStore(internal.STORE_ID)!;

  const user_id = store2.getValue("user_id");
  if (!user_id) {
    throw new Error("'user_id' is not set");
  }

  const metaTable = store2.getTable("electric")!;

  const load = useCallback(async () => {
    const steams = main.TABLES.map((table) => {
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

    const results = main.TABLES.reduce((acc, table, index) => {
      acc[table] = resultsArray[index];
      return acc;
    }, {} as Record<typeof main.TABLES[number], IncomingChangeMessage[]>);

    for (
      const [table, messages] of Object.entries(results) as [
        typeof main.TABLES[number],
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
