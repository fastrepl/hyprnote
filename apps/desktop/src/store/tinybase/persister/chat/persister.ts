import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import { createSessionDirPersister, getDataDir } from "../utils";
import { collectChatWriteOps } from "./collect";
import { loadAllChatData } from "./load";

export function createChatPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createSessionDirPersister(store, {
    label: "ChatPersister",
    collect: (_store, tables, dataDir) => collectChatWriteOps(tables, dataDir),
    load: async (): Promise<Content<Schemas> | undefined> => {
      try {
        const dataDir = await getDataDir();
        const data = await loadAllChatData(dataDir);
        const hasData =
          Object.keys(data.chat_groups).length > 0 ||
          Object.keys(data.chat_messages).length > 0;
        if (!hasData) {
          return undefined;
        }
        return [
          {
            chat_groups: data.chat_groups,
            chat_messages: data.chat_messages,
          },
          {},
        ] as unknown as Content<Schemas>;
      } catch (error) {
        console.error("[ChatPersister] load error:", error);
        return undefined;
      }
    },
  });
}
