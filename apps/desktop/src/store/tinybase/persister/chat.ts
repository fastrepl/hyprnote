import { writeTextFile } from "@tauri-apps/plugin-fs";
import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import type { ChatMessageStorage } from "@hypr/store";

import { StoreOrMergeableStore } from "../store/shared";
import {
  ensureDirsExist,
  getChatDir,
  getDataDir,
  iterateTableRows,
  type PersisterMode,
  type TablesContent,
} from "./utils";

type ChatGroupData = {
  id: string;
  user_id: string;
  created_at: string;
  title: string;
};

type ChatMessageWithId = ChatMessageStorage & { id: string };

type ChatJson = {
  chat_group: ChatGroupData;
  messages: ChatMessageWithId[];
};

function collectMessagesByChatGroup(
  tables: TablesContent | undefined,
): Map<string, { chatGroup: ChatGroupData; messages: ChatMessageWithId[] }> {
  const messagesByChatGroup = new Map<
    string,
    { chatGroup: ChatGroupData; messages: ChatMessageWithId[] }
  >();

  const chatGroups = iterateTableRows(tables, "chat_groups");
  const chatMessages = iterateTableRows(tables, "chat_messages");

  const chatGroupMap = new Map<string, ChatGroupData>();
  for (const group of chatGroups) {
    chatGroupMap.set(group.id, group);
  }

  for (const message of chatMessages) {
    const chatGroupId = message.chat_group_id;
    if (!chatGroupId) continue;

    const chatGroup = chatGroupMap.get(chatGroupId);
    if (!chatGroup) continue;

    const existing = messagesByChatGroup.get(chatGroupId);
    if (existing) {
      existing.messages.push(message);
    } else {
      messagesByChatGroup.set(chatGroupId, {
        chatGroup,
        messages: [message],
      });
    }
  }

  return messagesByChatGroup;
}

export function createChatPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  config: { mode: PersisterMode } = { mode: "save-only" },
) {
  const loadFn =
    config.mode === "save-only" ? async () => undefined : async () => undefined;

  const saveFn =
    config.mode === "load-only"
      ? async () => {}
      : async (getContent: () => unknown) => {
          const [tables] = getContent() as [TablesContent | undefined, unknown];
          const dataDir = await getDataDir();

          const messagesByChatGroup = collectMessagesByChatGroup(tables);
          if (messagesByChatGroup.size === 0) {
            return;
          }

          const dirs = new Set<string>();
          const writeOperations: Array<{ path: string; content: string }> = [];

          for (const [
            chatGroupId,
            { chatGroup, messages },
          ] of messagesByChatGroup) {
            const chatDir = getChatDir(dataDir, chatGroupId);
            dirs.add(chatDir);

            const json: ChatJson = {
              chat_group: chatGroup,
              messages: messages.sort(
                (a, b) =>
                  new Date(a.created_at || 0).getTime() -
                  new Date(b.created_at || 0).getTime(),
              ),
            };
            writeOperations.push({
              path: `${chatDir}/_messages.json`,
              content: JSON.stringify(json, null, 2),
            });
          }

          try {
            await ensureDirsExist(dirs);
          } catch (e) {
            console.error("Failed to ensure dirs exist:", e);
            return;
          }

          for (const op of writeOperations) {
            try {
              await writeTextFile(op.path, op.content);
            } catch (e) {
              console.error(`Failed to write ${op.path}:`, e);
            }
          }
        };

  return createCustomPersister(
    store,
    loadFn,
    saveFn,
    (listener) => setInterval(listener, 1000),
    (interval) => clearInterval(interval),
    (error) => console.error("[ChatPersister]:", error),
    StoreOrMergeableStore,
  );
}
