import { type Message, type Offset, ShapeStream } from "@electric-sql/client";
import { useCallback } from "react";
import { createQueries } from "tinybase/with-schemas";

import * as local from "./store/local";

const ELECTRIC_URL = "http://localhost:3001/v1/shape";

export const useCloudSync = (store: local.Store) => {
  const tables = ["users", "sessions"];

  const queryName = "find_electric_meta_by_table";
  const queries = local.UI.useCreateQueries(
    store,
    (store) =>
      createQueries(store).setQueryDefinition(
        queryName,
        "electric_meta",
        ({ select, where }) => {
          select("offset");
          select("handle");
          select("table");
          where((getCell) => tables.includes(getCell("table") as string));
        },
      ),
    [],
  );

  const metaTable = local.UI.useResultTable(queryName, queries);

  const sync = useCallback(async () => {
    const steams = tables.map((table) => {
      const metaRow = Object.values(metaTable ?? {}).find((row) => row.table === table);

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
          // where: "user_id=1",
        },
        subscribe: false,
        fetchClient: fetch,
        onError: console.error,
      });
    });

    const results = await Promise.all(
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

    return results;
  }, [metaTable]);

  return { sync };
};
